const WORDS = [
  { label: "ROT", value: "red" },
  { label: "BLAU", value: "blue" },
  { label: "GRUEN", value: "green" },
  { label: "GELB", value: "yellow" }
];
const COLORS = ["red", "blue", "green", "yellow"];
const TOTAL_ROUNDS = 2;

const introCard = document.getElementById("introCard");
const testCard = document.getElementById("testCard");
const roundBreakCard = document.getElementById("roundBreakCard");
const resultsCard = document.getElementById("resultsCard");
const startButton = document.getElementById("startButton");
const nextRoundButton = document.getElementById("nextRoundButton");
const restartButton = document.getElementById("restartButton");
const stroopWord = document.getElementById("stroopWord");
const timerValue = document.getElementById("timerValue");
const wordCountValue = document.getElementById("wordCountValue");
const trialValue = document.getElementById("trialValue");
const roundValue = document.getElementById("roundValue");
const breakRoundLabel = document.getElementById("breakRoundLabel");
const overallCorrect = document.getElementById("overallCorrect");
const overallIncorrect = document.getElementById("overallIncorrect");
const roundResults = document.getElementById("roundResults");
const answerButtons = Array.from(document.querySelectorAll(".color-button"));
const durationInputs = Array.from(document.querySelectorAll('input[name="duration"]'));

let testDeadline = 0;
let timerId = null;
let currentPrompt = null;
let currentPromptShownAt = 0;
let wordsCompleted = 0;
let incorrectCount = 0;
let attempts = [];
let testRunning = false;
let selectedDurationMs = 30000;
let currentRound = 1;
let roundHistory = [];
let recentPrompts = [];

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function getPrompt() {
  let nextPrompt = null;

  while (!nextPrompt) {
    const fontColor = randomItem(COLORS);
    const isCongruent = Math.random() < 0.5;
    let word = isCongruent
      ? WORDS.find((entry) => entry.value === fontColor)
      : randomItem(WORDS);

    if (!isCongruent) {
      while (word.value === fontColor) {
        word = randomItem(WORDS);
      }
    }

    const candidate = { label: word.label, wordValue: word.value, fontColor, isCongruent };
    const lastTwoPrompts = recentPrompts.slice(-2);
    const repeatedColorTwice =
      lastTwoPrompts.length === 2 &&
      lastTwoPrompts.every((prompt) => prompt.fontColor === candidate.fontColor);
    const repeatedWordTwice =
      lastTwoPrompts.length === 2 &&
      lastTwoPrompts.every((prompt) => prompt.wordValue === candidate.wordValue);

    if (!repeatedColorTwice && !repeatedWordTwice) {
      nextPrompt = candidate;
    }
  }

  return nextPrompt;
}

function showPrompt() {
  currentPrompt = getPrompt();
  recentPrompts.push(currentPrompt);
  if (recentPrompts.length > 2) {
    recentPrompts = recentPrompts.slice(-2);
  }
  currentPromptShownAt = performance.now();
  stroopWord.textContent = currentPrompt.label;
  stroopWord.style.color = currentPrompt.fontColor;
}

