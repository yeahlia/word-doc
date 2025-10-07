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
    const s = (colorStr || "").toLowerCase().trim();
    if (!s) return "black";
    if (s === "blue") return "blue";
    if (s === "red") return "red";
    if (s === "black") return "black";
    if (s.startsWith("#")) {
      if (s.length === 7) {
        const r = parseInt(s.slice(1, 3), 16),
          g = parseInt(s.slice(3, 5), 16),
          b = parseInt(s.slice(5, 7), 16);
        if (b >= r && b >= g) return "blue";
        if (r >= g && r >= b) return "red";
      }
      return "black";
    }
    if (s.startsWith("rgb(")) {
      const m = s.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/i);
      if (m) {
        const r = +m[1],
          g = +m[2],
          b = +m[3];
        if (b >= r && b >= g) return "blue";
        if (r >= g && r >= b) return "red";
      }
      return "black";
    }
    // any other named color
    if (s.includes("blue")) return "blue";
    if (s.includes("red")) return "red";
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

  // how everything plays based on the attributes from before
  function playChordWithAttrs(notes, durSec, when, attrs) {
    if (!notes || !notes.length) return;

    const pt = Math.max(6, Math.min(18, Math.round(attrs.pt || 12)));
    const vel = LOUDNESS[pt] ?? 0.7;

    // color determines oscillator
    let osc = { type: "sine", partialCount: 1 };
    if (attrs.bucket === "blue") osc = { type: "square", partialCount: 8 };
    if (attrs.bucket === "red") osc = { type: "sawtooth", partialCount: 16 };

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
    const sink = new Tone.Gain().toDestination();
    disposables.push(sink);
    // connect chain in order
    for (let i = 0; i < chain.length; i++) {
      const a = chain[i],
        b = chain[i + 1] || sink;
      a.connect(b);
    }
    const inputNode = chain.length ? chain[0] : sink;

    // creates one synth per note
    const synths = notes.map(() => {
      const s = new Tone.Synth({
        oscillator: osc,
        envelope: { attack: 0.01, decay: 0.12, sustain: 0.65, release: 0.25 },
      });
      s.connect(inputNode);
      if (attrs.italic) {
        const lfo = new Tone.LFO({ frequency: 6, min: -75, max: 75 }).start();
        lfo.connect(s.detune);
        disposables.push(lfo);
      }
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

  // make sure words are played at once
  function playWordAsChord(lettersWithAttrs, when) {
    if (!lettersWithAttrs.length) return when || Tone.now();
    const t = when ?? Tone.now();
    const dur = 1.0;
    lettersWithAttrs.forEach(({ ch, attrs }) => playChar(ch, t, attrs));
    return t + dur;
  }

  // ====================== PER CHATACTER FORMATTING =========================

  function collectSegmentsWithAttrs(root) {
    const out = [];
    const base = attrsFrom(page);

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
