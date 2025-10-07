// rules (simplified):
// . = play a paragraph once (and enable loops inside [ ])
// [ ... ] = loop contents
// ( ... ) = live typing (plays letters as you type inside)
// ! = accent (louder), ? = random pitch, / = rest (~2s), "..." = mute span

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".page");
  const fontSizeDisplay = document.querySelector(".font-size-display");

  // --- tone chain ---
  const limiter = new Tone.Limiter(-3).toDestination();
  const reverb = new Tone.Reverb({
    decay: 2.2,
    preDelay: 0.03,
    wet: 0.15,
  }).connect(limiter);
  const chorus = new Tone.Chorus({
    frequency: 1.5,
    delayTime: 3.5,
    depth: 0.35,
    wet: 0.25,
  }).connect(reverb);
  const distortion = new Tone.Distortion({ distortion: 0.35, wet: 0.0 });
  const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0.16, wet: 0.0 });

  const synth = new Tone.AMSynth({
    harmonicity: 2,
    oscillator: { type: "triangle" },
    envelope: { attack: 0.01, decay: 0.12, sustain: 0.4, release: 0.4 },
  });
  synth.connect(vibrato);
  vibrato.connect(distortion);
  distortion.connect(chorus);

  // --- note utils ---
  const NOTE_POOL = [
    "C3",
    "D3",
    "E3",
    "F3",
    "G3",
    "A3",
    "B3",
    "C4",
    "D4",
    "E4",
    "F4",
    "G4",
    "A4",
    "B4",
    "C5",
    "D5",
    "E5",
    "F5",
    "G5",
    "A5",
    "B5",
  ];
  function letterToNote(ch) {
    const idx = (ch.toLowerCase().charCodeAt(0) - 97) % NOTE_POOL.length;
    return NOTE_POOL[Math.max(0, Math.min(NOTE_POOL.length - 1, idx))];
  }
  function randomNote() {
    return NOTE_POOL[Math.floor(Math.random() * NOTE_POOL.length)];
  }
  function toPx(sizeStr) {
    if (!sizeStr) return 16;
    if (sizeStr.endsWith("px")) return parseFloat(sizeStr);
    if (sizeStr.endsWith("pt")) return parseFloat(sizeStr) * (96 / 72);
    return parseFloat(sizeStr) || 16;
  }
  function fontSizeToVelocity(pxStr) {
    const px = toPx(pxStr);
    const v = (px - 12) / (24 - 12); // 12..24px -> 0..1
    return Math.max(0.5, Math.min(1.0, 0.5 + v * 0.5));
  }
  function colorToTone(colorCSS) {
    const c = (colorCSS || "").toLowerCase().replace(/\s/g, "");
    if (c.includes("0,0,255") || c.includes("blue"))
      return { osc: "sine", extraDrive: false };
    if (c.includes("0,128,0") || c.includes("green"))
      return { osc: "square", extraDrive: false };
    if (c.includes("255,0,0") || c.includes("red"))
      return { osc: "triangle", extraDrive: true };
    return { osc: "triangle", extraDrive: false };
  }
  function applyStyleToSound(style) {
    const { osc, extraDrive } = colorToTone(style.color);
    synth.oscillator.type = osc;
    distortion.wet.value = style.isBold ? 0.45 : 0.0;
    if (extraDrive) distortion.wet.value = Math.max(distortion.wet.value, 0.6);
    vibrato.wet.value = style.isItalic ? 0.5 : 0.0;
    reverb.wet.value = style.isUnder ? 0.28 : 0.15;
  }

  // --- toolbar formatting (true inline) ---
  function focusEditor() {
    page.focus();
  }
  function exec(cmd, val = null) {
    focusEditor();
    document.execCommand(cmd, false, val);
    requestIdleCallback(updateFontSizeIndicator);
  }

  function surroundSelectionWithStyle(prop, value) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement("span");
    span.style[prop] = value;
    try {
      range.surroundContents(span);
    } catch {
      if (prop === "fontSize") document.execCommand("fontSize", false, "5");
    }
  }
  function changeFontSizeSelection(deltaPx) {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const temp = document.createElement("span");
    temp.appendChild(range.cloneContents());
    document.body.appendChild(temp);
    const current = getComputedStyle(temp).fontSize || "12pt";
    document.body.removeChild(temp);
    const curPx = toPx(current);
    const next = Math.max(10, Math.min(36, curPx + deltaPx));
    surroundSelectionWithStyle("fontSize", next + "px");
    updateFontSizeIndicator();
  }
  function clearFormattingInSelection() {
    const sel = window.getSelection();
    if (!sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const frag = range.cloneContents();
    const div = document.createElement("div");
    div.appendChild(frag);
    const plain = div.textContent;
    range.deleteContents();
    range.insertNode(document.createTextNode(plain));
  }
  function updateFontSizeIndicator() {
    const sel = window.getSelection();
    let px = 16;
    if (sel && sel.rangeCount) {
      let node = sel.anchorNode;
      if (node && node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      if (node) px = toPx(getComputedStyle(node).fontSize);
    }
    const pt = Math.round((px * 72) / 96);
    fontSizeDisplay.textContent = String(pt);
  }

  // wire buttons
  document.querySelectorAll(".toggle[data-cmd]").forEach((btn) => {
    btn.addEventListener("click", () => {
      exec(btn.dataset.cmd);
      btn.classList.toggle("active");
      Coach.flags.formatted = true;
      Coach.advanceIfReady();
    });
  });
  document.querySelectorAll(".color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      exec("foreColor", btn.dataset.color);
      Coach.flags.formatted = true;
      Coach.advanceIfReady();
    });
  });
  document.getElementById("font-smaller").addEventListener("click", () => {
    changeFontSizeSelection(-2);
    Coach.flags.formatted = true;
    Coach.advanceIfReady();
  });
  document.getElementById("font-larger").addEventListener("click", () => {
    changeFontSizeSelection(+2);
    Coach.flags.formatted = true;
    Coach.advanceIfReady();
  });
  document
    .getElementById("reset-format")
    .addEventListener("click", clearFormattingInSelection);

  // stop all
  document.getElementById("stop-all").addEventListener("click", stopAll);

  // audio unlock
  function unlock() {
    if (Tone.context.state !== "running") Tone.start();
  }
  document.body.addEventListener("click", unlock, { once: true });
  document.body.addEventListener("keydown", unlock, { once: true });

  // toasts
  const toasts = document.getElementById("toasts");
  function toast(msg, ms = 2200) {
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    toasts.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // --- letter highlighting (single-letter pulse, auto unwrap) ---
  function getRangeForNthLetter(n) {
    const walker = document.createTreeWalker(page, NodeFilter.SHOW_TEXT, null);
    let node,
      count = 0;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue || "";
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (/[a-zA-Z]/.test(ch)) {
          if (count === n) {
            const r = document.createRange();
            r.setStart(node, i);
            r.setEnd(node, i + 1);
            return r;
          }
          count++;
        }
      }
    }
    return null;
  }
  function highlightLetterByIndex(n) {
    const r = getRangeForNthLetter(n);
    if (!r) return;
    const node = r.startContainer;
    const maybeSpan = node.parentElement;
    if (
      maybeSpan &&
      maybeSpan.classList &&
      maybeSpan.classList.contains("flash-char")
    ) {
      maybeSpan.classList.remove("flash-char");
      void maybeSpan.offsetWidth;
      maybeSpan.classList.add("flash-char");
      return;
    }
    const span = document.createElement("span");
    span.className = "flash-char";
    r.surroundContents(span);
    span.addEventListener(
      "animationend",
      () => {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
      },
      { once: true }
    );
  }
  function clearTempHighlights() {
    page.querySelectorAll(".flash-char").forEach((span) => {
      const parent = span.parentNode;
      while (span.firstChild) parent.insertBefore(span.firstChild, span);
      parent.removeChild(span);
    });
    page
      .querySelectorAll(".loop-pulse")
      .forEach((el) => el.classList.remove("loop-pulse"));
  }

  // --- parsing helpers ---
  const BASE_DUR = 0.34; // seconds per element
  const REST_DUR = 2.0;

  function stripQuoted(text) {
    return text.replace(/"[^"]*"/g, " ");
  }
  function findLoopBlocks(text) {
    const out = [];
    const re = /\[(.*?)\]/g;
    let m;
    while ((m = re.exec(text))) {
      out.push({ full: m[0], inside: m[1] });
    }
    return out;
  }
  function buildLetterEntries(container) {
    const letters = [];
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );
    let node;
    let globalIdx = 0;
    while ((node = walker.nextNode())) {
      const text = node.nodeValue || "";
      if (!text) continue;
      const parent = node.parentElement || container;
      const cs = getComputedStyle(parent);
      const style = {
        isBold:
          parseInt(cs.fontWeight, 10) >= 600 ||
          /^(B|STRONG)$/.test(parent.tagName),
        isItalic: cs.fontStyle === "italic" || /^(I|EM)$/.test(parent.tagName),
        isUnder:
          (cs.textDecorationLine || "").includes("underline") ||
          parent.tagName === "U",
        color: cs.color,
        fontSize: cs.fontSize,
      };
      for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (/[a-zA-Z]/.test(ch)) {
          letters.push({
            char: ch,
            style,
            node,
            offset: i,
            letterIndex: globalIdx,
          });
          globalIdx++;
        } else {
          letters.push({ char: ch, style, node, offset: i, letterIndex: null });
        }
      }
    }
    return letters;
  }
  function tokensFromTextAndLetters(snippet, letterEntries, startAt = 0) {
    const tokens = [];
    let iLetter = startAt;
    function nextStyledLetter() {
      while (iLetter < letterEntries.length) {
        const le = letterEntries[iLetter++];
        if (/[a-zA-Z]/.test(le.char)) return le;
      }
      return null;
    }
    const rawTokens = snippet
      .split(/(\s+|\/)/)
      .filter((t) => t.trim() !== "" || t === "/");
    for (const raw of rawTokens) {
      if (raw === "/") {
        tokens.push({ kind: "rest", dur: REST_DUR });
        continue;
      }
      const accent = raw.includes("!");
      const random = raw.includes("?");
      const lettersOnly = raw.replace(/[^a-zA-Z]/g, "");
      if (!lettersOnly) continue;

      if (lettersOnly.length === 1) {
        const src = nextStyledLetter();
        if (!src) continue;
        tokens.push({
          kind: "letter",
          letters: [
            {
              ch: random ? "?" : src.char,
              letterIndex: src.letterIndex,
              style: src.style,
            },
          ],
          accent,
          random,
          dur: BASE_DUR,
        });
      } else {
        const chordLetters = [];
        for (let k = 0; k < lettersOnly.length; k++) {
          const src = nextStyledLetter();
          if (!src) break;
          chordLetters.push({
            ch: random ? "?" : src.char,
            letterIndex: src.letterIndex,
            style: src.style,
          });
        }
        if (chordLetters.length) {
          tokens.push({
            kind: "chord",
            letters: chordLetters,
            accent,
            random,
            dur: BASE_DUR,
          });
        }
      }
    }
    return tokens;
  }
  function scheduleTokens(tokens, startTime) {
    let t = startTime;
    for (const tok of tokens) {
      if (tok.kind === "rest") {
        t += tok.dur;
        continue;
      }
      const sty = tok.letters[0]?.style || {};
      applyStyleToSound(sty);
      let vel = fontSizeToVelocity(sty.fontSize);
      if (tok.accent) vel = Math.min(1.0, vel + 0.2);

      if (tok.kind === "letter") {
        const l = tok.letters[0];
        const note =
          tok.random || l.ch === "?" ? randomNote() : letterToNote(l.ch);
        Tone.Draw.schedule(() => highlightLetterByIndex(l.letterIndex), t);
        synth.triggerAttackRelease(note, BASE_DUR, t, vel);
        t += BASE_DUR;
      } else {
        const notes = tok.letters.map((l) =>
          tok.random || l.ch === "?" ? randomNote() : letterToNote(l.ch)
        );
        const idxs = tok.letters.map((l) => l.letterIndex);
        Tone.Draw.schedule(
          () => idxs.forEach((i) => highlightLetterByIndex(i)),
          t
        );
        synth.triggerAttackRelease(notes, BASE_DUR, t, vel);
        t += BASE_DUR;
      }
    }
    return t - startTime;
  }

  // --- paragraphs + loops ---
  let activeLoops = {}; // { idx: [ {text, interval, el} ] }

  function getParagraphElements() {
    // treat any block child as a paragraph; if empty, use page as one
    const blocks = Array.from(page.children).filter((el) => el.nodeType === 1);
    if (blocks.length) return blocks;
    return [page];
  }

  function stopAll() {
    Object.values(activeLoops)
      .flat()
      .forEach((l) => clearInterval(l.interval));
    activeLoops = {};
    Tone.Transport.stop();
    synth.releaseAll();
    clearTempHighlights();
  }

  function playParagraphOnce(el) {
    const txt = el.innerText.trim();
    const letterEntries = buildLetterEntries(el);
    const playable = stripQuoted(txt); // include loops here (fine if it double-starts)
    const tokens = tokensFromTextAndLetters(playable, letterEntries, 0);
    if (!tokens.length) return;
    const start = Tone.now();
    scheduleTokens(tokens, start);
  }

  function pulseLoop(el) {
    el.classList.add("loop-pulse");
    setTimeout(() => el.classList.remove("loop-pulse"), 380);
  }

  function updateParagraphs() {
    const paras = getParagraphElements();

    paras.forEach((p, idx) => {
      const trimmed = (p.innerText || "").trim();

      // coach checks
      if (/\./.test(trimmed)) {
        Coach.flags.dotted = true;
        Coach.advanceIfReady();
      }
      if (/\[.*?\]/.test(trimmed) && trimmed.endsWith(".")) {
        Coach.flags.looped = true;
        Coach.advanceIfReady();
      }

      // only active if ends with '.'
      if (!trimmed.endsWith(".")) {
        if (activeLoops[idx]) {
          activeLoops[idx].forEach((l) => clearInterval(l.interval));
          delete activeLoops[idx];
        }
        return;
      }

      // first time → play once
      if (!activeLoops[idx]) {
        activeLoops[idx] = [];
        playParagraphOnce(p);
      }

      // manage loops
      const loops = findLoopBlocks(trimmed);

      // cleanup removed
      activeLoops[idx] = activeLoops[idx].filter((loopObj) => {
        const still = loops.some((lb) => lb.full === loopObj.text);
        if (!still) clearInterval(loopObj.interval);
        return still;
      });

      // start new
      loops.forEach((lb) => {
        if (activeLoops[idx].some((l) => l.text === lb.full)) return;

        const letters = buildLetterEntries(p);
        const inside = stripQuoted(lb.inside);
        const tokens = tokensFromTextAndLetters(inside, letters, 0);
        if (!tokens.length) return;

        const loopDur =
          tokens.reduce(
            (acc, t) => acc + (t.kind === "rest" ? t.dur : BASE_DUR),
            0
          ) || 0.2;

        const interval = setInterval(() => {
          pulseLoop(p);
          const start = Tone.now();
          scheduleTokens(tokens, start);
        }, loopDur * 1000);

        activeLoops[idx].push({ text: lb.full, interval, el: p });
      });
    });
  }

  // update on edits
  page.addEventListener("keyup", () => {
    updateParagraphs();
    maybeNudge();
  });

  // --- live typing: plays inside ( ... ) ---
  page.addEventListener("keydown", (e) => {
    const k = e.key;
    if (!/^[a-zA-Z?]$/.test(k) && k !== "/") return;
    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    const before = getTextBeforeCaret(sel);
    const insideLive = isInsideParens(before);
    if (!insideLive) return;

    let node =
      sel.anchorNode.nodeType === Node.TEXT_NODE
        ? sel.anchorNode.parentElement
        : sel.anchorNode;
    const cs = getComputedStyle(node);
    const style = {
      isBold:
        parseInt(cs.fontWeight, 10) >= 600 || /^(B|STRONG)$/.test(node.tagName),
      isItalic: cs.fontStyle === "italic" || /^(I|EM)$/.test(node.tagName),
      isUnder:
        (cs.textDecorationLine || "").includes("underline") ||
        node.tagName === "U",
      color: cs.color,
      fontSize: cs.fontSize,
    };

    applyStyleToSound(style);
    const vel = fontSizeToVelocity(style.fontSize);

    if (k === "/") {
      synth.releaseAll();
      return;
    } // rest = silence
    const note = k === "?" ? randomNote() : letterToNote(k);
    synth.triggerAttackRelease(note, BASE_DUR, undefined, vel);

    Coach.flags.liveTyped = true;
    Coach.advanceIfReady();
  });

  function getTextBeforeCaret(sel) {
    const range = sel.getRangeAt(0).cloneRange();
    range.setStart(page, 0);
    return range.toString();
  }
  function isInsideParens(textBefore) {
    const a = textBefore.lastIndexOf("(");
    const b = textBefore.lastIndexOf(")");
    return a > b;
  }

  // --- nudges ---
  let nudged = false;
  function maybeNudge() {
    if (nudged) return;
    const anyLetters = /[a-zA-Z]/.test(page.innerText || "");
    const anyDot = /\./.test(page.innerText || "");
    if (anyLetters && !anyDot) {
      nudged = true;
      setTimeout(() => toast('Tip: end a paragraph with "." to play it.'), 300);
    }
  }

  // --- stop all ---
  function stopAll() {
    Object.values(activeLoops)
      .flat()
      .forEach((l) => clearInterval(l.interval));
    activeLoops = {};
    Tone.Transport.stop();
    synth.releaseAll();
    clearTempHighlights();
  }

  // --- onboarding coach (gated) ---
  const coach = document.getElementById("coach");
  const coachBubble = document.getElementById("coach-bubble");

  const Coach = {
    step: 1,
    flags: {
      typed: false,
      dotted: false,
      looped: false,
      liveTyped: false,
      formatted: false,
    },
    show() {
      coach.classList.remove("hidden");
      coach.setAttribute("aria-hidden", "false");
      this.render();
    },
    hide() {
      coach.classList.add("hidden");
      coach.setAttribute("aria-hidden", "true");
    },
    render() {
      coachBubble.querySelectorAll(".coach-step").forEach((s) => {
        s.classList.toggle(
          "hidden",
          s.getAttribute("data-step") !== String(this.step)
        );
      });
    },
    advanceIfReady() {
      const s = this.step;
      if (s === 1 && this.flags.typed) this.step = 2;
      else if (s === 2 && this.flags.dotted) this.step = 3;
      else if (s === 3 && this.flags.looped) this.step = 4;
      else if (s === 4 && this.flags.liveTyped) this.step = 5;
      else if (s === 5 && this.flags.formatted) this.step = 6;
      this.render();
    },
  };

  coach.addEventListener("click", (e) => {
    if (e.target.closest("[data-skip]")) {
      Coach.step = Math.min(6, Coach.step + 1);
      Coach.render();
    }
    if (e.target.closest("[data-finish]")) {
      Coach.hide();
    }
  });

  // mark typed letters for step 1
  document.addEventListener("keydown", (e) => {
    if (/^[a-zA-Z]$/.test(e.key)) {
      Coach.flags.typed = true;
      Coach.advanceIfReady();
    }
  });

  // help → replay tutorial
  const replayBtn = document.getElementById("replay-tutorial");
  if (replayBtn)
    replayBtn.addEventListener("click", () => {
      Coach.step = 1;
      Coach.flags = {
        typed: false,
        dotted: false,
        looped: false,
        liveTyped: false,
        formatted: false,
      };
      Coach.show();
    });

  // always show tutorial on load
  Coach.show();

  // initial
  updateFontSizeIndicator();
  updateParagraphs();
});
