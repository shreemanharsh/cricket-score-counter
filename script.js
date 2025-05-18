"use strict";

// State variables
let totalScore = 0;
let totalLegalBalls = 0; // Total legal deliveries over the match
const legalBallsPerOver = 6;
let currentOver = [];     // Records events for the current over
let overHistory = [];     // Completed overs stored as arrays
let currentLegalBalls = 0; // Count of legal deliveries in the current over

// Target values (if set)
let targetRuns = null;
let targetBalls = null;

// History stack for the undo function
const historyStack = [];

// Helper: Count legal (non-extra) events in an array
function countLegalInOver(overArray) {
  let count = 0;
  for (let event of overArray) {
    if (event === "WD" || event === "NB") continue;
    count++;
  }
  return count;
}

// Function to update all displays
function updateDisplay() {
  // Update overall score
  document.getElementById("score").textContent = totalScore;
  
  // Update overs as: (completed overs) . (legal deliveries in current over)
  document.getElementById("overs").textContent = `${overHistory.length}.${currentLegalBalls}`;
  
  // Calculate run rate: score divided by (total legal deliveries / 6)
  let totalLegalDeliveries = overHistory.length * legalBallsPerOver + currentLegalBalls;
  let runRate = totalLegalDeliveries > 0 ? (totalScore / (totalLegalDeliveries / 6)).toFixed(2) : "0.00";
  document.getElementById("runRate").textContent = runRate;
  
  // Update wickets display (using dataset)
  let wicketEl = document.getElementById("wickets");
  wicketEl.textContent = wicketEl.dataset.value || "0";
  
  // Update target display if a target is set
  if (targetRuns !== null && targetBalls !== null) {
    let remainingBalls = targetBalls - totalLegalDeliveries;
    let remainingRuns = targetRuns - totalScore;
    let message = "";
    if (remainingRuns <= 0) {
      message = "You own the match";
    } else if (remainingBalls <= 0) {
      message = "You lost the match";
    } else {
      message = `Need ${remainingRuns} runs in ${remainingBalls} balls`;
    }
    document.getElementById("targetDisplay").textContent = message;
  }
  
  // Update current over ball indicators
  const ballsIndicator = document.getElementById("ballsIndicator");
  ballsIndicator.innerHTML = "";
  // Display at least 6 circles or more if extras exist
  let displayCount = Math.max(legalBallsPerOver, currentOver.length);
  for (let i = 0; i < displayCount; i++) {
    const ballDiv = document.createElement("div");
    ballDiv.className = "ball";
    if (i < currentOver.length) {
      let ballValue = currentOver[i];
      if (ballValue === "WD" || ballValue === "NB") {
        ballDiv.classList.add("extra-ball");
      }
      ballDiv.innerHTML = ballValue;
    }
    ballsIndicator.appendChild(ballDiv);
  }
  
  // Update over-wise scorecard (displayed below controls)
  const overwiseScoreDiv = document.getElementById("overwiseScore");
  overwiseScoreDiv.innerHTML = "";
  overHistory.forEach((over, index) => {
    const overDiv = document.createElement("div");
    overDiv.className = "over";
    let overDisplay = `Over ${index + 1}: `;
    over.forEach(ball => {
      overDisplay += `<span class="ball-record">${ball}</span>`;
    });
    overDiv.innerHTML = overDisplay;
    overwiseScoreDiv.appendChild(overDiv);
  });
}

// ----- Scoring Action Functions -----

// Legal ball action: records a legal delivery (dot ball is denoted as "0")
function addLegalBall(runs) {
  totalScore += runs;
  totalLegalBalls++;
  currentLegalBalls++;
  currentOver.push(runs === 0 ? "0" : runs);
  
  historyStack.push({
    type: "legal",
    runs: runs,
    wicket: false
  });
  
  // Flush the current over if 6 legal deliveries are reached
  if (currentLegalBalls === legalBallsPerOver) {
    overHistory.push([...currentOver]);
    currentOver = [];
    currentLegalBalls = 0;
  }
  
  updateDisplay();
}

// Extra ball action: wide ("WD") or no ball ("NB") – adds 1 run without being legal
function addExtra(type) {
  // If current over already has 6 legal deliveries, flush it first.
  if (currentLegalBalls === legalBallsPerOver) {
    overHistory.push([...currentOver]);
    currentOver = [];
    currentLegalBalls = 0;
  }
  
  totalScore += 1;
  let extraNotation = (type === "wd") ? "WD" : "NB";
  currentOver.push(extraNotation);
  
  historyStack.push({
    type: "extra",
    extraType: type
  });
  
  updateDisplay();
}

// Wicket action: counts as a legal delivery (no runs added)
function addWicket() {
  totalLegalBalls++;
  currentLegalBalls++;
  currentOver.push('<span style="color:#E74C3C;">W</span>');
  
  let wicketEl = document.getElementById("wickets");
  let currWickets = parseInt(wicketEl.dataset.value || "0") + 1;
  wicketEl.dataset.value = currWickets;
  wicketEl.textContent = currWickets;
  
  historyStack.push({
    type: "legal",
    runs: 0,
    wicket: true
  });
  
  if (currentLegalBalls === legalBallsPerOver) {
    overHistory.push([...currentOver]);
    currentOver = [];
    currentLegalBalls = 0;
  }
  
  updateDisplay();
}

// Undo the last action (legal or extra)
function undo() {
  if (historyStack.length === 0) return;
  
  const lastAction = historyStack.pop();
  
  if (lastAction.type === "legal") {
    totalLegalBalls--;
    if (lastAction.wicket) {
      let wicketEl = document.getElementById("wickets");
      let currWickets = parseInt(wicketEl.dataset.value || "0") - 1;
      wicketEl.dataset.value = currWickets;
      wicketEl.textContent = currWickets;
    } else {
      totalScore -= lastAction.runs;
    }
    if (currentOver.length > 0) {
      let removed = currentOver.pop();
      if (removed !== "WD" && removed !== "NB") {
        currentLegalBalls = countLegalInOver(currentOver);
      }
    } else if (overHistory.length > 0) {
      currentOver = overHistory.pop();
      currentOver.pop();
      currentLegalBalls = countLegalInOver(currentOver);
    }
  } else if (lastAction.type === "extra") {
    totalScore -= 1;
    if (currentOver.length > 0) {
      currentOver.pop();
    } else if (overHistory.length > 0) {
      currentOver = overHistory.pop();
      currentOver.pop();
    }
  }
  
  updateDisplay();
}

// Reset the entire match state
function resetMatch() {
  totalScore = 0;
  totalLegalBalls = 0;
  currentOver = [];
  overHistory = [];
  currentLegalBalls = 0;
  
  let wicketEl = document.getElementById("wickets");
  wicketEl.dataset.value = "0";
  wicketEl.textContent = "0";
  historyStack.length = 0;
  
  targetRuns = null;
  targetBalls = null;
  
  document.getElementById("targetRuns").value = "";
  document.getElementById("targetBalls").value = "";
  document.getElementById("targetDisplay").textContent = "";
  
  updateDisplay();
}

// ----- Target Setting Feature -----
document.getElementById("setTarget").addEventListener("click", function () {
  const targetRunsInput = document.getElementById("targetRuns").value;
  const targetBallsInput = document.getElementById("targetBalls").value;
  
  if (targetRunsInput && targetBallsInput) {
    targetRuns = parseInt(targetRunsInput);
    targetBalls = parseInt(targetBallsInput);
    updateDisplay();
  }
});
