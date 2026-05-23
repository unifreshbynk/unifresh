# Mise en production UniFresh (grand public)

## Architecture

- **Front** : React compilé dans `dist/`
- **API** : Express sur le même processus
- **Données** : SQLite (`data/unifresh.db`) avec sauvegardes automatiques dans `data/backups/`
- **E-mails** : SMTP (codes, confirmations, admin)

## Prérequis

- Node.js **20+**
- Nom de domaine avec **HTTPS** (Let's Encrypt via Nginx, Caddy ou l'hébergeur)
- Compte SMTP (Gmail mot de passe d'application ou service pro : SendGrid, Brevo…)

## Installation

```bash
cd uniclean
npm ci
cp .env.example .env
# Éditez .env (APP_BASE_URL en https://, SMTP, etc.)
npm run build
npm run start:prod
```

Ou avec **PM2** (recommandé) :

```bash
npm run build
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

## Variables `.env` essentielles

| Variable | Production |
|----------|------------|
| `NODE_ENV` | `production` |
| `APP_BASE_URL` | `https://www.votre-domaine.ch` (sans slash final) |
| `TRUST_PROXY` | `1` (derrière Nginx/Caddy) |
| `SMTP_*` | Identifiants d'envoi |
| `ADMIN_REVIEW_EMAIL` | Boîte qui reçoit chaque inscription / demande |

Au démarrage, le serveur **refuse** de lancer en production si `APP_BASE_URL` n'est pas en `https://`.

## Reverse proxy (exemple Caddy)

```caddy
www.votre-domaine.ch {
  reverse_proxy localhost:8787
  encode gzip
}
```

## Reverse proxy (exemple Nginx)

```nginx
server {
  listen 443 ssl http2;
  server_name www.votre-domaine.ch;
  # ssl_certificate …

  location / {
    proxy_pass http://127.0.0.1:8787;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Données et sauvegardes

- Fichier principal : `data/unifresh.db`
- Sauvegardes auto : `data/backups/unifresh-*.db` (toutes les 6 h par défaut, 14 conservées)
- **Copiez aussi** `data/` sur un stockage externe (cron, snapshot VPS)

Migration : si `data/unifresh.json` existe encore, il est importé une fois au premier lancement SQLite puis archivé.

## Santé / monitoring

```bash
curl https://www.votre-domaine.ch/api/health
```

Réponse attendue : `"apiVersion":3`, `"storage":"sqlite"`, `"ok":true`.

## Checklist avant ouverture

Voir `TESTING.md` — à valider sur l'URL **HTTPS finale**.

## Développement local

```bash
npm run server   # terminal 1 — port 8787
npm run dev      # terminal 2 — port 5173 (proxy /api)
```

`NODE_ENV` non défini : pas de contrainte HTTPS sur `APP_BASE_URL`.

## Montée en charge

Pour un trafic très élevé : passer à un SMTP dédié (Brevo, SendGrid), surveiller `data/unifresh.db` et envisager PostgreSQL. Pour la majorité des lancements régionaux, SQLite + un VPS 1–2 Go RAM suffit.
