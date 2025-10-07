// rules:
// . = activates a paragraph (plays once + starts loops inside [ ])
// [ ... ] = keeps looping forever until deleted
// / (at the START of a paragraph) = live mode (plays letters as you type)
// words with no spaces = chord
// letters with spaces between = sequence
// modifiers: ! louder, ? random note/chord, "..." muted
// Formatting maps to sound per formatted span (B/I/U, color, font-size)

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".page");

  // mapping letters to notes
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

  // unlock tone.js once user interacts
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

  // -----------------------------
  // Toolbar wiring (formatting)
  // -----------------------------

  function toggleCmd(cmd) {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand(cmd, false, null);
  }

  function setColor(color) {
    document.execCommand("styleWithCSS", false, true);
    document.execCommand("foreColor", false, color);
  }

  function adjustFontSize(deltaPx) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    range.surroundContents(span);

    const basePx = parseFloat(getComputedStyle(page).fontSize) || 16;
    const curPx = parseFloat(getComputedStyle(span).fontSize) || basePx;
    const nextPx = Math.max(8, Math.min(64, curPx + deltaPx));
    span.style.fontSize = `${nextPx}px`;

    const r = document.createRange();
    r.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function resetFormatting() {
    page.focus();
    document.execCommand("selectAll", false, null);
    document.execCommand("removeFormat", false, null);

    // normalize color/size back to inherit
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.color = "inherit";
    span.style.fontSize = "inherit";
    range.surroundContents(span);
    sel.removeAllRanges();
  }

  const fontDisplay = document.querySelector(".font-size-display");
  const allToolBtns = Array.from(document.querySelectorAll(".tool-btn"));
  const minusBtn = allToolBtns.find((b) => b.textContent.trim() === "-");
  const plusBtn = allToolBtns.find((b) => b.textContent.trim() === "+");

  minusBtn?.addEventListener("click", () => {
    adjustFontSize(-2);
    updateFontDisplay();
  });
  plusBtn?.addEventListener("click", () => {
    adjustFontSize(+2);
    updateFontDisplay();
  });

  function updateFontDisplay() {
    const sel = window.getSelection();
    let px;
    if (sel && sel.rangeCount) {
      const node =
        sel.anchorNode &&
        (sel.anchorNode.nodeType === 3
          ? sel.anchorNode.parentElement
          : sel.anchorNode);
      if (node && node.nodeType === 1) {
        px = parseFloat(getComputedStyle(node).fontSize);
      }
    }
    if (!px) px = parseFloat(getComputedStyle(page).fontSize) || 16;
    const pt = Math.round(px * 0.75);
    if (fontDisplay) fontDisplay.textContent = String(pt);
  }

  const toggleBtns = Array.from(document.querySelectorAll(".tool-btn.toggle"));
  const boldBtn = toggleBtns.find(
    (b) => b.textContent.trim().toUpperCase() === "B"
  );
  const italicBtn = toggleBtns.find(
    (b) => b.textContent.trim().toUpperCase() === "I"
  );
  const underlineBtn = toggleBtns.find(
    (b) => b.textContent.trim().toUpperCase() === "U"
  );

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
    .querySelector(".color-btn.green")
    ?.addEventListener("click", () => setColor("green"));
  document
    .querySelector(".color-btn.red")
    ?.addEventListener("click", () => setColor("red"));

  document
    .querySelector(".tool-btn.reset")
    ?.addEventListener("click", resetFormatting);

  // --------------------------------
  // Attr helpers (colors, grouping)
  // --------------------------------

  function cssColorToBucket(cssColor) {
    // Normalize rgb/rgba/hex/named to buckets: black, blue, green, red
    const ctx = document.createElement("canvas").getContext("2d");
    ctx.fillStyle = cssColor;
    const normalized = ctx.fillStyle; // browser-normalized color

    let r = 0,
      g = 0,
      b = 0;
    if (normalized.startsWith("#")) {
      const hex = normalized.slice(1);
      const v =
        hex.length === 3
          ? hex.split("").map((h) => parseInt(h + h, 16))
          : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)].map((h) =>
              parseInt(h, 16)
            );
      [r, g, b] = v;
    } else {
      const m = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) {
        r = +m[1];
        g = +m[2];
        b = +m[3];
      }
    }
    const max = Math.max(r, g, b);
    if (max < 30) return "black";
    if (b >= r && b >= g) return "blue";
    if (g >= r && g >= b) return "green";
    if (r >= g && r >= b) return "red";
    return "black";
  }

  function attrsKey(a) {
    // stable key for grouping runs
    return [
      a.bold ? 1 : 0,
      a.italic ? 1 : 0,
      a.underline ? 1 : 0,
      Math.round(a.fontPx || 0),
      a.colorBucket || "black",
    ].join("|");
  }

  // --------------------------------------------
  // Audio engine per formatted span (stacked FX)
  // --------------------------------------------

  function triggerChordWithAttrs(notes, dur, time, baseVelocity, attrs) {
    if (!notes || notes.length === 0) return;

    // Font size → loudness
    const basePx = parseFloat(getComputedStyle(page).fontSize) || 16;
    const rel = Math.max(0.5, Math.min(2.0, (attrs.fontPx || basePx) / basePx));
    let velocity = Math.max(
      0.2,
      Math.min(1.0, baseVelocity * (0.5 + 0.5 * rel))
    );

    // Color → oscillator / aggression
    let oscType = "triangle";
    let extraDist = 0;
    const bucket = attrs.colorBucket || "black";
    if (bucket === "blue") oscType = "sine";
    else if (bucket === "green") oscType = "square";
    else if (bucket === "red") {
      oscType = "sawtooth";
      extraDist = 0.4;
    }

    const nodesToDispose = [];
    // Bold → distortion (+ extra for red)
    const distAmt = (attrs.bold ? 0.35 : 0) + extraDist;
    const distortion =
      distAmt > 0 ? new Tone.Distortion(distAmt).toDestination() : null;
    if (distortion) nodesToDispose.push(distortion);

    // Italic → vibrato
    const vibrato = attrs.italic ? new Tone.Vibrato(6, 0.08).start() : null;
    if (vibrato) nodesToDispose.push(vibrato);

    // Underline → reverb (echo-y tail)
    const reverb = attrs.underline
      ? new Tone.Reverb({ decay: 2.2, wet: 0.35 })
      : null;
    if (reverb) nodesToDispose.push(reverb);

    function connectChain(src) {
      let head = src;
      if (vibrato) {
        head.connect(vibrato);
        head = vibrato;
      }
      if (distortion) {
        head.connect(distortion);
        head = distortion;
      }
      if (reverb) {
        head.connect(reverb);
        head = reverb;
      }
      head.toDestination();
    }

    const synths = notes.map(() => {
      const s = new Tone.Synth({
        oscillator: { type: oscType },
        envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.2 },
      });
      connectChain(s);
      return s;
    });

    synths.forEach((s, i) =>
      s.triggerAttackRelease(notes[i], dur, time, velocity)
    );

    const ms = Math.max(0, (time - Tone.now()) * 1000) + dur * 1000 + 300;
    setTimeout(() => {
      synths.forEach((s) => s.dispose());
      nodesToDispose.forEach((n) => n.dispose?.());
    }, ms);
  }

  // play a single letter
  function playLetter(char, raw = "", time = Tone.now(), attrs = {}) {
    let note;
    if (char === "?") {
      const pool = Object.values(letterToNote);
      note = pool[Math.floor(Math.random() * pool.length)];
    } else {
      note = letterToNote[char.toLowerCase()];
    }
    if (!note) return;

    const dur = 1.0; // default sustain length 1 second
    const baseVel = raw.includes("!") ? 1.0 : 0.7;

    triggerChordWithAttrs([note], dur, time, baseVel, attrs);
  }

  // play a word (handles chords, sequences, modifiers)
  function playWord(word, currentTime, attrs = {}) {
    if (/^".*"$/.test(word)) return currentTime; // muted

    const dur = 1.0; // fixed 1 second duration
    const baseVel = word.includes("!") ? 1.0 : 0.7;

    // random chord if "?" appears
    if (word.includes("?")) {
      let count = (word.match(/\?/g) || []).length;
      const pool = Object.values(letterToNote);
      let chord = [];
      for (let i = 0; i < count; i++) {
        chord.push(pool[Math.floor(Math.random() * pool.length)]);
      }
      triggerChordWithAttrs(chord, dur, currentTime, baseVel, attrs);
      return currentTime + dur;
    }

    // single letter = sequence element
    if (word.length === 1) {
      playLetter(word, word, currentTime, attrs);
      return currentTime + dur;
    }

    // chord from multiple letters (no spaces)
    const chord = word
      .replace(/[^a-z? !]/gi, "")
      .split("")
      .map((l) => letterToNote[l.toLowerCase()])
      .filter(Boolean);

    if (chord.length > 0) {
      triggerChordWithAttrs(chord, dur, currentTime, baseVel, attrs);
      return currentTime + dur;
    }

    return currentTime;
  }

  // -----------------------------
  // HTML → segments with attrs
  // -----------------------------

  function getTextSegmentsWithAttrs(node) {
    const segments = [];
    const basePx = parseFloat(getComputedStyle(page).fontSize) || 16;

    function computeAttrs(el) {
      const cs = el ? getComputedStyle(el) : null;
      const colorBucket = cssColorToBucket(cs ? cs.color : "black");
      const fontPx = cs ? parseFloat(cs.fontSize) : basePx;
      const fw = cs ? cs.fontWeight : "400";
      const boldByWeight =
        (typeof fw === "string" && fw.toLowerCase() === "bold") ||
        parseInt(fw, 10) >= 600;
      const fontStyle = cs ? cs.fontStyle : "normal";
      const textDec = cs
        ? cs.textDecorationLine || cs.textDecoration || ""
        : "";
      return {
        colorBucket,
        fontPx,
        bold:
          boldByWeight ||
          (el && (el.tagName === "B" || el.tagName === "STRONG")),
        italic:
          fontStyle === "italic" ||
          (el && (el.tagName === "I" || el.tagName === "EM")),
        underline: textDec.includes("underline") || (el && el.tagName === "U"),
      };
    }

    function walk(n, inherited) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (n.nodeValue) segments.push({ text: n.nodeValue, attrs: inherited });
        return;
      }
      if (n.nodeType === Node.ELEMENT_NODE) {
        const thisAttrs = computeAttrs(n);
        const merged = {
          colorBucket: thisAttrs.colorBucket || inherited.colorBucket,
          fontPx: thisAttrs.fontPx || inherited.fontPx,
          bold: thisAttrs.bold || inherited.bold,
          italic: thisAttrs.italic || inherited.italic,
          underline: thisAttrs.underline || inherited.underline,
        };
        n.childNodes.forEach((child) => walk(child, merged));
      }
    }

    walk(node, {
      colorBucket: "black",
      fontPx: basePx,
      bold: false,
      italic: false,
      underline: false,
    });
    return segments;
  }

  // normalize NBSP to normal spaces so sequences split correctly
  function charStreamFromSegments(segments) {
    const out = [];
    segments.forEach((seg) => {
      const txt = seg.text.replace(/\u00A0/g, " "); // NBSP → space here too
      for (let i = 0; i < txt.length; i++) {
        out.push({ ch: txt[i], attrs: seg.attrs });
      }
    });
    return out;
  }

  function extractLoopRegions(charStream) {
    const regions = [];
    let inQuotes = false;
    let stack = [];
    for (let i = 0; i < charStream.length; i++) {
      const { ch } = charStream[i];
      if (ch === '"') inQuotes = !inQuotes;
      if (inQuotes) continue;
      if (ch === "[") stack.push(i);
      else if (ch === "]" && stack.length) {
        const start = stack.pop();
        regions.push([start + 1, i]); // inside brackets
      }
    }
    // Convert regions to arrays of {ch, attrs}
    return regions.map(([a, b]) => charStream.slice(a, b));
  }

  // -----------------------------
  // NEW: robust region scheduler
  // -----------------------------
  function isWhitespace(ch) {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  }
  function isWordChar(ch) {
    return /[a-z?!]/i.test(ch); // letters, ?, !
  }
  function isBoundary(ch) {
    // punctuation that ends a word but doesn't itself sound
    return /[.,;:(){}\-\u2013\u2014]/.test(ch);
  }

  // Build words across formatting runs; letters in a word play together (chord).
  // A space/boundary advances time (sequence).
  function playCharRegion(region, startTime) {
    let t = startTime ?? Tone.now();
    let inQuotes = false;

    let wordChars = []; // array of { ch, attrs }
    let rawHasBang = false; // track '!' in word (loudness)

    function flushWord() {
      if (wordChars.length === 0) return;
      const dur = 1.0;
      const rawFlag = rawHasBang ? "!" : "";
      wordChars.forEach(({ ch, attrs }) => playLetter(ch, rawFlag, t, attrs));
      t += dur; // advance for sequence
      wordChars = [];
      rawHasBang = false;
    }

    for (let i = 0; i < region.length; i++) {
      const { ch, attrs } = region[i];

      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (inQuotes) continue;

      const c = ch === "\u00A0" ? " " : ch;

      if (isWhitespace(c)) {
        flushWord();
        continue;
      }
      if (isBoundary(c) || c === "[" || c === "]") {
        flushWord();
        continue;
      }

      if (isWordChar(c)) {
        if (c === "!") rawHasBang = true;
        else wordChars.push({ ch: c, attrs });
        continue;
      }

      flushWord();
    }

    flushWord();
    return t;
  }

  // -----------------------------
  // Paragraph playback
  // -----------------------------

  function playParagraphNode(paraNode) {
    const segments = getTextSegmentsWithAttrs(paraNode);
    const region = charStreamFromSegments(segments);
    playCharRegion(region);
  }

  // -----------------------------
  // Loops management
  // -----------------------------

  let activeLoops = {}; // per paragraph index

  function getParagraphNodes() {
    // Treat each direct child block of .page as a "paragraph".
    // If there are no children, treat the page itself as one paragraph.
    const children = Array.from(page.childNodes).filter((n) => {
      if (n.nodeType === 1) return true; // element (div, p, etc.)
      if (n.nodeType === 3 && n.nodeValue.trim().length) return true; // text node
      return false;
    });
    return children.length ? children : [page];
  }

  function nodeInnerText(node) {
    return (node.textContent || "").replace(/\u00A0/g, " ");
  }

  // NEW: live mode = paragraph starting with "/"
  function isLiveParagraph(text) {
    return text.trimStart().startsWith("/");
  }

  function updateParagraphs() {
    const paras = getParagraphNodes();

    paras.forEach((node, idx) => {
      const text = nodeInnerText(node).trim();

      // skip live paragraphs (start with "/")
      if (isLiveParagraph(text)) {
        if (activeLoops[idx]) {
          activeLoops[idx].forEach((loopObj) =>
            clearInterval(loopObj.interval)
          );
          delete activeLoops[idx];
        }
        return;
      }

      // only paragraphs that end with "." are active
      if (!text.endsWith(".")) {
        if (activeLoops[idx]) {
          activeLoops[idx].forEach((loopObj) =>
            clearInterval(loopObj.interval)
          );
        }
        delete activeLoops[idx];
        return;
      }

      // if it's new, play it once
      if (!activeLoops[idx]) {
        activeLoops[idx] = [];
        playParagraphNode(node);
      }

      // handle loop blocks inside [ ... ] (recomputed every tick to capture live edits/formatting)
      const segments = getTextSegmentsWithAttrs(node);
      const stream = charStreamFromSegments(segments);
      const loopRegions = extractLoopRegions(stream);

      // clean up loops that don't exist anymore
      activeLoops[idx] = activeLoops[idx].filter((loopObj) => {
        if (loopObj.key >= loopRegions.length) {
          clearInterval(loopObj.interval);
          return false;
        }
        return true;
      });

      // start new loops
      loopRegions.forEach((region, regionIndex) => {
        if (activeLoops[idx].some((l) => l.key === regionIndex)) return;

        const interval = setInterval(() => {
          const segsNow = getTextSegmentsWithAttrs(node);
          const streamNow = charStreamFromSegments(segsNow);
          const regsNow = extractLoopRegions(streamNow);
          const r = regsNow[regionIndex];
          if (!r || r.length === 0) return;
          playCharRegion(r);
        }, 2000);

        activeLoops[idx].push({ key: regionIndex, interval });
      });
    });
  }

  // check for changes when typing
  page.addEventListener("keyup", () => {
    updateParagraphs();
    updateFontDisplay();
  });

  // live typing mode for "/" paragraphs
  page.addEventListener("keydown", (e) => {
    // ignore shortcuts
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const sel = window.getSelection();
    const node = sel?.anchorNode;
    if (!node) return;

    // find the containing block element (paragraph-ish)
    let el = node.nodeType === 3 ? node.parentElement : node;
    while (
      el &&
      el !== page &&
      !getComputedStyle(el).display.match(/block|flex|grid|table/)
    ) {
      el = el.parentElement;
    }
    const text = (el?.textContent || "").trim();

    if (isLiveParagraph(text)) {
      if (/[a-z?]/i.test(e.key)) {
        const caretEl =
          sel.anchorNode.nodeType === 3
            ? sel.anchorNode.parentElement
            : sel.anchorNode;
        const cs = getComputedStyle(caretEl);
        const fw = cs.fontWeight;
        const boldByWeight =
          (typeof fw === "string" && fw.toLowerCase() === "bold") ||
          parseInt(fw, 10) >= 600;
        const attrs = {
          colorBucket: cssColorToBucket(cs.color),
          fontPx: parseFloat(cs.fontSize),
          bold: boldByWeight,
          italic: cs.fontStyle === "italic",
          underline: (
            cs.textDecorationLine ||
            cs.textDecoration ||
            ""
          ).includes("underline"),
        };
        playLetter(e.key, e.key, Tone.now(), attrs);
      }
    }
  });

  // help panel toggle
  const helpBtn = document.querySelector(".help-btn");
  const helpPanel = document.querySelector(".help-panel");

  helpBtn.addEventListener("click", () => {
    helpPanel.classList.toggle("active");
  });
});
