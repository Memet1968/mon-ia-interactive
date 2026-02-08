const output = document.getElementById("output");
const inputRow = document.getElementById("inputRow");
const userInput = document.getElementById("userInput");
const overlay = document.getElementById("overlay");

const API_URL = "/api/clara";
const chatHistory = [];

const state = {
  step: "login_id",
  mode: "login",
  busy: false,
  phase: "recrutement"
};

const introLines = [
  { text: "Connexion établie.", cls: "system" },
  { text: "Interface Clara // Protocole Orion", cls: "clara" },
  { text: "Statut narratif: PHASE 1 // RECRUTEMENT", cls: "system" },
  {
    text: "Bonjour. Je m'appelle Clara, mais c'est un pseudo.",
    cls: "clara"
  },
  {
    text: "Ton profil nous intéresse.",
    cls: "clara"
  },
  {
    text: "Notre organisation lutte contre Orion. Orion n'est pas un programme de sécurité. C'est un protocole mondial d'aliénation cognitive.",
    cls: "clara glitch"
  },
  {
    text: "Ils mesurent les comportements, orientent les choix, puis imposent des décisions présentées comme naturelles.",
    cls: "clara"
  },
  {
    text: "Menshen prétend s'y opposer, mais c'est une autre architecture de contrôle.",
    cls: "clara"
  },
  {
    text: "Nous recrutons des témoins capables d'observer, de documenter et de transmettre des preuves.",
    cls: "clara"
  },
  {
    text: "Canal officiel: bibliothecaire@protocoleorion2032.org",
    cls: "system"
  },
  {
    text: "Je vais t'évaluer. Souhaites-tu en savoir plus ?",
    cls: "clara"
  }
];

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

async function onAssistantReply(reply) {
  const lower = reply.toLowerCase();

  if (state.phase === "recrutement" && (lower.includes("acceptes") || lower.includes("participer") || lower.includes("rejoins"))) {
    state.phase = "evaluation";
    await typeLine("Statut narratif: PHASE 2 // EVALUATION", "system");
  } else if (state.phase === "evaluation" && (lower.includes("premiere mission") || lower.includes("première mission") || lower.includes("transmets"))) {
    state.phase = "mission";
    await typeLine("Statut narratif: PHASE 3 // PREMIERE MISSION", "system");
  }
}

async function sendToClara(userText) {
  chatHistory.push({ role: "user", content: userText });

  const placeholder = document.createElement("p");
  placeholder.className = "line system";
  placeholder.textContent = "...";
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
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      placeholder.remove();
      const detail = data && data.detail ? String(data.detail) : "";
      await typeLine(`Erreur API (${res.status}).`, "warning");
      if (detail) {
        await typeLine(`Detail: ${detail}`, "system");
      }
      return;
    }

    if (data && data.disconnect) {
      placeholder.remove();
      await typeLine("Tres bien. Deconnexion securisee. A bientot.", "system");
      document.body.classList.add("blackout");
      hideInput();
      return;
    }

    const reply = data && data.text ? data.text.trim() : "";
    placeholder.remove();

    if (!reply) {
      await typeLine("Reponse indisponible. Reessaie.", "warning");
      return;
    }

    chatHistory.push({ role: "assistant", content: reply });
    await typeLine(reply, "clara");
    await onAssistantReply(reply);
  } catch (err) {
    placeholder.remove();
    const msg = err && err.name === "AbortError"
      ? "Canal instable. Delai depasse."
      : "Canal instable. Reconnexion necessaire.";
    await typeLine(msg, "warning");
    if (err && err.message) {
      await typeLine(`Detail: ${err.message}`, "system");
    }
  }
}

async function startLogin() {
  await typeLine("PROTOCOLE ORION // TERMINAL", "system");
  await typeLine("Tu es invite, entre un identifiant et le mot de passe de ton choix.", "system");
  await typeLine("Identifiant:", "system");
  showInput();
}

async function startImmersion() {
  hideInput();
  glitchPulse();
  try {
    await printLines(introLines);
  } catch (_err) {
    await typeLine("Canal direct instable, bascule en mode texte.", "warning");
  } finally {
    state.mode = "ai";
    userInput.type = "text";
    userInput.value = "";
    await typeLine("> Canal direct Clara ouvert. Ecris ton message.", "system");
    showInput();
  }
}

async function handleLoginInput(value) {
  if (state.step === "login_id") {
    state.step = "login_pwd";
    await typeLine(`Identifiant enregistre: ${value}`, "system");
    await typeLine("Mot de passe:", "system");
    userInput.value = "";
    userInput.type = "password";
    showInput();
    return;
  }

  if (state.step === "login_pwd") {
    state.step = "authenticated";
    await typeLine("Authentification terminee.", "system");
    userInput.type = "text";
    userInput.value = "";
    await startImmersion();
  }
}

userInput.addEventListener("keydown", async (event) => {
  if (event.key !== "Enter" || state.busy) return;

  const value = userInput.value.trim();
  if (!value) return;

  state.busy = true;
  try {
    if (state.mode === "ai") {
      userInput.value = "";
      await typeLine(`> ${value}`, "system");
      await sendToClara(value);
      showInput();
      return;
    }

    if (state.step === "login_id" || state.step === "login_pwd") {
      await handleLoginInput(value);
    }
  } finally {
    state.busy = false;
  }
});

startLogin();
