// rules:
// ; = activates a paragraph (plays once + starts loops inside [ ])
// [ ... ] = keeps looping forever until deleted
// ( ... ) = paragraph is live mode (plays letters as you type)
// words with no spaces = chord
// letters with spaces between = sequence
// modifiers: ! louder, ? random note/chord, - extend sustain, . shorten sustain, / = 2 second rest, "..." muted

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".page");
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();

  // mapping letters to notes, do i want sharps or just keep everything within the C major scale...?
  const letterToNote = {
    a: "C4",
    b: "D4",
    c: "E4",
    d: "F4",
    e: "G4",
    f: "A4",
    g: "B4",
    h: "C5",
    i: "D5",
    j: "E5",
    k: "F5",
    l: "G5",
    m: "A5",
    n: "B5",
    o: "C6",
    p: "D6",
    q: "E6",
    r: "F6",
    s: "G6",
    t: "A6",
    u: "B6",
    v: "C7",
    w: "D7",
    x: "E7",
    y: "F7",
    z: "G7",
  };

  // keep track of loops for each paragraph
  let activeLoops = {};

  // unlock tone.js once user interacts because sometimes auto loading messes up
  document.body.addEventListener(
    "click",
    async () => {
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("audio ready");
      }
    },
    { once: true }
  );

  document.body.addEventListener(
    "keydown",
    async () => {
      if (Tone.context.state !== "running") {
        await Tone.start();
        console.log("audio ready");
      }
    },
    { once: true }
  );

  // figure out sustain time depending on "-" and "."
  function getSustain(text) {
    let length = 1; // default 1 second
    if (text.includes("-")) {
      const count = (text.match(/-/g) || []).length;
      length += count;
    }
    if (text.includes(".")) {
      const count = (text.match(/\./g) || []).length;
      length -= count * 0.5;
    }
    if (length < 0.1) length = 0.1;
    return length;
  }

  // play a single letter
  function playLetter(char, raw = "", time = Tone.now()) {
    let note;
    if (char === "?") {
      const pool = Object.values(letterToNote);
      note = pool[Math.floor(Math.random() * pool.length)];
    } else {
      note = letterToNote[char.toLowerCase()];
    }
    if (!note) return;

    const dur = getSustain(raw);
    const velocity = raw.includes("!") ? 1.0 : 0.7;

    synth.triggerAttackRelease(note, dur, time, velocity);
  }

  // play a word (handles chords, sequences, modifiers, rests)
  function playWord(word, currentTime) {
    if (/^".*"$/.test(word)) return currentTime; // muted

    // if its literally a "/", make it a 2 second rest
    if (word === "/") {
      return currentTime + 2.0;
    }

    let dur = getSustain(word);
    let velocity = word.includes("!") ? 1.0 : 0.7;

    // random chord if "?" appears
    if (word.includes("?")) {
      let count = (word.match(/\?/g) || []).length;
      const pool = Object.values(letterToNote);
      let chord = [];
      for (let i = 0; i < count; i++) {
        chord.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      synth.triggerAttackRelease(chord, dur, currentTime, velocity);
      return currentTime + dur; // advance by sustain
    }

    // single letter = sequence element
    if (word.length === 1) {
      playLetter(word, word, currentTime);
      return currentTime + dur;
    }

    // chord from multiple letters
    const chord = word
      .replace(/[^a-z]/gi, "")
      .split("")
      .map((l) => letterToNote[l.toLowerCase()])
      .filter(Boolean);

    if (chord.length > 0) {
      synth.triggerAttackRelease(chord, dur, currentTime, velocity);
      return currentTime + dur;
    }

    return currentTime;
  }

  // play a paragraph once (when ended with ;)
  function playParagraph(text) {
    // split into parts: words, spaces, and also keep "/" as its own
    const parts = text
      .trim()
      .split(/(\s+|\/)/)
      .filter((p) => p.trim() !== "");
    let t = Tone.now();
    parts.forEach((p) => {
      t = playWord(p, t);
    });
  }

  // check each paragraph and run loops if needed
  function updateParagraphs() {
    const paragraphs = page.innerText.split("\n");

    paragraphs.forEach((para, idx) => {
      const trimmed = para.trim();

      // skip live paragraphs
      if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
        return;
      }

      // only paragraphs that end with ";" are active
      if (!trimmed.endsWith(";")) {
        if (activeLoops[idx]) {
          activeLoops[idx].forEach((loopObj) =>
            clearInterval(loopObj.interval)
          );
          delete activeLoops[idx];
        }
        return;
      }

      // if it's new, play it once
      if (!activeLoops[idx]) {
        activeLoops[idx] = [];
        playParagraph(trimmed);
      }

      // handle loop blocks inside [ ... ]
      const matches = [...trimmed.matchAll(/\[(.*?)\]/g)];
      const loopBlocks = matches.map((m) => m[0]);

      // clean up loops that don't exist anymore
      activeLoops[idx] = activeLoops[idx].filter((loopObj) => {
        if (!loopBlocks.includes(loopObj.text)) {
          clearInterval(loopObj.interval);
          return false;
        }
        return true;
      });

      // start new loops
      loopBlocks.forEach((full) => {
        if (activeLoops[idx].some((l) => l.text === full)) return;

        let inside = full.slice(1, -1);
        if (/".*"/.test(inside)) return; // muted

        const interval = setInterval(() => {
          const parts = inside
            .trim()
            .split(/(\s+|\/)/)
            .filter((p) => p.trim() !== "");
          let t = Tone.now();
          parts.forEach((p) => {
            t = playWord(p, t);
          });
        }, 2000); // every 2 seconds

        activeLoops[idx].push({ text: full, interval });
      });
    });
  }

  // check for changes when typing
  page.addEventListener("keyup", () => {
    updateParagraphs();
  });

  // live typing mode for () paragraphs
  page.addEventListener("keydown", (e) => {
    const paragraphs = page.innerText.split("\n");
    const sel = window.getSelection();
    const node = sel.anchorNode;
    if (!node) return;

    const current = node.textContent.trim();
    if (current.startsWith("(") && current.endsWith(")")) {
      if (/[a-z?]/i.test(e.key)) {
        playLetter(e.key, e.key);
      }
      if (e.key === "/") {
        // in live mode, / should cut off all sounds instantly
        synth.releaseAll();
      }
    }
  });

  const helpBtn = document.querySelector(".help-btn");
  const helpPanel = document.querySelector(".help-panel");

  helpBtn.addEventListener("click", () => {
    helpPanel.classList.toggle("active");
  });
});
