// rules:
// . = activates a paragraph (plays once + starts loops inside [ ])
// [ ... ] = keeps looping forever until deleted
// / (at the START of a paragraph) = live mode (plays letters as you type)
// words with no spaces = chord
// letters with spaces between = sequence
// modifiers: ? random note/chord
// Formatting maps to sound per formatted span (B/I/U, color, font-size)

document.addEventListener("DOMContentLoaded", () => {
  // main edit field
  const page = document.querySelector(".page");

  // letter to note
  // narrowed range (C4–B5) for smoother, less harsh tone
  const letterToNote = {
    a: "C4",
    b: "D4",
    c: "E4",
    d: "F4",
    e: "G4",
    f: "A4",
    g: "B4",
    h: "B4",
    i: "C5",
    j: "D5",
    k: "E5",
    l: "F5",
    m: "G5",
    n: "A5",
    o: "B5",
    p: "C5",
    q: "D4",
    r: "E4",
    s: "F4",
    t: "G4",
    u: "A4",
    v: "B4",
    w: "C5",
    x: "D5",
    y: "E5",
    z: "F5",
  };

  // unlock Tone.js once something is clicked or a key is pressed
  // kept running into an issue where sound sometimes wouldnt play
  const unlock = async () => {
    if (Tone.context.state !== "running") {
      await Tone.start();
    }
  };
  document.body.addEventListener("click", unlock, { once: true });
  document.body.addEventListener("keydown", unlock, { once: true });

  // ===================== TOOLBAR =========================
  // exec command?

  function toggleCmd(cmd) {
    // bold italic underline
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, null);
  }
  function setColor(color) {
    //color
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, color);
  }

  const boldBtn = Array.from(
    document.querySelectorAll(".tool-btn.toggle")
  ).find((b) => b.textContent.trim().toUpperCase() === "B");
  const italicBtn = Array.from(
    document.querySelectorAll(".tool-btn.toggle")
  ).find((b) => b.textContent.trim().toUpperCase() === "I");
  const underlineBtn = Array.from(
    document.querySelectorAll(".tool-btn.toggle")
  ).find((b) => b.textContent.trim().toUpperCase() === "U");
  boldBtn?.addEventListener("click", () => toggleCmd("bold"));
  italicBtn?.addEventListener("click", () => toggleCmd("italic"));
  underlineBtn?.addEventListener("click", () => toggleCmd("underline"));

  document
    .querySelector(".color-btn.black")
    ?.addEventListener("click", () => setColor("black"));
  document
    .querySelector(".color-btn.blue")
    ?.addEventListener("click", () => setColor("blue"));
  document
    .querySelector(".color-btn.red")
    ?.addEventListener("click", () => setColor("red"));

  // font size UI (range of 6–18 size, convert to px by 0.75)
  const fontDisplay = document.querySelector(".font-size-display");
  const minusBtn = Array.from(document.querySelectorAll(".tool-btn")).find(
    (b) => b.textContent.trim() === "-"
  );
  const plusBtn = Array.from(document.querySelectorAll(".tool-btn")).find(
    (b) => b.textContent.trim() === "+"
  );

  const ptFromPx = (px) => Math.round((px || 16) * 0.75);
  const pxFromPt = (pt) => pt / 0.75;

  function currentNodePx() {
    const sel = window.getSelection();
    if (sel && sel.rangeCount) {
      const el =
        sel.anchorNode?.nodeType === 3
          ? sel.anchorNode.parentElement
          : sel.anchorNode;
      if (el && el.nodeType === 1)
        return parseFloat(getComputedStyle(el).fontSize) || 16;
    }
    return parseFloat(getComputedStyle(page).fontSize) || 16;
  }

  function updateFontDisplay() {
    if (fontDisplay)
      fontDisplay.textContent = String(ptFromPx(currentNodePx()));
  }

  function adjustFontSize(deltaPt) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const wrap = document.createElement("span");
    range.surroundContents(wrap);

    let pt = ptFromPx(
      parseFloat(getComputedStyle(wrap).fontSize) || currentNodePx()
    );
    pt = Math.max(6, Math.min(18, pt + deltaPt));
    wrap.style.fontSize = `${pxFromPt(pt)}px`;

    // keep selection
    const r = document.createRange();
    r.selectNodeContents(wrap);
    sel.removeAllRanges();
    sel.addRange(r);

    updateFontDisplay();
    fontButtons();
  }

  // function that hides the font buttons if its 6 or 18
  function fontButtons() {
    const pt = parseFloat(fontDisplay?.textContent || "12");
    if (minusBtn) minusBtn.style.visibility = pt <= 6 ? "hidden" : "visible";
    if (plusBtn) plusBtn.style.visibility = pt >= 18 ? "hidden" : "visible";
  }

  minusBtn?.addEventListener("click", () => adjustFontSize(-1));
  plusBtn?.addEventListener("click", () => adjustFontSize(+1));
  updateFontDisplay();
  fontButtons();

  // ---------- RESET BUTTON --------------
  function fullReset() {
    stopAllLoops();
    page.innerHTML = "";
    const d = document.createElement("div");
    d.appendChild(document.createElement("br"));
    page.appendChild(d);
    updateFontDisplay();
    page.focus();
  }
  document
    .querySelector(".tool-btn.reset")
    ?.addEventListener("click", fullReset);

  // ========================= STYLING =========================

  function colorBucket(colorStr) {
    if (!colorStr) return "black";
    const s = colorStr.toLowerCase().trim();

    // named colours first
    if (s === "blue" || s.includes("blue")) return "blue";
    if (s === "red" || s.includes("red")) return "red";
    if (s === "black" || s.includes("black")) return "black";

    // parse rgb() values safely
    const rgb = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
      const r = +rgb[1],
        g = +rgb[2],
        b = +rgb[3];
      // decide by dominant channel, but only if it’s clearly dominant
      if (b > r + 20 && b > g + 20) return "blue";
      if (r > g + 20 && r > b + 20) return "red";
      return "black";
    }

    // hex colours
    if (s.startsWith("#") && s.length === 7) {
      const r = parseInt(s.slice(1, 3), 16),
        g = parseInt(s.slice(3, 5), 16),
        b = parseInt(s.slice(5, 7), 16);
      if (b > r + 20 && b > g + 20) return "blue";
      if (r > g + 20 && r > b + 20) return "red";
      return "black";
    }

    return "black";
  }

  // reads if the bold italic undelrine color and font size and returns it into attributes
  function attrsFrom(el) {
    const cs = getComputedStyle(el);
    const fw = cs.fontWeight;
    const bold =
      (typeof fw === "string" && fw.toLowerCase() === "bold") ||
      parseInt(fw, 10) >= 600;
    const italic = cs.fontStyle === "italic";
    const underline = (
      cs.textDecorationLine ||
      cs.textDecoration ||
      ""
    ).includes("underline");
    const bucket = colorBucket(cs.color);
    const pt = ptFromPx(parseFloat(cs.fontSize) || 16);
    return { bold, italic, underline, bucket, pt };
  }

  // ========================= AUDIO =======================

  // loudness table
  const LOUDNESS = {
    6: 0.03,
    7: 0.06,
    8: 0.1,
    9: 0.18,
    10: 0.3,
    11: 0.5,
    12: 0.8,
    13: 1.2,
    14: 2.0,
    15: 3.3,
    16: 5.0,
    17: 7.0,
    18: 10.0,
  };

  // ====================== SIMPLE OCTAVE-LIMITED SCALE =========================
  function getScaleNotes(rootNote, isMajor) {
    // extract the note letter (e.g. "E") and octave number (e.g. 4)
    const match = rootNote.match(/^([A-G])(\d)$/);
    if (!match) return [];
    const [, rootLetter, octaveStr] = match;
    const octave = parseInt(octaveStr);

    // base chromatic scale in semitone order
    const chromatic = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    const rootIndex = chromatic.indexOf(rootLetter);
    if (rootIndex === -1) return [];

    // define intervals (major/minor)
    const intervals = isMajor
      ? [0, 2, 4, 5, 7, 9, 11] // major
      : [0, 2, 3, 5, 7, 8, 10]; // minor

    // build scale notes and keep them within the same octave
    const scale = intervals.map((i) => {
      const noteName = chromatic[(rootIndex + i) % 12];
      return noteName + octave;
    });

    return scale;
  }

  // how everything plays based on the attributes from before
  function playChordWithAttrs(notes, durSec, when, attrs) {
    if (!notes || !notes.length) return;

    console.log("Detected color bucket:", attrs.bucket);

    const pt = Math.max(6, Math.min(18, Math.round(attrs.pt || 12)));
    let vel = LOUDNESS[pt] ?? 0.7;

    // normalize loudness so sine (black) isn't too quiet
    if (attrs.bucket === "black") vel *= 100; // boost sine
    if (attrs.bucket === "blue") vel *= 1.1; // slight bump for square
    if (attrs.bucket === "red") vel *= 0.9; // tame sawtooth a bit

    // color determines oscillator
    let osc;
    let postFilter = null;
    let gainLevel = 1.0; // loudness compensation

    switch (attrs.bucket) {
      case "black":
        osc = { type: "sine" };
        postFilter = new Tone.Filter({
          type: "lowpass",
          frequency: 1200,
          Q: 0.8,
        });
        gainLevel = 2.2;
        break;

      case "blue":
        osc = { type: "square" };
        postFilter = new Tone.Filter({
          type: "highpass",
          frequency: 1500,
          Q: 0.5,
        });
        gainLevel = 1.3;
        break;

      case "red":
        // bright, edgy sawtooth with less gain
        osc = { type: "sawtooth" };
        postFilter = new Tone.Filter({
          type: "highpass",
          frequency: 1200,
          Q: 0.6,
        });
        gainLevel = 0.9;
        break;

      default:
        osc = { type: "sine" };
    }

    // build an effects chain based on attributes (so everything stacks)
    const disposables = [];
    const chain = [];

    if (attrs.bold) {
      const dist = new Tone.Distortion(0.95);
      chain.push(dist);
      disposables.push(dist);
    }
    if (attrs.underline) {
      const rev = new Tone.Reverb({ decay: 5.0, wet: 0.75 });
      chain.push(rev);
      disposables.push(rev);
    }

    // final output stage
    const sink = new Tone.Gain(gainLevel).toDestination();
    disposables.push(sink);

    // insert timbre filter (if any) before output
    if (postFilter) chain.push(postFilter);

    // connect everything in order
    for (let i = 0; i < chain.length; i++) {
      const a = chain[i],
        b = chain[i + 1] || sink;
      a.connect(b);
    }

    const inputNode = chain.length ? chain[0] : sink;

    // creates one synth per note
    const synths = notes.map(() => {
      // build a new synth fresh every time
      const s = new Tone.Synth();

      // ✅ force-set the oscillator type manually each time
      s.oscillator.type = osc.type;

      // apply envelope settings manually
      s.envelope.attack = 0.01;
      s.envelope.decay = 0.12;
      s.envelope.sustain = 0.65;
      s.envelope.release = 0.25;

      // disconnect default routing (Tone auto-connects to master)
      s.disconnect();
      // connect into your custom effects chain
      s.connect(inputNode);

      // italic text = vibrato
      if (attrs.italic) {
        const lfo = new Tone.LFO({ frequency: 6, min: -75, max: 75 }).start();
        lfo.connect(s.detune);
        disposables.push(lfo);
      }

      disposables.push(s);
      return s;
    });

    // trigger everything
    const t = when ?? Tone.now();
    synths.forEach((s, i) => s.triggerAttackRelease(notes[i], durSec, t, vel));

    // cleanup after sound finishes with timeout
    const ms = Math.max(0, (t - Tone.now()) * 1000) + durSec * 1000 + 600;
    setTimeout(() => {
      synths.forEach((s) => s.dispose());
      disposables.forEach((n) => n.dispose?.());
    }, ms);
  }

  function playChar(ch, when, attrs) {
    let note;
    // picks a note ad then calls chord function
    if (ch === "?") {
      const pool = Object.values(letterToNote);
      note = pool[Math.floor(Math.random() * pool.length)];
    } else {
      note = letterToNote[ch.toLowerCase()];
    }
    if (!note) return;
    playChordWithAttrs([note], 1.0, when, attrs);
  }

  // ====================== WORD CHORD =========================
  function playWordAsChord(lettersWithAttrs, when) {
    if (!lettersWithAttrs.length) return when || Tone.now();
    const t = when ?? Tone.now();
    const dur = 1.0;

    // first letter defines key + mode
    const first = lettersWithAttrs[0];
    const firstNote = letterToNote[first.ch.toLowerCase()];
    if (!firstNote) return t + dur;

    const isMajor = lettersWithAttrs.length % 2 === 0; // even = major, odd = minor
    const scaleNotes = getScaleNotes(firstNote, isMajor);

    // build list of notes (first letter = root, others random from scale)
    const chordNotes = lettersWithAttrs.map((item, i) => {
      if (i === 0) return firstNote; // keep root
      const randomIndex = Math.floor(Math.random() * scaleNotes.length);
      return scaleNotes[randomIndex];
    });

    // play each letter’s note using its formatting attributes
    lettersWithAttrs.forEach(({ ch, attrs }, i) => {
      const note = chordNotes[i];
      playChordWithAttrs([note], dur, t, attrs);
    });

    return t + dur;
  }

  // ====================== PER CHATACTER FORMATTING =========================

  function collectSegmentsWithAttrs(root) {
    const out = []; // holds all the attributes eventually
    const base = attrsFrom(page); //default styling in case not styled

    function walk(n, inherited) {
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n.nodeValue || "";
        for (let i = 0; i < text.length; i++)
          out.push({ ch: text[i], attrs: inherited });
        return;
      }
      if (n.nodeType === Node.ELEMENT_NODE) {
        const a = attrsFrom(n);
        const merged = {
          bold: a.bold || inherited.bold,
          italic: a.italic || inherited.italic,
          underline: a.underline || inherited.underline,
          bucket: a.bucket || inherited.bucket,
          pt: a.pt || inherited.pt,
        };
        n.childNodes.forEach((child) => walk(child, merged));
      }
    }

    walk(root, base);
    return out;
  }

  // find [ ... ] regions by indexes
  function extractLoopRegions(charStream) {
    const regions = [];
    const stack = [];
    for (let i = 0; i < charStream.length; i++) {
      const c = charStream[i].ch;
      if (c === "[") stack.push(i);
      else if (c === "]" && stack.length) {
        const start = stack.pop();
        regions.push([start + 1, i]); // inside the brackets
      }
    }
    return regions.map(([a, b]) => charStream.slice(a, b));
  }

  // makes word splay one after the other (punctuation and spaces split the words/charcaters)
  const isWordChar = (c) => /[a-z?]/i.test(c);
  const isWhitespace = (c) =>
    c === " " || c === "\t" || c === "\n" || c === "\r";
  const isBoundary = (c) => /[.!?,;:(){}\-\u2013\u2014]/.test(c);

  function playRegionAsWordChords(region, startTime) {
    let t = startTime ?? Tone.now();
    let word = [];
    for (let i = 0; i < region.length; i++) {
      const item = region[i];
      const c = item.ch === "\u00A0" ? " " : item.ch;
      if (isWordChar(c)) {
        word.push({ ch: c, attrs: item.attrs });
      } else if (isWhitespace(c) || isBoundary(c) || c === "[" || c === "]") {
        if (word.length) t = playWordAsChord(word, t);
        word = [];
      }
    }
    if (word.length) t = playWordAsChord(word, t);
    return t;
  }

  function playParagraphOnce(node) {
    const stream = collectSegmentsWithAttrs(node);
    playRegionAsWordChords(stream);
  }

  // ====================== PARAGRAPHS AND LOOPS =============
  // something copilot etnered because my sound kept stopping when i started a new line
  const activeLoops = new Map();

  function ensureAtLeastOneBlock() {
    if (!page.firstChild) {
      const d = document.createElement("div");
      d.appendChild(document.createElement("br"));
      page.appendChild(d);
    }
  }

  function paragraphBlocks() {
    ensureAtLeastOneBlock();
    const out = [];
    page.childNodes.forEach((n) => {
      if (n.nodeType === 1) {
        const disp = getComputedStyle(n).display;
        if (/(^| )(block|list-item|table|grid|flex)( |$)/.test(disp))
          out.push(n);
      }
    });
    if (out.length === 0) {
      const wrap = document.createElement("div");
      while (page.firstChild) wrap.appendChild(page.firstChild);
      page.appendChild(wrap);
      out.push(wrap);
    }
    return out;
  }

  const nodeText = (n) => (n.textContent || "").replace(/\u00A0/g, " ");
  const isLive = (t) => t.trimStart().startsWith("/");

  function stopAllLoops() {
    for (const [, arr] of activeLoops.entries())
      arr.forEach((l) => clearInterval(l.interval));
    activeLoops.clear();
  }

  function stopLoopsFor(node) {
    const arr = activeLoops.get(node);
    if (!arr) return;
    arr.forEach((l) => clearInterval(l.interval));
    activeLoops.delete(node);
  }

  function updateParagraphs() {
    const paras = paragraphBlocks();
    const set = new Set(paras);

    for (const [node, arr] of activeLoops.entries()) {
      if (!set.has(node)) {
        arr.forEach((l) => clearInterval(l.interval));
        activeLoops.delete(node);
      }
    }

    paras.forEach((node) => {
      const text = nodeText(node).trim();
      const live = isLive(text);
      const endedWithDot = text.endsWith(".");

      if (!live && !endedWithDot) {
        stopLoopsFor(node);
        return;
      }

      if (!activeLoops.has(node)) {
        activeLoops.set(node, []);
        if (!live && endedWithDot) playParagraphOnce(node);
      }

      const stream = collectSegmentsWithAttrs(node);
      const regions = extractLoopRegions(stream);

      let list = activeLoops.get(node) || [];
      list = list.filter((obj) => {
        if (obj.key >= regions.length) {
          clearInterval(obj.interval);
          return false;
        }
        return true;
      });

      regions.forEach((region, idx) => {
        if (list.some((l) => l.key === idx)) return;
        const interval = setInterval(() => {
          const s = collectSegmentsWithAttrs(node);
          const rs = extractLoopRegions(s);
          const r = rs[idx];
          if (!r || !r.length) return;
          playRegionAsWordChords(r);
        }, 2000);
        list.push({ key: idx, interval });
      });

      activeLoops.set(node, list);
    });
  }

  page.addEventListener("keyup", () => {
    updateParagraphs();
    updateFontDisplay();
  });

  // live typing: if iam inside a "/" paragraph and press a letter or "?"
  page.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!node) return;

    let el = node.nodeType === 3 ? node.parentElement : node;
    while (
      el &&
      el !== page &&
      !getComputedStyle(el).display.match(/block|flex|grid|table/)
    ) {
      el = el.parentElement;
    }
    const txt = (el?.textContent || "").trim();
    if (!isLive(txt)) return;

    if (/[a-z?]/i.test(e.key)) {
      const caretEl =
        sel.anchorNode.nodeType === 3
          ? sel.anchorNode.parentElement
          : sel.anchorNode;
      const attrs = attrsFrom(caretEl || page);
      playChar(e.key, Tone.now(), attrs);
    }
  });

  // help panel toggle
  const helpBtn = document.querySelector(".help-btn");
  const helpPanel = document.querySelector(".help-panel");
  helpBtn?.addEventListener("click", () =>
    helpPanel.classList.toggle("active")
  );
});

