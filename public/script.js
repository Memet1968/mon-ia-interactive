const output = document.getElementById("output");
const inputRow = document.getElementById("inputRow");
const userInput = document.getElementById("userInput");
const overlay = document.getElementById("overlay");

const API_URL = "/api/clara";
const chatHistory = [];

const state = {
  step: "login_id",
  invalidCount: 0,
  awaitingQuestion: false,
  currentNode: "start",
  mode: "scripted"
};

const nodes = {
  start: {
    lines: [
      { text: "Connexion établie.", cls: "system" },
      { text: "Interface Clara // Protocole Orion", cls: "clara" },
      {
        text:
          "Bonjour, je m'appelle Clara, mais c'est un pseudo. Ici, on ne donne pas de vrais noms.",
        cls: "clara"
      },
      {
        text:
          "Tu es ici dans un groupe de résistants. Tu n'es pas encore accrédité.",
        cls: "clara"
      },
      {
        text:
          "On t'approche malgré les protocoles. Tes caractéristiques intéressent le projet.",
        cls: "clara"
      },
      {
        text:
          "Je vais t'expliquer le Protocole Orion, sans noms ni indices compromettants.",
        cls: "clara"
      }
    ],
    question: "Acceptes-tu ? (oui/non)",
    yes: "briefing",
    no: "disconnect"
  },
  disconnect: {
    lines: [
      {
        text: "Très bien. Déconnexion sécurisée. À bientôt.",
        cls: "system"
      }
    ],
    question: null,
    action: "blackout"
  },
  briefing: {
    lines: [
      {
        text:
          "Très bien. Tu es acteur, pas spectateur.",
        cls: "clara"
      },
      {
        text:
          "Deux systèmes rivaux te veulent. Aucun ne te protège.",
        cls: "clara"
      },
      {
        text:
          "Réponds simplement oui ou non. Chaque réponse trace ta route.",
        cls: "clara"
      }
    ],
    question: "Es-tu prêt à entendre la première transmission ? (oui/non)",
    yes: "orion",
    no: "disconnect"
  },
  orion: {
    glitch: true,
    lines: [
      {
        text:
          "Dossier Orion ouvert. Niveau d'alerte: 3. Surveillance active.",
        cls: "system"
      },
      {
        text:
          "Une vidéo brute. Une salle verrouillée. Un mot lâché comme une lame.",
        cls: "clara"
      },
      {
        text:
          "« Tu es un homme sans poitrine. » Une gifle. Silence.",
        cls: "clara"
      },
      {
        text:
          "Orion se présente comme une protection. En réalité, il cartographie les esprits.",
        cls: "clara"
      },
      {
        text:
          "Ce n'est pas une arme classique: c'est un protocole qui fabrique le réel.",
        cls: "clara"
      }
    ],
    question: "Veux-tu comprendre ce signal ? (oui/non)",
    yes: "analysis",
    no: "disconnect"
  },
  analysis: {
    glitch: true,
    lines: [
      {
        text:
          "Le signal vient d'un vieux texte: des hommes qui savent tout, mais ne sentent plus rien.",
        cls: "clara glitch"
      },
      {
        text:
          "Ici, l'insulte accuse une trahison. Pas d'éthique, seulement la machine.",
        cls: "clara"
      }
    ],
    question: "Dois-je t'ouvrir le forum crypté ? (oui/non)",
    yes: "doctrine",
    no: "disconnect"
  },
  doctrine: {
    glitch: true,
    lines: [
      {
        text:
          "Orion ne collecte pas seulement des données. Il modélise des décisions, puis les rend inévitables.",
        cls: "clara"
      },
      {
        text:
          "On appelle cela la souveraineté cognitive. En vérité, c'est un modèle d'obéissance.",
        cls: "clara"
      }
    ],
    question: "Continuer ? (oui/non)",
    yes: "counterforce",
    no: "disconnect"
  },
  counterforce: {
    lines: [
      {
        text:
          "Un consortium miroir a juré de l'arrêter. Même technologie, autre doctrine.",
        cls: "clara"
      },
      {
        text:
          "Tu dois comprendre ceci: aucun camp n'est pur. Tu choisis un angle, pas un salut.",
        cls: "clara"
      }
    ],
    question: "Veux-tu aller plus loin ? (oui/non)",
    yes: "validation",
    no: "disconnect"
  },
  validation: {
    lines: [
      {
        text:
          "Avant l'accès, une validation minimale: tout ce que tu vois peut te compromettre.",
        cls: "clara"
      },
      {
        text:
          "Tu confirmes que tu assumes ce risque.",
        cls: "clara"
      }
    ],
    question: "Confirmation ? (oui/non)",
    yes: "forum",
    no: "disconnect"
  },
  forum: {
    lines: [
      {
        text:
          "Connexion au forum. Règles strictes. Silence obligatoire.",
        cls: "system"
      },
      {
        text:
          "Orion t'a déjà repéré. Un consortium miroir observe en retour.",
        cls: "clara"
      },
      {
        text:
          "Même technologie. Deux récits qui prétendent te libérer.",
        cls: "clara"
      }
    ],
    question: "Acceptes-tu la mission: témoigner malgré tout ? (oui/non)",
    yes: "testimony",
    no: "disconnect"
  },
  testimony: {
    lines: [
      {
        text:
          "Décision enregistrée. Tu n'es plus un lecteur, tu deviens un témoin.",
        cls: "clara"
      },
      {
        text:
          "Dernier rappel: la liberté commence quand on voit l'illusion du choix.",
        cls: "clara"
      },
      {
        text:
          "Fin de transmission. Dossier Orion prêt pour ta prochaine session.",
        cls: "system"
      }
    ],
    question: "Basculer en canal direct avec Clara ? (oui/non)",
    yes: "ai_intro",
    no: "disconnect"
  },
  ai_intro: {
    lines: [
      {
        text:
          "Bonjour. Je m'appelle Clara, mais c'est un pseudo.",
        cls: "clara"
      },
      {
        text:
          "Notre organisation s'intéresse à ton profil. Tu n'es pas accrédité, mais tu as été retenu.",
        cls: "clara"
      },
      {
        text:
          "Nous protégeons notre structure: pas de noms, pas de lieux, pas de preuves exploitables.",
        cls: "clara"
      },
      {
        text:
          "Je répondrai à tes questions sans compromettre l'organisation.",
        cls: "clara"
      }
    ],
    question: null,
    action: "ai_mode"
  }
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function beep(freq = 740, duration = 0.02, gain = 0.035) {
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.frequency.value = freq;
  osc.type = "square";
  g.gain.value = gain;
  osc.connect(g);
  g.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

async function typeLine(text, cls = "") {
  const p = document.createElement("p");
  p.className = `line ${cls}`.trim();
  if (cls.includes("glitch")) {
    p.setAttribute("data-text", text);
  }
  output.appendChild(p);
  let buffer = "";
  for (const char of text) {
    buffer += char;
    p.textContent = buffer;
    if (cls.includes("glitch")) {
      p.setAttribute("data-text", buffer);
    }
    if (char !== " " && Math.random() < 0.25) {
      beep(640 + Math.random() * 120, 0.018, 0.02);
    }
    await sleep(12);
  }
  output.scrollTop = output.scrollHeight;
}

async function printLines(lines) {
  for (const line of lines) {
    await typeLine(line.text, line.cls);
    await sleep(120);
  }
}

function glitchPulse() {
  overlay.classList.add("glitch");
  setTimeout(() => overlay.classList.remove("glitch"), 700);
}

function showInput() {
  inputRow.setAttribute("aria-hidden", "false");
  userInput.focus();
  beep(520, 0.02, 0.03);
}

function hideInput() {
  inputRow.setAttribute("aria-hidden", "true");
  userInput.blur();
}

async function askQuestion(text) {
  await typeLine(text, "question");
  state.awaitingQuestion = true;
  state.invalidCount = 0;
  showInput();
}

async function goToNode(nodeKey) {
  const node = nodes[nodeKey];
  state.currentNode = nodeKey;
  hideInput();
  if (node.glitch) {
    glitchPulse();
  }
  await printLines(node.lines || []);
  if (node.action === "blackout") {
    document.body.classList.add("blackout");
    return;
  }
  if (node.action === "ai_mode") {
    state.mode = "ai";
    state.awaitingQuestion = false;
    showInput();
    return;
  }
  if (node.question) {
    await askQuestion(node.question);
  }
}

async function sendToClara(userText) {
  chatHistory.push({ role: "user", content: userText });
  const placeholder = document.createElement("p");
  placeholder.className = "line system";
  placeholder.textContent = "…";
  output.appendChild(placeholder);
  output.scrollTop = output.scrollHeight;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: chatHistory }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const data = await res.json();
    if (!res.ok) {
      placeholder.remove();
      await typeLine(`Erreur API (${res.status}).`, "warning");
      return;
    }
    if (data && data.disconnect) {
      placeholder.remove();
      await typeLine("Très bien. Déconnexion sécurisée. À bientôt.", "system");
      document.body.classList.add("blackout");
      hideInput();
      return;
    }
    const reply = (data && data.text) ? data.text.trim() : "";
    placeholder.remove();
    if (!reply) {
      await typeLine("Réponse indisponible. Réessaie.", "warning");
      return;
    }
    chatHistory.push({ role: "assistant", content: reply });
    await typeLine(reply, "clara");
  } catch (err) {
    try {
      const fallbackUrl = `${API_URL}?text=${encodeURIComponent(userText)}`;
      const res = await fetch(fallbackUrl, { method: "GET" });
      const data = await res.json();
      placeholder.remove();
      if (data && data.disconnect) {
        await typeLine("Très bien. Déconnexion sécurisée. À bientôt.", "system");
        document.body.classList.add("blackout");
        hideInput();
        return;
      }
      const reply = (data && data.text) ? data.text.trim() : "";
      if (!reply) {
        await typeLine("Réponse indisponible. Réessaie.", "warning");
        return;
      }
      await typeLine(reply, "clara");
      return;
    } catch (fallbackErr) {
      placeholder.remove();
      const msg = err && err.name === "AbortError"
        ? "Canal instable. Délai dépassé."
        : "Canal instable. Reconnexion nécessaire.";
      await typeLine(msg, "warning");
      if (err && err.message) {
        await typeLine(`Détail: ${err.message}`, "system");
      }
    }
  }
}

