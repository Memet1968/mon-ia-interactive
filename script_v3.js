// ============================================================================
// CONFIGURATION
// ============================================================================

const API_URL = '/api/clara';
const MAX_MESSAGE_LENGTH = 1000;
const TYPING_DELAY = 1500; // Délai avant que Clara "écrive"

// ============================================================================
// ÉTAT GLOBAL
// ============================================================================

let conversationHistory = [];
let isWaiting = false;

// ============================================================================
// ÉLÉMENTS DOM
// ============================================================================

const chatContainer = document.getElementById('chat-container');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const typingIndicator = document.getElementById('typing-indicator');

// ============================================================================
// INITIALISATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Ajouter le premier message de Clara avec l'heure actuelle
    const firstMessage = document.querySelector('.clara-message .message-time');
    if (firstMessage) {
        firstMessage.textContent = getCurrentTime();
    }

    // Focus automatique sur l'input
    userInput.focus();

    // Listeners
    sendButton.addEventListener('click', handleSendMessage);
    userInput.addEventListener('keydown', handleKeyDown);
    userInput.addEventListener('input', handleInputResize);

    // Scroll vers le bas
    scrollToBottom();
});

// ============================================================================
// FONCTIONS UTILITAIRES
// ============================================================================

function getCurrentTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function handleInputResize() {
    // Auto-resize du textarea
    userInput.style.height = 'auto';
    userInput.style.height = userInput.scrollHeight + 'px';
}

// ============================================================================
// GESTION DES ENTRÉES UTILISATEUR
// ============================================================================

function handleKeyDown(e) {
    // Envoyer avec Enter (sans Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
}

async function handleSendMessage() {
    const text = userInput.value.trim();

    // Validation
    if (!text) return;
    if (isWaiting) return;
    if (text.length > MAX_MESSAGE_LENGTH) {
        alert(`Message trop long (max ${MAX_MESSAGE_LENGTH} caractères)`);
        return;
    }

    // Désactiver l'input
    isWaiting = true;
    sendButton.disabled = true;
    userInput.disabled = true;

    // Afficher le message de l'utilisateur
    addUserMessage(text);

    // Vider l'input
    userInput.value = '';
    userInput.style.height = 'auto';

    // Ajouter à l'historique
    conversationHistory.push({
        role: 'user',
        content: text
    });

    // Afficher l'indicateur de frappe
    showTypingIndicator();

    // Délai avant d'envoyer (pour l'effet "Clara réfléchit")
    await sleep(TYPING_DELAY);

    // Appeler l'API
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                messages: conversationHistory
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.detail || `HTTP ${response.status}`);
        }

        const data = await response.json();

        // Masquer l'indicateur de frappe
        hideTypingIndicator();

        // Vérifier déconnexion
        if (data.disconnect) {
            addSystemMessage('Clara a quitté le canal. Connexion interrompue.');
            disableInput();
            return;
        }

        // Afficher la réponse de Clara
        addClaraMessage(data.text);

        // Ajouter à l'historique
        conversationHistory.push({
            role: 'assistant',
            content: data.text
        });

    } catch (error) {
        hideTypingIndicator();
        addSystemMessage(`❌ Erreur : ${error.message}`);
        console.error('API Error:', error);
    } finally {
        // Réactiver l'input
        isWaiting = false;
        sendButton.disabled = false;
        userInput.disabled = false;
        userInput.focus();
    }
}

// ============================================================================
// AFFICHAGE DES MESSAGES
// ============================================================================

function addUserMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message user-message';

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-sender">VOUS</span>
            <span class="message-time">${getCurrentTime()}</span>
        </div>
        <div class="message-content">
            ${formatMessageText(text)}
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addClaraMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message clara-message';

    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-sender">CLARA</span>
            <span class="message-time">${getCurrentTime()}</span>
        </div>
        <div class="message-content">
            ${formatMessageText(text)}
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'system-message';

    messageDiv.innerHTML = `
        <div class="system-icon">⚠</div>
        <div class="system-text">
            <strong>SYSTÈME</strong><br>
            ${text}
        </div>
    `;

    chatContainer.appendChild(messageDiv);
    scrollToBottom();
}

function formatMessageText(text) {
    // Convertir les retours à la ligne en paragraphes
    return text
        .split('\n\n')
        .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
        .join('');
}

// ============================================================================
// INDICATEUR DE FRAPPE
// ============================================================================

function showTypingIndicator() {
    typingIndicator.style.display = 'flex';
}

function hideTypingIndicator() {
    typingIndicator.style.display = 'none';
}

// ============================================================================
// DÉSACTIVATION DE L'INPUT (DÉCONNEXION)
// ============================================================================

function disableInput() {
    userInput.disabled = true;
    sendButton.disabled = true;
    userInput.placeholder = "Connexion interrompue";
}

// ============================================================================
// UTILITAIRES
// ============================================================================

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// GESTION DES ERREURS GLOBALES
// ============================================================================

window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
});
