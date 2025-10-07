// rules:
// . = activates a paragraph (plays once + starts loops inside [ ])
// [ ... ] = keeps looping forever until deleted
// / (at the START of a paragraph) = live mode (plays letters as you type)
// words with no spaces = chord
// letters with spaces between = sequence
// modifiers: ? random note/chord
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

  function adjustFontSize(deltaPt) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    range.surroundContents(span);

    const basePx = parseFloat(getComputedStyle(page).fontSize) || 16;
    const currentPx = parseFloat(getComputedStyle(span).fontSize) || basePx;

    // Convert px → pt, apply change, clamp to 6–18 pt, then back to px
    const currentPt = currentPx * 0.75;
    const nextPt = Math.max(6, Math.min(18, currentPt + deltaPt));
    const nextPx = nextPt / 0.75;

    span.style.fontSize = `${nextPx}px`;

    const r = document.createRange();
    r.selectNodeContents(span);
    sel.removeAllRanges();
    sel.addRange(r);
  }

  function fullReset() {
    // stop all loops
    for (const [node, loops] of activeLoops.entries()) {
      loops.forEach((l) => clearInterval(l.interval));
    }
    activeLoops.clear();

    // clear document content
    page.innerHTML = "";

    // reinsert an empty paragraph block
    const empty = document.createElement("div");
    empty.appendChild(document.createElement("br"));
    page.appendChild(empty);

    // reset font display and focus
    updateFontDisplay();
    page.focus();

    console.log("Document reset.");
  }

  // replace the existing reset event
  document
    .querySelector(".tool-btn.reset")
    ?.addEventListener("click", fullReset);

  const fontDisplay = document.querySelector(".font-size-display");
  const allToolBtns = Array.from(document.querySelectorAll(".tool-btn"));
  const minusBtn = allToolBtns.find((b) => b.textContent.trim() === "-");
  const plusBtn = allToolBtns.find((b) => b.textContent.trim() === "+");

  minusBtn?.addEventListener("click", () => {
    adjustFontSize(-1);
    updateFontDisplay();
    enforceFontSizeLimits();
  });

  plusBtn?.addEventListener("click", () => {
    adjustFontSize(+1);
    updateFontDisplay();
    enforceFontSizeLimits();
  });

  function enforceFontSizeLimits() {
    const currentPt = parseFloat(fontDisplay.textContent);

    // Hide or show buttons based on limits
    if (currentPt <= 6) {
      minusBtn.style.visibility = "hidden";
    } else {
      minusBtn.style.visibility = "visible";
    }

    if (currentPt >= 18) {
      plusBtn.style.visibility = "hidden";
    } else {
      plusBtn.style.visibility = "visible";
    }
  }

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

  // initialize display and button states after everything defined
  updateFontDisplay();
  enforceFontSizeLimits();

  document
    .querySelector(".color-btn.black")
    ?.addEventListener("click", () => setColor("black"));
  document
    .querySelector(".color-btn.blue")
    ?.addEventListener("click", () => setColor("blue"));
  document
    .querySelector(".color-btn.red")
    ?.addEventListener("click", () => setColor("red"));

  document
    .querySelector(".tool-btn.reset")
    ?.addEventListener("click", fullReset);

  // --------------------------------
  // Attr helpers (colors, grouping)
  // --------------------------------

  function cssColorToBucket(cssColor) {
    // Normalize rgb/rgba/hex/named to buckets we support: black, blue, red
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
    if (r >= g && r >= b) return "red";
    return "black";
  }

  function attrsKey(a) {
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

    // === Loudness per font size (explicit lookup, no scaling, no limiter) ===
    const currentPx =
      attrs.fontPx || parseFloat(getComputedStyle(page).fontSize) || 16;
    const currentPt = Math.round(currentPx * 0.75);
    const clampedPt = Math.max(6, Math.min(18, currentPt));

    // Manual loudness table (edit these freely)
    const loudnessMap = {
      6: 0.03, // barely audible
      7: 0.06,
      8: 0.1,
      9: 0.18,
      10: 0.3,
      11: 0.5,
      12: 0.8, // "normal"
      13: 1.2,
      14: 2.0,
      15: 3.3,
      16: 5.0,
      17: 7.0,
      18: 10.0, // maximum loudness
    };

    // use exact loudness value directly as velocity
    const velocity = loudnessMap[clampedPt] ?? 0.7;

    // Color → oscillator
    const bucket = attrs.colorBucket || "black";
    let oscOpts = { type: "sine", partialCount: 1 };
    if (bucket === "blue") oscOpts = { type: "square", partialCount: 8 };
    else if (bucket === "red") oscOpts = { type: "sawtooth", partialCount: 16 };

    const nodesToDispose = [];
    const chainNodes = [];

    if (attrs.bold) {
      const distortion = new Tone.Distortion(0.95);
      chainNodes.push(distortion);
      nodesToDispose.push(distortion);
    }

    if (attrs.underline) {
      const reverb = new Tone.Reverb({ decay: 5.0, wet: 0.75 });
      chainNodes.push(reverb);
      nodesToDispose.push(reverb);
    }

    const sink = new Tone.Gain().toDestination();
    nodesToDispose.push(sink);
    for (let i = 0; i < chainNodes.length; i++) {
      const node = chainNodes[i];
      if (i === chainNodes.length - 1) node.connect(sink);
      else node.connect(chainNodes[i + 1]);
    }
    const inputNode = chainNodes.length ? chainNodes[0] : sink;

    const synths = notes.map(() => {
      const s = new Tone.Synth({
        oscillator: oscOpts,
        envelope: { attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25 },
      });
      s.connect(inputNode);
      if (attrs.italic) {
        const lfo = new Tone.LFO({ frequency: 6, min: -75, max: 75 }).start();
        lfo.connect(s.detune);
        nodesToDispose.push(lfo);
      }
      return s;
    });

    synths.forEach((s, i) =>
      s.triggerAttackRelease(notes[i], dur, time, velocity)
    );
    const ms = Math.max(0, (time - Tone.now()) * 1000) + dur * 1000 + 600;
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

    const dur = 1.0;
    const baseVel = 0.7;
    triggerChordWithAttrs([note], dur, time, baseVel, attrs);
  }

  // play a word (handles chords, sequences, modifiers)
  function playWord(word, currentTime, attrs = {}) {
    const dur = 1.0;
    const baseVel = 0.7;

    if (word.includes("?")) {
      let count = (word.match(/\?/g) || []).length;
      const pool = Object.values(letterToNote);
      let chord = [];
      for (let i = 0; i < count; i++)
        chord.push(pool[Math.floor(Math.random() * pool.length)]);
      triggerChordWithAttrs(chord, dur, currentTime, baseVel, attrs);
      return currentTime + dur;
    }

    if (word.length === 1) {
      playLetter(word, word, currentTime, attrs);
      return currentTime + dur;
    }

    const chord = word
      .replace(/[^a-z? ]/gi, "")
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

  function charStreamFromSegments(segments) {
    const out = [];
    segments.forEach((seg) => {
      const txt = seg.text.replace(/\u00A0/g, " ");
      for (let i = 0; i < txt.length; i++)
        out.push({ ch: txt[i], attrs: seg.attrs });
    });
    return out;
  }

  function extractLoopRegions(charStream) {
    const regions = [];
    let stack = [];
    for (let i = 0; i < charStream.length; i++) {
      const { ch } = charStream[i];
      if (ch === "[") stack.push(i);
      else if (ch === "]" && stack.length) {
        const start = stack.pop();
        regions.push([start + 1, i]); // inside brackets
      }
    }
    return regions.map(([a, b]) => charStream.slice(a, b));
  }

  // -----------------------------
  // robust region scheduler
  // -----------------------------
  function isWhitespace(ch) {
    return ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
  }
  function isWordChar(ch) {
    return /[a-z?]/i.test(ch);
  } // letters, ?
  function isBoundary(ch) {
    return /[.!?,;:(){}\-\u2013\u2014]/.test(ch);
  }

  function playCharRegion(region, startTime) {
    let t = startTime ?? Tone.now();
    let wordChars = [];

    function flushWord() {
      if (wordChars.length === 0) return;
      const dur = 1.0;
      wordChars.forEach(({ ch, attrs }) => playLetter(ch, "", t, attrs));
      t += dur;
      wordChars = [];
    }

    for (let i = 0; i < region.length; i++) {
      const { ch, attrs } = region[i];
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
        wordChars.push({ ch: c, attrs });
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
  // Loops management (keyed by NODE)
  // -----------------------------

  /** Map<Node, Array<{key:number, interval:number}>> */
  const activeLoops = new Map();

  function ensureParagraphBlocks() {
    const hasBlock = Array.from(page.childNodes).some(
      (n) =>
        n.nodeType === 1 &&
        /(block|list-item|table|grid|flex)/.test(getComputedStyle(n).display)
    );
    if (hasBlock) return;

    if (page.childNodes.length === 0) {
      const d = document.createElement("div");
      d.appendChild(document.createElement("br"));
      page.appendChild(d);
      return;
    }

    const wrapper = document.createElement("div");
    while (page.firstChild) wrapper.appendChild(page.firstChild);
    page.appendChild(wrapper);
  }

  function getParagraphNodes() {
    ensureParagraphBlocks();
    const blocks = [];
    page.childNodes.forEach((n) => {
      if (n.nodeType === 1) {
        const disp = getComputedStyle(n).display;
        if (/(^| )(block|list-item|table|grid|flex)( |$)/.test(disp)) {
          blocks.push(n);
        }
      }
    });
    return blocks;
  }

  function nodeInnerText(node) {
    return (node.textContent || "").replace(/\u00A0/g, " ");
  }

  function isLiveParagraph(text) {
    return text.trimStart().startsWith("/");
  }

  function clearLoopsForNode(node) {
    const arr = activeLoops.get(node);
    if (arr) {
      arr.forEach((loopObj) => clearInterval(loopObj.interval));
      activeLoops.delete(node);
    }
  }

  function updateParagraphs() {
    const paras = getParagraphNodes();
    const currentSet = new Set(paras);

    for (const [node, loops] of activeLoops.entries()) {
      if (!currentSet.has(node)) {
        loops.forEach((l) => clearInterval(l.interval));
        activeLoops.delete(node);
      }
    }

    paras.forEach((node) => {
      const text = nodeInnerText(node).trim();
      const live = isLiveParagraph(text);
      const endsWithDot = text.endsWith(".");

      if (!live && !endsWithDot) {
        clearLoopsForNode(node);
        return;
      }

      if (!activeLoops.has(node)) {
        activeLoops.set(node, []);
        if (!live && endsWithDot) playParagraphNode(node);
      }

      if (!live && !endsWithDot) return;

      const segments = getTextSegmentsWithAttrs(node);
      const stream = charStreamFromSegments(segments);
      const loopRegions = extractLoopRegions(stream);

      let list = activeLoops.get(node) || [];
      list = list.filter((loopObj) => {
        if (loopObj.key >= loopRegions.length) {
          clearInterval(loopObj.interval);
          return false;
        }
        return true;
      });

      loopRegions.forEach((region, regionIndex) => {
        if (list.some((l) => l.key === regionIndex)) return;

        const interval = setInterval(() => {
          const segsNow = getTextSegmentsWithAttrs(node);
          const streamNow = charStreamFromSegments(segsNow);
          const regsNow = extractLoopRegions(streamNow);
          const r = regsNow[regionIndex];
          if (!r || r.length === 0) return;
          playCharRegion(r);
        }, 2000);

        list.push({ key: regionIndex, interval });
      });

      activeLoops.set(node, list);
    });
  }

  page.addEventListener("keyup", () => {
    updateParagraphs();
    updateFontDisplay();
  });

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
