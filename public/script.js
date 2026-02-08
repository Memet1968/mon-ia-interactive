const output = document.getElementById("output");
const inputRow = document.getElementById("inputRow");
const userInput = document.getElementById("userInput");
const overlay = document.getElementById("overlay");

const API_URL = "/api/clara";
const chatHistory = [];

const state = {
  step: "login_id",
  mode: "login",
  busy: false
};

const introLines = [
  { text: "Connexion établie.", cls: "system" },
  { text: "Interface Clara // Protocole Orion", cls: "clara" },
  {
    text: "Bonjour. Je m'appelle Clara, mais c'est un pseudo.",
    cls: "clara"
  },
  {
    text: "Tu entres dans une fiction opérationnelle. Ici, chaque mot a un coût.",
    cls: "clara"
  },
  {
    text: "Orion modélise les décisions humaines et les rend prévisibles.",
    cls: "clara glitch"
  },
  {
    text: "Je suis ton interlocutrice dans cet univers virtuel. Pose ta question.",
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
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      placeholder.remove();
      const detail = data && data.detail ? String(data.detail) : "";
      await typeLine(`Erreur API (${res.status}).`, "warning");
      if (detail) {
        await typeLine(`Détail: ${detail}`, "system");
      }
      return;
    }
    if (data && data.disconnect) {
      placeholder.remove();
      await typeLine("Très bien. Déconnexion sécurisée. À bientôt.", "system");
      document.body.classList.add("blackout");
      hideInput();
      return;
    }
    const reply = data && data.text ? data.text.trim() : "";
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
      const data = await res.json().catch(() => ({}));
      placeholder.remove();
      if (data && data.disconnect) {
        await typeLine("Très bien. Déconnexion sécurisée. À bientôt.", "system");
        document.body.classList.add("blackout");
        hideInput();
        return;
      }
      const reply = data && data.text ? data.text.trim() : "";
      if (!reply) {
        await typeLine("Réponse indisponible. Réessaie.", "warning");
        return;
      }
      chatHistory.push({ role: "assistant", content: reply });
      await typeLine(reply, "clara");
      return;
    } catch (_fallbackErr) {
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
  await typeLine("Tu es invité, entre un identifiant et le mot de passe de ton choix.", "system");
  await typeLine("Identifiant:", "system");
  showInput();
}

async function startImmersion() {
  hideInput();
  glitchPulse();
  await printLines(introLines);
  state.mode = "ai";
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
    state.step = "authenticated";
    await typeLine("Authentification terminée.", "system");
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
