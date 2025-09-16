// script.js
// Requires Tone.js (add <script src="https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js"></script> in HTML)

document.addEventListener("DOMContentLoaded", () => {
  const page = document.querySelector(".page");

  // Synth setup
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();

  // Map letters to frequencies (simple chromatic scale starting from A)
  const letterToFreq = {
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

  let currentWord = []; // buffer letters for arpeggio
  let activeNotes = {}; // track sustained notes

  // Play sustained note for a single letter
  function playLetter(letter) {
    const note = letterToFreq[letter.toLowerCase()];
    if (note) {
      synth.triggerAttack(note); // start note
      activeNotes[letter] = note;
      currentWord.push(note); // add to buffer
    }
  }

  // Release all notes
  function stopAll() {
    synth.releaseAll();
    activeNotes = {};
  }

  // Play buffered word as an arpeggio
  async function playArpeggio(wordNotes) {
    if (wordNotes.length === 0) return;

    let timeGap = 0.2; // seconds between notes
    for (let i = 0; i < wordNotes.length; i++) {
      synth.triggerAttackRelease(wordNotes[i], "8n", Tone.now() + i * timeGap);
    }
  }

  // Keydown listener
  page.addEventListener("keydown", (e) => {
    if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
      // Letter
      playLetter(e.key);
    } else if (e.key === " ") {
      // Space → play buffered arpeggio
      playArpeggio(currentWord);
      currentWord = [];
      e.preventDefault(); // avoid adding space twice
    } else if (e.key === "/") {
      // Slash → stop all notes
      stopAll();
      e.preventDefault();
    }
  });
});
