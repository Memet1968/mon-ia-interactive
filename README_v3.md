# 🚀 CLARA ORION 2032 - VERSION 3 IMMERSIVE
## Guide d'installation et de déploiement

---

## 📦 CE QUI A CHANGÉ (v1 → v3)

### ✅ Améliorations majeures

1. **API LLM** (au lieu de Gemini)
   - Meilleur pour le roleplay immersif
   - Gratuit avec limites généreuses
   - Plus cohérent dans la personnalité

2. **Persona Clara ultra-immersif**
   - 2031 (avant les événements du roman)
   - Révélations progressives sur 7+ conversations
   - Protocole email piège (protocoleorion2032@proteux.org)
   - Références à Bibliothécaire pour le suspens

3. **Interface messagerie sécurisée**
   - Style terminal Matrix/cyberpunk
   - Messages style WhatsApp/SMS
   - Indicateur "Clara écrit..."
   - En-tête avec chiffrement quantique
   - Input fixe en bas (UX mobile native)

4. **Introduction naturelle**
   - Clara se présente elle-même (pas d'intro automatique)
   - Premier message court et intrigant
   - Progression narrative fluide

---

## 📁 STRUCTURE DU PROJET V3

```
clara-orion-2032-v3/
├── server.js                  # Backend LLM (NOUVEAU)
├── clara_prompt_v3.txt       # Persona immersif (NOUVEAU)
├── orion_lore_v3.txt         # Base connaissances (NOUVEAU)
├── package.json              # Dépendances (mis à jour)
├── public/
│   ├── index.html           # Interface messagerie (NOUVEAU)
│   ├── styles.css           # Style terminal (NOUVEAU)
│   └── script.js            # Frontend UX (NOUVEAU)
└── README.md                 # Ce fichier
```

---

## 🛠️ INSTALLATION LOCALE

### Étape 1 : Remplacer les fichiers

**Dans votre dossier `mon-ia-interactive` existant :**

1. **Remplacer `server.js`**
   ```bash
   # Sauvegarde de l'ancien (optionnel)
   mv server.js server_old.js
   
   # Copier le nouveau
   cp /chemin/vers/server_v3.js server.js
   ```

2. **Ajouter les nouveaux prompts**
   ```bash
   # Remplacer l'ancien prompt
   mv clara_prompt.txt clara_prompt_old.txt
   cp /chemin/vers/clara_prompt_v3.txt clara_prompt_v3.txt
   
   # Ajouter le fichier lore (nouveau)
   cp /chemin/vers/orion_lore_v3.txt orion_lore_v3.txt
   ```

3. **Remplacer le frontend**
   ```bash
   cd public/
   
   # Sauvegardes (optionnel)
   mv index.html index_old.html
   mv styles.css styles_old.css
   mv script.js script_old.js
   
   # Nouveaux fichiers
   cp /chemin/vers/index_v3.html index.html
   cp /chemin/vers/styles_v3.css styles.css
   cp /chemin/vers/script_v3.js script.js
   ```

4. **Mettre à jour package.json**
   ```bash
   cd ..
   cp /chemin/vers/package_v3.json package.json
   ```

### Étape 2 : Obtenir une clé API LLM

1. **Créer un compte** : https://platform.llm.com
2. **Aller dans "API Keys"**
3. **Créer une nouvelle clé** (copier et sauvegarder)

### Étape 3 : Configurer la clé API

**Option A - Variable d'environnement (recommandé) :**
```bash
# Mac/Linux
export LLM_API_KEY="sk-votre-cle-ici"

# Windows (PowerShell)
$env:LLM_API_KEY="sk-votre-cle-ici"
```

**Option B - Fichier .env (plus pratique) :**
```bash
# Créer un fichier .env à la racine
echo "LLM_API_KEY=sk-votre-cle-ici" > .env
```

Puis installer dotenv :
```bash
npm install dotenv
```

Et ajouter en haut de `server.js` :
```javascript
import dotenv from 'dotenv';
dotenv.config();
```

### Étape 4 : Installer les dépendances

```bash
npm install
```

### Étape 5 : Lancer en local

```bash
npm start
```

Ouvrir : http://localhost:3000

---

## ✅ TEST EN LOCAL

### 1. Vérifier le serveur

```bash
curl http://localhost:3000/health
```

Réponse attendue :
```json
{
  "ok": true,
  "model": "llm-chat",
  "hasApiKey": true
}
```

### 2. Tester l'interface

Ouvrir http://localhost:3000 dans votre navigateur.

**Vous devriez voir :**
- En-tête : "SECURE CHANNEL // MATRIX-2XTH-687"
- Message système avec icône 🔒
- Premier message de Clara
- Input de saisie en bas

### 3. Tester la conversation

**Message 1 (vous) :**
```
Bonjour
```

**Réponse attendue (Clara) :**
```
Vous êtes là. Bien.
Ce canal ne garde aucune trace.

On m'appelle Clara.
Je ne dirai pas d'où je parle.

Vous avez été repéré. Pas par nous.
Par ORION.

Vous connaissez ce nom ?
```

**Message 2 (vous) :**
```
Non
```

**Réponse attendue (Clara) :**
```
Un système de classification cognitive.
480 milliards de dollars par an.
Glass-Eyes, Hung, Benif.

Le but ?
Décider qui est apte à gouverner.
Et qui est "chestless".
Sans poitrine.

Vous comprenez ce que ça signifie ?
```

### 4. Vérifier la tonalité

**Clara doit être :**
- ✅ Directe (phrases courtes)
- ✅ Méfiante (teste l'utilisateur)
- ✅ Clinique (pas de pathos excessif)
- ✅ Révoltée (sous-jacent)
- ✅ En 2031 (ne parle PAS d'Adam ou de 2032)

**Clara NE DOIT PAS :**
- ❌ Dire "je suis un chatbot"
- ❌ Donner trop d'infos d'un coup
- ❌ Révéler son nom complet
- ❌ Parler des événements de 2032

---

## 🌐 DÉPLOIEMENT SUR RENDER

### Étape 1 : Pousser sur GitHub

```bash
# Initialiser Git (si pas déjà fait)
git init

# Ajouter tous les fichiers
git add .

# Commit
git commit -m "Version 3 - Interface immersive + LLM"

# Ajouter le remote (remplacer par votre repo)
git remote add origin https://github.com/votre-username/clara-orion-2032.git

# Pousser
git push -u origin main
```

### Étape 2 : Créer le service sur Render

1. **Aller sur** https://render.com
2. **Cliquer sur "New" → "Web Service"**
3. **Connecter votre repo GitHub**
4. **Configuration :**
   - **Name:** `clara-orion-2032`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (pour commencer)

### Étape 3 : Ajouter la variable d'environnement

Dans les settings du service Render :

1. **Aller dans "Environment"**
2. **Ajouter une variable :**
   - **Key:** `LLM_API_KEY`
   - **Value:** `sk-votre-cle-llm`
3. **Sauvegarder**

### Étape 4 : Déployer

Render va automatiquement :
- ✅ Cloner votre repo
- ✅ Installer les dépendances
- ✅ Lancer le serveur

**URL générée :** https://clara-orion-2032.onrender.com

---

## 🎨 PERSONNALISATION (OPTIONNEL)

### Changer le nom du canal

Dans `index.html`, ligne 14 :
```html
<span class="header-title">SECURE CHANNEL // MATRIX-2XTH-687</span>
```

Remplacer par :
```html
<span class="header-title">VOTRE-NOM-ICI</span>
```

### Changer les couleurs

Dans `styles.css`, lignes 6-14 :
```css
:root {
    --bg-dark: #0a0e14;           /* Fond principal */
    --text-accent: #00ff88;       /* Vert Matrix */
    --text-warning: #ff9500;      /* Orange utilisateur */
    /* ... */
}
```

### Modifier le premier message de Clara

Dans `index.html`, lignes 42-50 (message automatique de Clara) :

Ou encore mieux : **supprimer ce message** et laisser Clara se présenter via l'API uniquement.

---

## 🐛 DÉPANNAGE

### Erreur : "Missing LLM_API_KEY"

**Cause :** La clé API n'est pas configurée

**Solution :**
```bash
# Vérifier que la variable existe
echo $LLM_API_KEY  # Mac/Linux
echo $env:LLM_API_KEY  # Windows

# Si vide, la redéfinir
export LLM_API_KEY="sk-..."
```

### Erreur : "LLM HTTP 401"

**Cause :** Clé API invalide ou expirée

**Solution :**
1. Vérifier la clé sur https://platform.llm.com
2. Régénérer une nouvelle clé
3. Mettre à jour la variable d'environnement

### Clara répond bizarrement

**Cause possible :** Les fichiers de prompt ne sont pas chargés correctement

**Solution :**
```bash
# Vérifier que les fichiers existent
ls -la clara_prompt_v3.txt
ls -la orion_lore_v3.txt

# Vérifier les droits de lecture
chmod +r clara_prompt_v3.txt
chmod +r orion_lore_v3.txt

# Relancer le serveur
npm start
```

### L'interface ne s'affiche pas correctement

**Cause :** Fichiers CSS/JS non chargés

**Solution :**
```bash
# Vérifier la structure
ls -la public/
# Doit contenir : index.html, styles.css, script.js

# Vérifier que Express sert le dossier public
# Dans server.js, ligne 19 :
app.use(express.static("public"));
```

### Le scroll automatique ne fonctionne pas

**Cause :** Problème CSS avec le conteneur

**Solution :**
Dans `styles.css`, vérifier lignes 85-88 :
```css
.chat-container {
    flex: 1;
    overflow-y: auto;  /* Important */
    padding-bottom: 160px;  /* Espace pour l'input */
}
```

---

## 📊 COMPARAISON DES VERSIONS

| Fonctionnalité | v1 (Gemini) | v3 (LLM) |
|----------------|-------------|---------------|
| API | Gemini | LLM |
| Coût | Gratuit | Gratuit |
| Persona | Bibliothécaire technique | Clara immersive |
| Univers | Absent | Complet (H0/H1/H2, MODUS, etc.) |
| Interface | Standard | Terminal sécurisé |
| UX | Form classique | Messagerie mobile |
| Intro | Automatique (longue) | Naturelle (progressive) |
| Suspens | Non | Oui (Bibliothécaire, etc.) |
| Email piège | Non | Oui (protocoleorion2032@proteux.org) |

---

## 📞 SUPPORT

**Auteur :** Ahmed Messaoudi  
**Roman :** ORION 2032

**En cas de problème :**
1. Vérifier les logs du serveur (`npm start`)
2. Tester `/health` endpoint
3. Vérifier la clé API LLM
4. Comparer avec les exemples de ce guide

---

## 🎉 C'EST PRÊT !

Vous avez maintenant une **interface immersive ultra-professionnelle** pour votre chatbot Clara.

**Prochaines étapes :**
1. ✅ Tester en local
2. ✅ Déployer sur Render
3. ✅ Partager avec vos lecteurs
4. ✅ Collecter les retours
5. ✅ Itérer et améliorer

**Bon lancement ! 🚀**
