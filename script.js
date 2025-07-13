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

// Count legal deliveries in an over
function countLegalInOver(arr) {
  return arr.filter(v => v !== "WD" && v !== "NB").length;
}

// Update all displays
function updateDisplay() {
  const scoreEl = document.getElementById("score");
  scoreEl.textContent = totalScore;
  scoreEl.classList.remove("score-flash");
  void scoreEl.offsetWidth;
  scoreEl.classList.add("score-flash");

  document.getElementById("overs").textContent = `${overHistory.length}.${currentLegalBalls}`;

  const totalDel = overHistory.length * legalBallsPerOver + currentLegalBalls;
  document.getElementById("runRate").textContent =
    totalDel > 0 ? (totalScore / (totalDel / 6)).toFixed(2) : "0.00";

  const wEl = document.getElementById("wickets");
  wEl.textContent = wEl.dataset.value || "0";

  // Target logic
  if (targetRuns !== null && targetBalls !== null) {
    const remBalls = targetBalls - totalDel;
    const remRuns = targetRuns - totalScore;
    let msg = remRuns <= 0
      ? "You own the match"
      : remBalls <= 0
        ? "You lost the match"
        : `Need ${remRuns} runs in ${remBalls} balls`;
    document.getElementById("targetDisplay").textContent = msg;
  }

  // Ball indicators
  const ballsIndicator = document.getElementById("ballsIndicator");
  ballsIndicator.innerHTML = "";
  const displayCount = Math.max(legalBallsPerOver, currentOver.length);
  for (let i = 0; i < displayCount; i++) {
    const b = document.createElement("div");
    b.className = "ball";
    if (i < currentOver.length) {
      const val = currentOver[i];
      if (val === "WD" || val === "NB") b.classList.add("extra-ball");
      b.innerHTML = val;
      b.classList.add("pop");
    }
    ballsIndicator.appendChild(b);
  }

  // Over-wise history
  const overwise = document.getElementById("overwiseScore");
  overwise.innerHTML = "";
  overHistory.forEach((ov, idx) => {
    const d = document.createElement("div");
    d.className = "over";
    let txt = `Over ${idx + 1}: `;
    ov.forEach(x => (txt += `<span class="ball-record">${x}</span>`));
    d.innerHTML = txt;
    overwise.appendChild(d);
  });
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

  const wEl = document.getElementById("wickets");
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
      const wEl = document.getElementById("wickets");
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
  const wEl = document.getElementById("wickets");
  wEl.dataset.value = "0";
  wEl.textContent = "0";
  historyStack.length = 0;
  targetRuns = targetBalls = null;
  document.getElementById("targetRuns").value = "";
  document.getElementById("targetBalls").value = "";
  document.getElementById("targetDisplay").textContent = "";
  updateDisplay();
}

// Set target
document.getElementById("setTarget").addEventListener("click", () => {
  const r = document.getElementById("targetRuns").value;
  const b = document.getElementById("targetBalls").value;
  if (r && b) {
    targetRuns = parseInt(r);
    targetBalls = parseInt(b);
    updateDisplay();
  }
});

// Initial render
updateDisplay();