function updateStatsDisplay() {
  wordCountValue.textContent = String(wordsCompleted);
  trialValue.textContent = String(attempts.length + 1);
  roundValue.textContent = `${currentRound}/${TOTAL_ROUNDS}`;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(2)} S`;
}

function calculateAverage(trials) {
  if (trials.length === 0) {
    return 0;
  }

  const total = trials.reduce((sum, trial) => sum + trial.durationMs, 0);
  return total / trials.length;
}

function calculateAdjustedAverage(conditionAttempts) {
  const correctAttempts = conditionAttempts.filter((attempt) => attempt.isCorrect);
  const incorrectAttempts = conditionAttempts.filter((attempt) => !attempt.isCorrect);

  if (correctAttempts.length === 0) {
    return 0;
  }

  const baseAverage = calculateAverage(correctAttempts);
  const adjustedDivisor = Math.max(1, correctAttempts.length - incorrectAttempts.length);

  return (baseAverage * correctAttempts.length) / adjustedDivisor;
}

function resetRoundState() {
  wordsCompleted = 0;
  incorrectCount = 0;
  attempts = [];
  recentPrompts = [];
}

function setTestButtonsDisabled(disabled) {
  answerButtons.forEach((button) => {
    button.disabled = disabled;
  });
}

function hideAllCards() {
  introCard.classList.add("hidden");
  testCard.classList.add("hidden");
  roundBreakCard.classList.add("hidden");
  resultsCard.classList.add("hidden");
}

function updateTimer() {
  if (!testRunning) {
    return;
  }

  const remainingMs = Math.max(0, testDeadline - performance.now());
  timerValue.textContent = `${(remainingMs / 1000).toFixed(1)}S`;

  if (remainingMs <= 0) {
    endRound();
  }
}

function startRound() {
  const now = performance.now();
  testDeadline = now + selectedDurationMs;
  resetRoundState();
  testRunning = true;

  hideAllCards();
  testCard.classList.remove("hidden");
  setTestButtonsDisabled(false);

  updateStatsDisplay();
  showPrompt();
  updateTimer();

  clearInterval(timerId);
  timerId = setInterval(updateTimer, 100);
}

function startExperiment() {
  roundHistory = [];
  currentRound = 1;
  startRound();
}

function storeCurrentRound() {
  roundHistory.push({
    roundNumber: currentRound,
    correct: wordsCompleted,
    incorrect: incorrectCount,
    congruentAverageMs: calculateAdjustedAverage(
      attempts.filter((attempt) => attempt.isCongruent)
    ),
    incongruentAverageMs: calculateAdjustedAverage(
      attempts.filter((attempt) => !attempt.isCongruent)
    ),
    attempts: attempts.map((attempt) => ({ ...attempt }))
  });
}

function buildRoundResult(roundData) {
  const wrapper = document.createElement("section");
  wrapper.className = "round-result";

  const summary = document.createElement("div");
  summary.className = "round-summary";
  summary.innerHTML = `
    <div class="summary-box">
      <span class="summary-label">RUNDE</span>
      <strong class="summary-value">${roundData.roundNumber}</strong>
    </div>
    <div class="summary-box">
      <span class="summary-label">RICHTIG</span>
      <strong class="summary-value">${roundData.correct}</strong>
    </div>
    <div class="summary-box">
      <span class="summary-label">FALSCH</span>
      <strong class="summary-value">${roundData.incorrect}</strong>
    </div>
    <div class="summary-box">
      <span class="summary-label">KONGRUENT MITTEL</span>
      <strong class="summary-value">${formatSeconds(roundData.congruentAverageMs)}</strong>
    </div>
    <div class="summary-box">
      <span class="summary-label">INKONGRUENT MITTEL</span>
      <strong class="summary-value">${formatSeconds(roundData.incongruentAverageMs)}</strong>
    </div>
  `;

  const details = document.createElement("details");
  details.className = "results-details";

  const detailsSummary = document.createElement("summary");
  detailsSummary.textContent = `TABELLE FÜR RUNDE ${roundData.roundNumber} ANZEIGEN`;
  details.appendChild(detailsSummary);

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";

  const table = document.createElement("table");
  table.innerHTML = `
    <thead>
      <tr>
        <th>VERSUCH #</th>
        <th>GEZEIGTES WORT</th>
        <th>SCHRIFTFARBE</th>
        <th>DEINE ANTWORT</th>
        <th>ERGEBNIS</th>
        <th>BEDINGUNG</th>
        <th>ZEIT</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  const tbody = table.querySelector("tbody");

  roundData.attempts.forEach((attempt) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${attempt.attemptNumber}</td>
      <td>${attempt.label}</td>
      <td>${attempt.fontColor.toUpperCase()}</td>
      <td>${attempt.selectedColor.toUpperCase()}</td>
      <td>${attempt.isCorrect ? "✅" : "❌"}</td>
      <td>${attempt.isCongruent ? "KONGRUENT" : "INKONGRUENT"}</td>
      <td>${formatSeconds(attempt.durationMs)}</td>
    `;
    tbody.appendChild(row);
  });

  tableWrap.appendChild(table);
  details.appendChild(tableWrap);
  wrapper.appendChild(summary);
  wrapper.appendChild(details);

  return wrapper;
}

function renderFinalResults() {
  roundResults.innerHTML = "";

  roundHistory.forEach((roundData) => {
    roundResults.appendChild(buildRoundResult(roundData));
  });

  const totalCorrect = roundHistory.reduce((sum, roundData) => sum + roundData.correct, 0);
  const totalIncorrect = roundHistory.reduce((sum, roundData) => sum + roundData.incorrect, 0);

  overallCorrect.textContent = String(totalCorrect);
  overallIncorrect.textContent = String(totalIncorrect);
}

function endRound() {
  if (!testRunning) {
    return;
  }

  testRunning = false;
  clearInterval(timerId);
  timerId = null;
  timerValue.textContent = "0.0S";
  setTestButtonsDisabled(true);
  storeCurrentRound();

  hideAllCards();

  if (currentRound < TOTAL_ROUNDS) {
    breakRoundLabel.textContent = `RUNDE ${currentRound} ABGESCHLOSSEN`;
    roundBreakCard.classList.remove("hidden");
    currentRound += 1;
    return;
  }

  renderFinalResults();
  resultsCard.classList.remove("hidden");
}

function handleAnswer(selectedColor) {
  if (!testRunning) {
    return;
  }

  const now = performance.now();

  if (now >= testDeadline) {
    endRound();
    return;
  }

  const isCorrect = selectedColor === currentPrompt.fontColor;
  attempts.push({
    attemptNumber: attempts.length + 1,
    label: currentPrompt.label,
    fontColor: currentPrompt.fontColor,
    selectedColor,
    isCorrect,
    isCongruent: currentPrompt.isCongruent,
    durationMs: now - currentPromptShownAt
  });

  if (isCorrect) {
    wordsCompleted += 1;
  } else {
    incorrectCount += 1;
  }

  updateStatsDisplay();
  showPrompt();
}

startButton.addEventListener("click", startExperiment);
nextRoundButton.addEventListener("click", startRound);
restartButton.addEventListener("click", startExperiment);

durationInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) {
      selectedDurationMs = Number(input.value);
      timerValue.textContent = `${(selectedDurationMs / 1000).toFixed(1)}S`;
    }
  });
});

answerButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleAnswer(button.dataset.color);
  });
});
