# Exporter / déplacer le site UniFresh

## Archive prête (recommandé)

Fichier : `unifresh-site-export.zip` (dans ce dossier et dans `Downloads`)

Contenu : tout le code source, sans `node_modules` ni `dist`.

## Installation sur une autre machine

```bash
# Dézipper, puis dans le dossier :
npm install
cp .env.example .env
# Éditer .env : SMTP_USER, SMTP_PASS (mot de passe d'application Gmail), ADMIN_CODE

npm run server   # terminal 1 — port 8787
npm run dev      # terminal 2 — port 5173

# Production (un seul processus) :
npm run build
npm run start
```

Voir aussi `DEPLOY.md` et `TESTING.md`. Les demandes sont enregistrées dans `data/unifresh.json` sur le serveur.

## Fichiers du projet

| Fichier | Rôle |
|---------|------|
| `src/App.jsx` | Interface (landing, admin, formulaires) |
| `src/storage.js` | localStorage, demandes, admin token |
| `src/WeekCalendar.jsx` | Créneaux soir/week-end |
| `src/dates.js` | Dates / semaines |
| `src/styles.css` | Styles |
| `src/main.jsx` | Point d'entrée React |
| `server.js` | API mail + admin verify |
| `index.html` | Page HTML |
| `vite.config.js` | Proxy /api → 8787 |
| `package.json` | Dépendances |
| `public/uniclean-logo.png` | Logo |
| `.env` | Secrets (ne pas publier) |
