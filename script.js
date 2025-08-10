"use strict";

// State variables
let totalScore = 0;
let totalLegalBalls = 0;
const legalBallsPerOver = 6;
let currentOver = [];
let overHistory = [];
let currentLegalBalls = 0;

// Targets
let targetRuns = null;
let targetBalls = null;

// Undo history
const historyStack = [];

// Cache DOM references to minimize repeated lookups
const dom = {
  score: document.getElementById("score"),
  overs: document.getElementById("overs"),
  runRate: document.getElementById("runRate"),
  wickets: document.getElementById("wickets"),
  targetDisplay: document.getElementById("targetDisplay"),
  ballsIndicator: document.getElementById("ballsIndicator"),
  overwiseScore: document.getElementById("overwiseScore"),
  targetRunsInput: document.getElementById("targetRuns"),
  targetBallsInput: document.getElementById("targetBalls"),
  setTargetBtn: document.getElementById("setTarget"),
};

let lastRenderedScore = 0;

// Count legal deliveries in an over
function countLegalInOver(arr) {
  return arr.filter(v => v !== "WD" && v !== "NB").length;
}

// Update all displays
function updateDisplay() {
  const scoreEl = dom.score;
  if (lastRenderedScore !== totalScore) {
    scoreEl.textContent = totalScore;
    scoreEl.classList.remove("score-flash");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("score-flash");
    lastRenderedScore = totalScore;
  } else {
    scoreEl.textContent = totalScore;
  }

  dom.overs.textContent = `${overHistory.length}.${currentLegalBalls}`;

  const totalDel = overHistory.length * legalBallsPerOver + currentLegalBalls;
  dom.runRate.textContent =
    totalDel > 0 ? (totalScore / (totalDel / 6)).toFixed(2) : "0.00";

  const wEl = dom.wickets;
  wEl.textContent = wEl.dataset.value || "0";

  // Target logic
  if (targetRuns !== null && targetBalls !== null) {
    const remBalls = targetBalls - totalDel;
    const remRuns = targetRuns - totalScore;
    const msg = remRuns <= 0
      ? "You own the match"
      : remBalls <= 0
        ? "You lost the match"
        : `Need ${remRuns} runs in ${remBalls} balls`;
    dom.targetDisplay.textContent = msg;
  }

  // Ball indicators
  const ballsIndicator = dom.ballsIndicator;
  ballsIndicator.textContent = "";
  const displayCount = Math.max(legalBallsPerOver, currentOver.length);
  const ballsFragment = document.createDocumentFragment();
  for (let i = 0; i < displayCount; i++) {
    const b = document.createElement("div");
    b.className = "ball";
    if (i < currentOver.length) {
      const val = currentOver[i];
      if (val === "WD" || val === "NB") b.classList.add("extra-ball");
      b.innerHTML = val;
      b.classList.add("pop");
    }
    ballsFragment.appendChild(b);
  }
  ballsIndicator.appendChild(ballsFragment);

  // Over-wise history
  const overwise = dom.overwiseScore;
  overwise.textContent = "";
  const overFragment = document.createDocumentFragment();
  overHistory.forEach((ov, idx) => {
    const d = document.createElement("div");
    d.className = "over";
    let txt = `Over ${idx + 1}: `;
    ov.forEach(x => (txt += `<span class="ball-record">${x}</span>`));
    d.innerHTML = txt;
    overFragment.appendChild(d);
  });
  overwise.appendChild(overFragment);
}

// Legal ball
function addLegalBall(runs) {
  totalScore += runs;
  totalLegalBalls++;
  currentLegalBalls++;
  currentOver.push(runs === 0 ? "0" : runs);
  historyStack.push({ type: "legal", runs, wicket: false });

  if (currentLegalBalls === legalBallsPerOver) {
    overHistory.push([...currentOver]);
    currentOver = [];
    currentLegalBalls = 0;
  }
  updateDisplay();
}

// Extras
function addExtra(type) {
  if (currentLegalBalls === legalBallsPerOver) {
    overHistory.push([...currentOver]);
    currentOver = [];
    currentLegalBalls = 0;
  }
  totalScore++;
  const code = type.toUpperCase();
  currentOver.push(code);
  historyStack.push({ type: "extra", extraType: type });
  updateDisplay();
}

// Wicket
function addWicket() {
  totalLegalBalls++;
  currentLegalBalls++;
  currentOver.push('<span style="color:#E74C3C;">W</span>');

  const wEl = dom.wickets;
  const newW = parseInt(wEl.dataset.value || "0") + 1;
  wEl.dataset.value = newW;
  wEl.textContent = newW;

  historyStack.push({ type: "legal", runs: 0, wicket: true });

  if (currentLegalBalls === legalBallsPerOver) {
    overHistory.push([...currentOver]);
    currentOver = [];
    currentLegalBalls = 0;
  }
  updateDisplay();
}

// Undo
function undo() {
  if (!historyStack.length) return;
  const last = historyStack.pop();

  if (last.type === "legal") {
    totalLegalBalls--;
    if (last.wicket) {
      const wEl = dom.wickets;
      const w = parseInt(wEl.dataset.value || "0") - 1;
      wEl.dataset.value = w;
      wEl.textContent = w;
    } else {
      totalScore -= last.runs;
    }

    if (currentOver.length) {
      currentOver.pop();
      currentLegalBalls = countLegalInOver(currentOver);
    } else if (overHistory.length) {
      currentOver = overHistory.pop();
      currentOver.pop();
      currentLegalBalls = countLegalInOver(currentOver);
    }
  } else {
    totalScore--;
    if (currentOver.length) currentOver.pop();
    else if (overHistory.length) {
      currentOver = overHistory.pop();
      currentOver.pop();
    }
  }
  updateDisplay();
}

// Reset with confirmation
function confirmReset() {
  if (confirm("Are you sure you want to reset the match?")) {
    resetMatch();
  }
}

function resetMatch() {
  totalScore = 0;
  totalLegalBalls = 0;
  currentOver = [];
  overHistory = [];
  currentLegalBalls = 0;
  const wEl = dom.wickets;
  wEl.dataset.value = "0";
  wEl.textContent = "0";
  historyStack.length = 0;
  targetRuns = targetBalls = null;
  dom.targetRunsInput.value = "";
  dom.targetBallsInput.value = "";
  dom.targetDisplay.textContent = "";
  updateDisplay();
}

// Set target
dom.setTargetBtn.addEventListener("click", () => {
  const r = dom.targetRunsInput.value;
  const b = dom.targetBallsInput.value;
  if (r && b) {
    targetRuns = parseInt(r);
    targetBalls = parseInt(b);
    updateDisplay();
  }
});

// Initial render
updateDisplay();