// ==================== GUIDED ONBOARDING TUTORIAL =====================
const overlay = document.getElementById("tutorial-overlay");
const popup = document.getElementById("tutorial-popup");
const popupText = document.getElementById("tutorial-text");
const nextBtn = document.getElementById("tutorial-next");
const skipBtn = document.getElementById("tutorial-skip");
const finishBtn = document.getElementById("tutorial-finish");

// create highlight box
const highlightBox = document.createElement("div");
highlightBox.className = "tutorial-highlight";
document.body.appendChild(highlightBox);

// define tutorial steps
const tutorialSteps = [
  {
    text: "Welcome to Word Doc Synth! Let’s go through a quick tutorial.",
    target: ".title-group",
    position: "bottom",
  },
  {
    text: "Type in the white page area — letters only (a–z).",
    target: ".page",
    position: "right",
  },
  {
    text: "Add a period (.) at the end of a sentence to play your paragraph.",
    target: ".page",
    position: "right",
  },
  {
    text: "Use [ ... ] to loop sections. Loops keep playing until deleted. Make sure to add a .",
    target: ".page",
    position: "right",
  },
  {
    text: "Start a paragraph with / to play letters live as you type. Don't know what to play? Try ?",
    target: ".page",
    position: "right",
  },
  {
    text: "That’s it! Try and explore formatting the text. Good luck!",
    target: ".toolbar",
    position: "center",
  },
];

