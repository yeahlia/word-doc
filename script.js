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

  // letter to note - range limited for a less harsh tone
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

  // unlock Tone.js once something is clicked or a key is pressed - kept running into an issue where sound sometimes wouldnt play
  const unlock = async () => {
    if (Tone.context.state !== "running") {
      await Tone.start();
    }
  };

  // starts tone,js when something is clicked or typed
  document.body.addEventListener("click", unlock, { once: true });
  document.body.addEventListener("keydown", unlock, { once: true });

  // ===================== TOOLBAR =========================
  // exec command API MEOW

  // applies command bold
  function toggleCmd(cmd) {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, null);
  }
  //color
  function setColor(color) {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, color);
  }

  // loops through all the tool bar buttons and finds the one labeled B, I and then U
  const boldBtn = Array.from(
    document.querySelectorAll(".tool-btn.toggle")
  ).find((b) => b.textContent.trim().toUpperCase() === "B");
  const italicBtn = Array.from(
    document.querySelectorAll(".tool-btn.toggle")
  ).find((b) => b.textContent.trim().toUpperCase() === "I");
  const underlineBtn = Array.from(
    document.querySelectorAll(".tool-btn.toggle")
  ).find((b) => b.textContent.trim().toUpperCase() === "U");

  //when clicked, the buttons call toggleCmd to apply formatting
  boldBtn?.addEventListener("click", () => toggleCmd("bold"));
  italicBtn?.addEventListener("click", () => toggleCmd("italic"));
  underlineBtn?.addEventListener("click", () => toggleCmd("underline"));

  // attaches click listnered and applies the color to the text
  document
    .querySelector(".color-btn.black")
    ?.addEventListener("click", () => setColor("black"));
  document
    .querySelector(".color-btn.blue")
    ?.addEventListener("click", () => setColor("blue"));
  document
    .querySelector(".color-btn.red")
    ?.addEventListener("click", () => setColor("red"));

  // gets the number indicator
  const fontDisplay = document.querySelector(".font-size-display");

  // finds the plus and minus buttons on the toolb ar
  const minusBtn = Array.from(document.querySelectorAll(".tool-btn")).find(
    (b) => b.textContent.trim() === "-"
  );
  const plusBtn = Array.from(document.querySelectorAll(".tool-btn")).find(
    (b) => b.textContent.trim() === "+"
  );

  // helps convert between pixels and points
  const ptFromPx = (px) => Math.round((px || 16) * 0.75);
  const pxFromPt = (pt) => pt / 0.75;

  // reads font size and pixels, if nothing sleected it goes to default
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

  // increases or decreases the size, with a limit beteween 6-18 and updates UI display
  function updateFontDisplay() {
    if (fontDisplay)
      fontDisplay.textContent = String(ptFromPx(currentNodePx()));
  }

  // update sthe number in toolbar
  function adjustFontSize(deltaPt) {
    const sel = window.getSelection(); // gets the current selection
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    // wraps selected text inside new span
    const wrap = document.createElement("span");
    range.surroundContents(wrap);

    // current size in pts
    let pt = ptFromPx(
      parseFloat(getComputedStyle(wrap).fontSize) || currentNodePx()
    );

    // add or subtract pts
    pt = Math.max(6, Math.min(18, pt + deltaPt));

    // apply CSS stlye
    wrap.style.fontSize = `${pxFromPt(pt)}px`;

    // keep selection
    const r = document.createRange();
    r.selectNodeContents(wrap);
    sel.removeAllRanges();
    sel.addRange(r);

    updateFontDisplay();
    fontButtons();
  }

  // if size is min or max, hides the corresponding button
  function fontButtons() {
    const pt = parseFloat(fontDisplay?.textContent || "12");
    if (minusBtn) minusBtn.style.visibility = pt <= 6 ? "hidden" : "visible";
    if (plusBtn) plusBtn.style.visibility = pt >= 18 ? "hidden" : "visible";
  }

  // connects buttons to the adjustment
  minusBtn?.addEventListener("click", () => adjustFontSize(-1));
  plusBtn?.addEventListener("click", () => adjustFontSize(+1));
  updateFontDisplay();
  fontButtons();

  // =========================RESET BUTTON ===========================

  //clears the document content and stops all loops
  function fullReset() {
    stopAllLoops();
    page.innerHTML = "";
    const d = document.createElement("div");
    d.appendChild(document.createElement("br"));
    page.appendChild(d);
    updateFontDisplay();
    page.focus();
  }

  // connects the button to the function
  document
    .querySelector(".tool-btn.reset")
    ?.addEventListener("click", fullReset);

  // ========================= STYLING =========================
  // MEOW
  // cleans any color string that comes from CSS so it doesnt break
  function colorBucket(colorStr) {
    if (!colorStr) return "black";
    const s = colorStr.toLowerCase().trim();

    // named colours first
    if (s === "blue" || s.includes("blue")) return "blue";
    if (s === "red" || s.includes("red")) return "red";
    if (s === "black" || s.includes("black")) return "black";

    // uses rgb colors
    const rgb = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgb) {
      const r = +rgb[1],
        g = +rgb[2],
        b = +rgb[3];
      // decide by dominant channel, but only if it’s clearly dominant
      // added this because I had a lot of issues with the blue and black getting considered the same
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

  function attrsFrom(el) {
    // gets the computed css for any of the nodes
    const cs = getComputedStyle(el);
    const fw = cs.fontWeight;

    // detects if font is bold by name or weight
    const bold =
      (typeof fw === "string" && fw.toLowerCase() === "bold") ||
      parseInt(fw, 10) >= 600;

    // becomes true if the text is italic
    const italic = cs.fontStyle === "italic";

    // checks for underling text with differnet fallbacks considering browsers
    const underline = (
      cs.textDecorationLine ||
      cs.textDecoration ||
      ""
    ).includes("underline");

    // converts color and font size so tone.js can use
    const bucket = colorBucket(cs.color);
    const pt = ptFromPx(parseFloat(cs.fontSize) || 16);
    return { bold, italic, underline, bucket, pt };
  }

  // ========================= AUDIO =======================

  // loudness for font
  const LOUDNESS = {
    6: 0.0001,
    7: 0.0004,
    8: 0.001,
    9: 0.005,
    10: 0.02,
    11: 0.08,
    12: 0.3,
    13: 0.9,
    14: 2.0,
    15: 4.5,
    16: 8.0,
    17: 15.0,
    18: 25.0,
  };

  function getScaleNotes(rootNote, isMajor) {
    // extract the note letter and octave number
    const match = rootNote.match(/^([A-G])(\d)$/);
    if (!match) return [];
    const [, rootLetter, octaveStr] = match;
    const octave = parseInt(octaveStr);

    // defines the chromatic scale and finds where the root note is
    // this was basically copied and pasted from my last semester's assignment! I'll link it in the reflection because I am super proud of that one as well
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

    // defines intervals (major/minor)
    const intervals = isMajor ? [0, 4, 7] : [0, 3, 7];

    // build scale notes and keep them within the same octave so its less harsh
    const scale = intervals.map((i) => {
      const noteName = chromatic[(rootIndex + i) % 12];
      return noteName + octave;
    });

    return scale;
  }

  // main playback function! takes the array of notes and attributes and palys it, and skips if empty
  function playChordWithAttrs(notes, durSec, when, attrs) {
    if (!notes || !notes.length) return;

    // console.log("color:", attrs.bucket);

    // clamps font size MEOW
    const pt = Math.max(6, Math.min(18, Math.round(attrs.pt || 12)));
    let vel = LOUDNESS[pt] ?? 0.7;

    // had an issue where red was super loud compared to the rest, so I added this manually to make them aroound the same volume
    if (attrs.bucket === "black") vel *= 100; // boost sine
    if (attrs.bucket === "blue") vel *= 1.1; // slight boost for square
    if (attrs.bucket === "red") vel *= 0.9; // lower sawtooth a bit

    // sets up the placeholder variables for the oscillators
    let osc;
    let postFilter = null;
    let gainLevel = 1.0; // loudness compensation

    // based on the color, change the wave
    switch (attrs.bucket) {
      // black color
      case "black":
        osc = { type: "sine" }; // sine wave
        postFilter = new Tone.Filter({
          type: "lowpass", // adds low pass filter
          frequency: 1200,
          Q: 0.8,
        });
        gainLevel = 2.2;
        break;

      // blue clor
      case "blue":
        osc = { type: "square" }; // square wave
        postFilter = new Tone.Filter({
          type: "highpass", // highpass filter
          frequency: 1500,
          Q: 0.5,
        });
        gainLevel = 1.3;
        break;

      // red color
      case "red":
        osc = { type: "sawtooth" }; // sawtooth wave
        postFilter = new Tone.Filter({
          type: "highpass", // highpass
          frequency: 1200,
          Q: 0.6,
        });
        gainLevel = 0.9;
        break;

      default:
        osc = { type: "sine" };
    }

    // arrays to hold the chain of audio effects, and stuff to get cleaned up alter
    const disposables = [];
    const chain = [];

    // if the text is bold, adds distortion
    if (attrs.bold) {
      const dist = new Tone.Distortion(0.95);
      chain.push(dist);
      disposables.push(dist);
    }

    // if the text is underlined, adds reverb
    if (attrs.underline) {
      const rev = new Tone.Reverb({ decay: 5.0, wet: 0.75 });
      chain.push(rev);
      disposables.push(rev);
    }

    // creates a volume control and connects to the output
    const sink = new Tone.Gain(gainLevel).toDestination();
    disposables.push(sink);

    // adds to chain
    if (postFilter) chain.push(postFilter);

    // connect everything to chain in order
    for (let i = 0; i < chain.length; i++) {
      const a = chain[i],
        b = chain[i + 1] || sink;
      a.connect(b);
    }

    // determines the first of the chain, puts new synths here before the effects
    const inputNode = chain.length ? chain[0] : sink;

    // for every note in a chord it creates a new synth
    const synths = notes.map(() => {
      const s = new Tone.Synth();

      // sets oscillator type
      s.oscillator.type = osc.type;

      // settings
      s.envelope.attack = 0.01;
      s.envelope.decay = 0.12;
      s.envelope.sustain = 0.65;
      s.envelope.release = 0.25;

      // disconnect default routing
      s.disconnect();
      // connect into the custom effects chain
      s.connect(inputNode);

      // if text is italic, then it has a vibrato effect
      if (attrs.italic) {
        const lfo = new Tone.LFO({ frequency: 6, min: -75, max: 75 }).start();
        lfo.connect(s.detune);
        disposables.push(lfo);
      }

      // console.log(attrs.pt);

      disposables.push(s);
      return s;
    });

    // removes all synths and efects when finish playing! for memory and also overalap MEOW
    const t = when ?? Tone.now();
    synths.forEach((s, i) => s.triggerAttackRelease(notes[i], durSec, t, vel));

    const ms = Math.max(0, (t - Tone.now()) * 1000) + durSec * 1000 + 600;
    setTimeout(() => {
      synths.forEach((s) => s.dispose());
      disposables.forEach((n) => n.dispose?.());
    }, ms);
  }

  function playChar(ch, when, attrs) {
    let note;

    // picks a random note from letterToNote using math.random()
    if (ch === "?") {
      const pool = Object.values(letterToNote);
      note = pool[Math.floor(Math.random() * pool.length)];

      // otherwise it finds the letter's pitch based on letterToNote
    } else {
      note = letterToNote[ch.toLowerCase()];
    }
    if (!note) return;

    // plays the note with the and the attribtues
    playChordWithAttrs([note], 1.0, when, attrs);
  }

  // ====================== WORD CHORD =========================
  function playWordAsChord(lettersWithAttrs, when) {
    // the word array is empty, it stops, otherwise have a 1 sec duration per word
    if (!lettersWithAttrs.length) return when || Tone.now();
    const t = when ?? Tone.now();
    const dur = 1.0;

    // first letter defines root pitch
    const first = lettersWithAttrs[0];
    const firstNote = letterToNote[first.ch.toLowerCase()];
    if (!firstNote) return t + dur;

    const isMajor = lettersWithAttrs.length % 2 === 0; // even = major, odd = minor
    const baseScale = getScaleNotes(firstNote, isMajor); // uses the scale notes to generate triad

    // builds a triad
    const triad = [
      baseScale[0],
      baseScale[2] || baseScale[1] || baseScale[0],
      baseScale[4] || baseScale[2] || baseScale[0],
    ];

    // function to shift note up/down an octave MEOW
    // i used AI assistance with this part, will write more about in my reflection
    function shiftOctave(note, shift) {
      if (!note || typeof note !== "string") return note;
      const match = note.match(/^([A-G]#?)(\d)$/);
      if (!match) return note;
      const [, letter, octaveStr] = match;
      let octave = parseInt(octaveStr);
      octave += shift;
      return letter + octave;
    }

    // goes through each letter in the word, and picks a triad tone
    const chordNotes = lettersWithAttrs.map(({ ch }, i) => {
      const baseNote = triad[i % triad.length] || triad[0];

      // if the letters are N-Z, it drops an octave with the triads to keep everything within a pleasant range
      const isUpper = ch.toLowerCase() >= "n" && ch.toLowerCase() <= "z";
      return shiftOctave(baseNote, isUpper ? -1 : 0);
    });

    // plays the chords with the attributes as well
    lettersWithAttrs.forEach(({ ch, attrs }, i) => {
      const note = chordNotes[i];
      if (note) playChordWithAttrs([note], dur, t, attrs);
    });

    return t + dur;
  }

  // ====================== PER CHATACTER FORMATTING =========================

  // this was super difficult (as we discussed in class about formatting),
  // but i was able to get it with a mix of AI assistance and MDN web docs, specfically
  // the sections about getComputedStyle() = https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle
  //  and Traversing the DOM = https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Traversing_an_HTML_table_with_JavaScript_and_DOM_Interfaces

  function collectSegmentsWithAttrs(root) {
    const out = []; // holds all the attributes
    const base = attrsFrom(page); //default styling in case not styled

    function walk(n, inherited) {
      // if the node is just text, it collects every character and its attributes
      if (n.nodeType === Node.TEXT_NODE) {
        const text = n.nodeValue || "";
        for (let i = 0; i < text.length; i++)
          out.push({ ch: text[i], attrs: inherited });
        return;
      }

      // if the node is an element, it combines its own styling and inherited styling
      if (n.nodeType === Node.ELEMENT_NODE) {
        const a = attrsFrom(n);
        const merged = {
          bold: a.bold || inherited.bold,
          italic: a.italic || inherited.italic,
          underline: a.underline || inherited.underline,
          bucket: a.bucket || inherited.bucket,
          pt: a.pt || inherited.pt,
        };

        // recursion...
        n.childNodes.forEach((child) => walk(child, merged));
      }
    }

    walk(root, base);
    return out;
  }

  // loops through the array of characters
  function extractLoopRegions(charStream) {
    const regions = [];
    const stack = [];
    for (let i = 0; i < charStream.length; i++) {
      const c = charStream[i].ch;

      // if it finds a matching [ and], everything inside them is considered a looping area
      if (c === "[") stack.push(i);
      else if (c === "]" && stack.length) {
        const start = stack.pop();
        regions.push([start + 1, i]);
      }
    }
    return regions.map(([a, b]) => charStream.slice(a, b));
  }

  // makes word splay one after the other with consideration of spaces and punctuation
  // made with the assistance of AI MEOW
  const isWordChar = (c) => /[a-z?]/i.test(c); // true for letters or ?
  const isWhitespace = (c) =>
    c === " " || c === "\t" || c === "\n" || c === "\r"; // white space
  const isBoundary = (c) => /[.!?,;:(){}\-\u2013\u2014]/.test(c); // punctuation

  // function that collects consecutive letters into the word array, and when it hits
  // a white space or a break, it plays that word as a chord then resets, then repeats
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
    // collects all character and attributes from paragarph
    const stream = collectSegmentsWithAttrs(node);
    // plays them as chords
    playRegionAsWordChords(stream);
  }

  // ====================== PARAGRAPHS  ==================
  // created with ai assistance because paragraphs wouldn't work if there was more than one

  // stores active loop
  const activeLoops = new Map();

  // ensures that that theres at elast one editable div (had some issues with this after deleting loops)
  function ensureAtLeastOneBlock() {
    if (!page.firstChild) {
      const d = document.createElement("div");
      d.appendChild(document.createElement("br"));
      page.appendChild(d);
    }
  }

  // if no multiple paragraphs, just wrap everything on one
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

  // ============= LOOPS =================
  // cleans up paragraph text and replace spaces
  // mix of my original prototype and also AI because again, everything stopped working when
  // multiple parapgraphs got involved

  const nodeText = (n) => (n.textContent || "").replace(/\u00A0/g, " ");

  // checks if a paragraph starts with / for live typing mdoe
  const isLive = (t) => t.trimStart().startsWith("/");

  // stops and removes all active loops (used for reset button)
  function stopAllLoops() {
    for (const [, arr] of activeLoops.entries())
      arr.forEach((l) => clearInterval(l.interval));
    activeLoops.clear();
  }

  // stops a paragraphs loop if content is deelted
  function stopLoopsFor(node) {
    const arr = activeLoops.get(node);
    if (!arr) return;
    arr.forEach((l) => clearInterval(l.interval));
    activeLoops.delete(node);
  }

  function updateParagraphs() {
    const paras = paragraphBlocks();
    const set = new Set(paras);

    // cleans up all active loops (same as above)
    for (const [node, arr] of activeLoops.entries()) {
      if (!set.has(node)) {
        arr.forEach((l) => clearInterval(l.interval));
        activeLoops.delete(node);
      }
    }

    // checks each paragraph if its live or loop mode
    paras.forEach((node) => {
      const text = nodeText(node).trim();
      const live = isLive(text);
      const endedWithDot = text.endsWith(".");

      // if paragraph is inactive that means no loops
      if (!live && !endedWithDot) {
        stopLoopsFor(node);
        return;
      }

      // adds parapgrah to active list if not already there and palys immediately if ends with .
      if (!activeLoops.has(node)) {
        activeLoops.set(node, []);
        if (!live && endedWithDot) playParagraphOnce(node);
      }

      const stream = collectSegmentsWithAttrs(node);
      const regions = extractLoopRegions(stream);

      let list = activeLoops.get(node) || [];
      // removes old intervals if they dont match loop count
      list = list.filter((obj) => {
        if (obj.key >= regions.length) {
          clearInterval(obj.interval);
          return false;
        }
        return true;
      });

      // creates new loops for new regions
      regions.forEach((region, idx) => {
        if (list.some((l) => l.key === idx)) return; // already looping
        const interval = setInterval(() => {
          const s = collectSegmentsWithAttrs(node);
          const rs = extractLoopRegions(s);
          const r = rs[idx];
          if (!r || !r.length) return;
          playRegionAsWordChords(r); //replay the loop
        }, 2000);
        list.push({ key: idx, interval });
      });

      activeLoops.set(node, list);
    });
  }

  // everytime a key is pressed it updates to see if anything changed
  // makes sure that loops start and stop immediately because I had an issue where it kept
  // playing even after it was deleted
  page.addEventListener("keyup", () => {
    updateParagraphs();
    updateFontDisplay();
  });

  // ========== LIVE TYPING ============

  // live typing when / is at the front of a paragraph
  page.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return; // ignores shortcuts

    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!node) return;

    // goes through DOM until it reaches a paragraph
    let el = node.nodeType === 3 ? node.parentElement : node;
    while (
      el &&
      el !== page &&
      !getComputedStyle(el).display.match(/block|flex|grid|table/)
    ) {
      el = el.parentElement;
    }

    const txt = (el?.textContent || "").trim();
    if (!isLive(txt)) return; // only play live if paragprah starts with /

    // if it is a letter or ?, play sonund immediately
    if (/[a-z?]/i.test(e.key)) {
      const caretEl =
        sel.anchorNode.nodeType === 3
          ? sel.anchorNode.parentElement
          : sel.anchorNode;

      // gets the styling and triggers note immediately
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
// gets everything from ID
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

// the tutorial steps and where they are, and what they target
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

// tracks what step it are on
let current = 0;

// makes sure hte overlay coveres the entire page
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
  // finds the current tutorial step, and finds the target
  const step = tutorialSteps[current];
  const el = document.querySelector(step.target);
  if (!el) return;

  resizeOverlayHeight();

  // calculates everything to correctly position
  const rect = el.getBoundingClientRect();
  const scrollY = window.scrollY || document.documentElement.scrollTop;
  const scrollX = window.scrollX || document.documentElement.scrollLeft;

  // special case for the first step! takes up the enture screen
  if (current === 0) {
    highlightBox.style.display = "none"; // hides glow
    overlay.style.background = "rgba(0, 0, 0, 0.7)"; // fully dim everything
    overlay.style.clipPath = "none";

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

  // the glow highlight box over the target element and a bit of padding
  highlightBox.style.display = "block";
  const radius = 8;
  highlightBox.style.top = `${rect.top + scrollY - 6}px`;
  highlightBox.style.left = `${rect.left + scrollX - 6}px`;
  highlightBox.style.width = `${rect.width + 12}px`;
  highlightBox.style.height = `${rect.height + 12}px`;

  // background dimming/ spotlight thing
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

  // positions the popup box relative to the highlighted element, and also based on
  // the position listed
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

// when next is clicked, increases the current step number
nextBtn.addEventListener("click", () => {
  current++;
  if (current >= tutorialSteps.length - 1) {
    // when reaching the last step, hides the next and skip buttons and shows the finish button
    nextBtn.classList.add("hidden");
    skipBtn.classList.add("hidden");
    finishBtn.classList.remove("hidden");
  }
  if (current < tutorialSteps.length) {
    showStep();
  }
});

// hides everything related to tutorial when clicked
finishBtn.addEventListener("click", () => {
  overlay.classList.add("hidden");
  popup.classList.add("hidden");
  highlightBox.style.display = "none";
});

// identical to finish, but can be pressed earlier
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
