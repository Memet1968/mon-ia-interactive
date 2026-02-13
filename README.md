# CLARA ORION 2032

Application web interactive avec Clara (persona ORION) et backend LLM.

## Stack

- Node.js + Express
- Frontend statique (`public/`)
- API LLM: Chat Completions (fournisseur configurable)

## Structure

```
ORION-INTERACTIF/
├── server.js
├── package.json
├── clara_prompt_v3.txt
├── orion_lore_v3.txt
├── public/
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── .env.example
└── render.yaml
```

## Lancer en local

1. Installer les dependances:

```bash
npm install
```

2. Configurer l'environnement:

```bash
cp .env.example .env
```

Renseigner `LLM_API_KEY` dans `.env`.

3. Demarrer:

```bash
npm start
```

4. Verifier:

- Interface: `http://localhost:3000`
- Healthcheck: `http://localhost:3000/health`

## Variables d'environnement

- `LLM_API_KEY` (obligatoire)
- `LLM_MODEL` (optionnel, pour override)
- `LLM_API_URL` (optionnel, pour override)
- `LLM_TIMEOUT_MS` (optionnel, default: `60000`)
- `LLM_FREQUENCY_PENALTY` (optionnel, a definir seulement si le provider le supporte)

## Deploy Render

### Option A (manuel)

- Build Command: `npm install`
- Start Command: `npm start`
- Environment: `Node`
- Ajouter la variable:
  - `LLM_API_KEY=...`

### Option B (render.yaml)

Le fichier `render.yaml` est fourni. Render demandera la valeur de `LLM_API_KEY`.

## Notes

- `README_v3.md` est conserve comme historique de conception.
- Les fichiers suffixes `_v3` peuvent rester comme reference; la version active est celle sans suffixe dans la structure ci-dessus.
