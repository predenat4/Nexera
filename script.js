let progress = 0;

function completeChallenge() {
  if(progress < 7) {
    progress++;
    document.getElementById("progress").innerText = progress + "/7";
  }
}

function openDoc(https://1drv.ms/f/c/7844ade51013195e/IgAWbHE_bOwKRpGbKetmCfiPASCNrGggcAiGg3uZZIvT22o?e=9puU9e) {
  alert("Document ouvert ! Ajoute ton texte ici.");
}
}

// LIFE GAME
function lifeChoice(choice) {
  if (choice === "retry") {
    document.getElementById("gameResult").innerText = "Mentalité forte. Tu évolues.";
  } else {
    document.getElementById("gameResult").innerText = "Abandonner est aussi une réponse, mais pas une croissance.";
  }
}

// JOURNAL
function saveJournal() {
  const text = document.getElementById("journalInput").value;
  localStorage.setItem("journal", text);
  alert("Sauvegardé");
}

function loadJournal() {
  const text = localStorage.getItem("journal");
  document.getElementById("journalDisplay").innerText = text || "Aucun texte";
}

// QUESTIONS INTROSPECTIVES
const questions = [
  "Qu'est-ce que tu évites en ce moment ?",
  "Qu'est-ce qui te bloque vraiment ?",
  "Qui veux-tu devenir ?",
  "Est-ce que tu vis ou tu existes ?"
];

function newQuestion() {
  const q = questions[Math.floor(Math.random() * questions.length)];
  document.getElementById("questionBox").innerText = q;
}

// DOCUMENTS
function openDoc(type) {
  alert("Ouverture du document: " + type);
}


