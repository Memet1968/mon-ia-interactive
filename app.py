import streamlit as st
import google.generativeai as genai

# Configuration de la page
st.set_page_config(page_title="Mon IA Interactive", layout="centered")
st.title("🤖 Mon Assistant Gemini")

# Récupération sécurisée de votre clé API
if "GOOGLE_API_KEY" in st.secrets:
    genai.configure(api_key=st.secrets["GOOGLE_API_KEY"])
else:
    st.error("La clé API est manquante dans les paramètres secrets.")

# Configuration du modèle (ce que vous avez réglé dans AI Studio)
model = genai.GenerativeModel('gemini-1.5-flash')

# Historique de la discussion
if "messages" not in st.session_state:
    st.session_state.messages = []

# Affichage des messages précédents
for message in st.session_state.messages:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

# Zone de saisie utilisateur
if prompt := st.chat_input("Dites quelque chose..."):
    st.session_state.messages.append({"role": "user", "content": prompt})
    with st.chat_message("user"):
        st.markdown(prompt)

    # Réponse de l'IA
    with st.chat_message("assistant"):
        response = model.generate_content(prompt)
        st.markdown(response.text)
        st.session_state.messages.append({"role": "assistant", "content": response.text})
