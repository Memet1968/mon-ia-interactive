const API_URL = "/api/clara";
const MAX_MESSAGE_LENGTH = 1000;
const TYPING_DELAY = 1500;

let conversationHistory = [];
let isWaiting = false;

const chatContainer = document.getElementById("chat-container");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");

document.addEventListener("DOMContentLoaded", () => {
  userInput.focus();
  sendButton.addEventListener("click", handleSendMessage);
  userInput.addEventListener("keydown", handleKeyDown);
  userInput.addEventListener("input", handleInputResize);
  scrollToBottom();
});

function getCurrentTime() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function scrollToBottom() {
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleInputResize() {
  userInput.style.height = "auto";
  userInput.style.height = `${userInput.scrollHeight}px`;
}

function handleKeyDown(event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    handleSendMessage();
  }
}

async function handleSendMessage() {
  const text = userInput.value.trim();
  if (!text || isWaiting) {
    return;
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    addSystemMessage(`Message trop long (max ${MAX_MESSAGE_LENGTH} caracteres).`);
    return;
  }

  isWaiting = true;
  sendButton.disabled = true;
  userInput.disabled = true;

  addUserMessage(text);
  userInput.value = "";
  userInput.style.height = "auto";
  conversationHistory.push({ role: "user", content: text });

  showTypingIndicator();
  await sleep(TYPING_DELAY);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `HTTP ${response.status}`);
    }

    hideTypingIndicator();
    if (data.disconnect) {
      addSystemMessage("Clara a quitte le canal. Connexion interrompue.");
      disableInput();
      return;
    }

    const replyText = String(data.text || "").trim();
    if (!replyText) {
      addSystemMessage("Reponse vide recue de l'API.");
      return;
    }

    addClaraMessage(replyText);
    conversationHistory.push({ role: "assistant", content: replyText });
  } catch (error) {
    hideTypingIndicator();
    addSystemMessage(`Erreur: ${error.message}`);
    console.error("API Error:", error);
  } finally {
    isWaiting = false;
    sendButton.disabled = false;
    userInput.disabled = false;
    userInput.focus();
  }
}

function addUserMessage(text) {
  const messageNode = createMessageNode("user-message", "VOUS", text);
  chatContainer.appendChild(messageNode);
  scrollToBottom();
}

function addClaraMessage(text) {
  const messageNode = createMessageNode("clara-message", "CLARA", text);
  chatContainer.appendChild(messageNode);
  scrollToBottom();
}

function createMessageNode(messageClass, sender, text) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${messageClass}`;

  const header = document.createElement("div");
  header.className = "message-header";

  const senderNode = document.createElement("span");
  senderNode.className = "message-sender";
  senderNode.textContent = sender;

  const timeNode = document.createElement("span");
  timeNode.className = "message-time";
  timeNode.textContent = getCurrentTime();

  header.appendChild(senderNode);
  header.appendChild(timeNode);

  const content = document.createElement("div");
  content.className = "message-content";
  appendParagraphs(content, text);

  wrapper.appendChild(header);
  wrapper.appendChild(content);
  return wrapper;
}

function appendParagraphs(container, text) {
  const normalized = String(text || "").replace(/\r\n/g, "\n");
  const blocks = normalized.split("\n\n");
  for (const block of blocks) {
    const paragraph = document.createElement("p");
    const lines = block.split("\n");
    lines.forEach((line, index) => {
      if (index > 0) {
        paragraph.appendChild(document.createElement("br"));
      }
      paragraph.appendChild(document.createTextNode(line));
    });
    container.appendChild(paragraph);
  }
}

function addSystemMessage(text) {
  const messageDiv = document.createElement("div");
  messageDiv.className = "system-message";

  const icon = document.createElement("div");
  icon.className = "system-icon";
  icon.textContent = "!";

  const systemText = document.createElement("div");
  systemText.className = "system-text";

  const strong = document.createElement("strong");
  strong.textContent = "SYSTEME";
  systemText.appendChild(strong);
  systemText.appendChild(document.createElement("br"));
  systemText.appendChild(document.createTextNode(String(text || "")));

  messageDiv.appendChild(icon);
  messageDiv.appendChild(systemText);

  chatContainer.appendChild(messageDiv);
  scrollToBottom();
}

function showTypingIndicator() {
  typingIndicator.style.display = "flex";
}

function hideTypingIndicator() {
  typingIndicator.style.display = "none";
}

function disableInput() {
  userInput.disabled = true;
  sendButton.disabled = true;
  userInput.placeholder = "Connexion interrompue";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

window.addEventListener("error", (event) => {
  console.error("Global error:", event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  console.error("Unhandled promise rejection:", event.reason);
});