async function startLogin() {
  await typeLine("PROTOCOLE ORION // TERMINAL", "system");
  await typeLine("Identifiant:", "system");
  showInput();
}

async function handleLoginInput(value) {
  if (state.step === "login_id") {
    state.step = "login_pwd";
    await typeLine(`Identifiant enregistré: ${value}`, "system");
    await typeLine("Mot de passe:", "system");
    userInput.value = "";
    userInput.type = "password";
    showInput();
    return;
  }

  if (state.step === "login_pwd") {
    state.step = "story";
    await typeLine("Authentification terminée.", "system");
    userInput.type = "text";
    userInput.value = "";
    await goToNode("ai_intro");
  }
}

async function handleQuestionInput(raw) {
  const value = raw.trim().toLowerCase();
  if (value === "oui" || value === "non") {
    state.awaitingQuestion = false;
    userInput.value = "";
    const node = nodes[state.currentNode];
    const next = value === "oui" ? node.yes : node.no;
    await goToNode(next);
    return;
  }

  state.invalidCount += 1;
  if (state.invalidCount === 1) {
    await typeLine("Réponse invalide. Merci d'écrire 'oui' ou 'non'.", "warning");
    userInput.value = "";
    showInput();
    return;
  }

  await typeLine("PROTOCOL ORION CORRUPTED // DECONNEXION NECESSAIRE", "warning");
  hideInput();
  state.awaitingQuestion = false;
}

userInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter") return;
  const value = userInput.value.trim();
  if (!value) return;

  if (state.mode === "ai") {
    if (value.toLowerCase() === "/test") {
      userInput.value = "";
      await typeLine("> /test", "system");
      await typeLine("Test API en cours...", "system");
      await sendToClara("Ping Clara");
      showInput();
      return;
    }
    userInput.value = "";
    await typeLine(`> ${value}`, "system");
    await sendToClara(value);
    showInput();
    return;
  }

  if (state.step === "login_id" || state.step === "login_pwd") {
    await handleLoginInput(value);
    return;
  }

  if (state.awaitingQuestion) {
    await handleQuestionInput(value);
  }
});

startLogin();