let current = 0;

// --- ensure overlay covers full document height ---
function resizeOverlayHeight() {
  const docHeight = Math.max(
    document.body.scrollHeight,
    document.documentElement.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.offsetHeight,
    document.body.clientHeight,
    document.documentElement.clientHeight
  );
  overlay.style.height = docHeight + "px";
}

function showStep() {
  const step = tutorialSteps[current];
  const el = document.querySelector(step.target);
  if (!el) return;

  resizeOverlayHeight();

  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  // === special case: first step (Welcome screen) ===
  if (current === 0) {
    highlightBox.style.display = "none"; // hide glow
    overlay.style.background = "rgba(0, 0, 0, 0.7)"; // fully dim everything
    overlay.style.clipPath = "none"; // no transparent cutout

    // center popup on screen
    popupText.textContent = step.text;
    popup.classList.remove("hidden");
    overlay.classList.remove("hidden");

    const popupTop = window.innerHeight / 2 - popup.offsetHeight / 2 + scrollY;
    const popupLeft = window.innerWidth / 2 - popup.offsetWidth / 2 + scrollX;
    popup.style.top = `${popupTop}px`;
    popup.style.left = `${popupLeft}px`;
    return; // stop here for step 1
  }

  // === Glow highlight box ===
  highlightBox.style.display = "block";
  const radius = 8;
  highlightBox.style.top = `${rect.top + scrollY - 6}px`;
  highlightBox.style.left = `${rect.left + scrollX - 6}px`;
  highlightBox.style.width = `${rect.width + 12}px`;
  highlightBox.style.height = `${rect.height + 12}px`;

  // === Transparent spotlight cut-out (keeps target bright) ===
  const top = rect.top + scrollY - radius;
  const left = rect.left + scrollX - radius;
  const right = rect.right + scrollX + radius;
  const bottom = rect.bottom + scrollY + radius;
  const w = document.documentElement.scrollWidth;
  const h = Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight
  );

  overlay.style.background = "rgba(0, 0, 0, 0.6)";
  overlay.style.clipPath = `polygon(
    0 0, ${w}px 0, ${w}px ${h}px, 0 ${h}px,
    0 ${top}px, ${left}px ${top}px, ${left}px ${bottom}px,
    ${right}px ${bottom}px, ${right}px ${top}px, 0 ${top}px
  )`;

  // === Position popup near target ===
  popupText.textContent = step.text;
  popup.classList.remove("hidden");
  overlay.classList.remove("hidden");

  let popupTop = rect.bottom + scrollY + 12;
  let popupLeft = rect.left + scrollX;
  if (step.position === "right") {
    popupTop = rect.top + scrollY;
    popupLeft = rect.right + scrollX + 15;
  } else if (step.position === "left") {
    popupTop = rect.top + scrollY;
    popupLeft = rect.left + scrollX - popup.offsetWidth - 15;
  } else if (step.position === "center") {
    popupTop = window.innerHeight / 2 - popup.offsetHeight / 2 + scrollY;
    popupLeft = window.innerWidth / 2 - popup.offsetWidth / 2 + scrollX;
  }

  popup.style.top = `${popupTop}px`;
  popup.style.left = `${popupLeft}px`;
}

// --- button controls ---
nextBtn.addEventListener("click", () => {
  current++;
  if (current >= tutorialSteps.length - 1) {
    // when reaching the last step
    nextBtn.classList.add("hidden");
    skipBtn.classList.add("hidden");
    finishBtn.classList.remove("hidden");
  }
  if (current < tutorialSteps.length) {
    showStep();
  }
});

finishBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  popup.classList.add("hidden");
  highlightBox.style.display = "none";
});

skipBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  popup.classList.add("hidden");
  highlightBox.style.display = "none";
});

// start tutorial on load
window.addEventListener("load", () => {
  current = 0;
  highlightBox.style.display = "block";
  showStep();
});
