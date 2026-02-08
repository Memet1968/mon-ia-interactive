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
  { text: "Connexion etablie.", cls: "system" },
  { text: "Interface Clara // Protocole Orion", cls: "clara" },
  {
    text: "Bonjour. Je m'appelle Clara, mais c'est un pseudo.",
    cls: "clara"
  },
  {
    text: "Ton profil semble correspondre a une mission que nous voulons te confier.",
    cls: "clara"
  },
  {
    text: "Orion est une infrastructure mondiale de controle cognitif: elle mesure les comportements, anticipe les choix et impose des decisions presentees comme naturelles.",
    cls: "clara glitch"
  },
  {
    text: "Le systeme transforme progressivement les citoyens en profils pilotables, sans violence visible.",
    cls: "clara"
  },
  {
    text: "Menshen pretend s'y opposer, mais reproduit une autre forme de domination.",
    cls: "clara"
  },
  {
    text: "Nous cherchons des temoins discrets capables d'observer, dater, recouper et transmettre des preuves.",
    cls: "clara"
  },
  {
    text: "Si tu acceptes, je t'explique comment participer sans te compromettre.",
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
