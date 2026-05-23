# Déploiement Vercel (unifresh.ch)

Le site sur Vercel nécessite des **variables d'environnement** pour l'inscription et les e-mails.

## Variables obligatoires (Vercel → Project → Settings → Environment Variables)

| Variable | Exemple |
|----------|---------|
| `NODE_ENV` | `production` |
| `APP_BASE_URL` | `https://unifresh.ch` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | `unifreshbynk@gmail.com` |
| `SMTP_PASS` | mot de passe d'application Google |
| `MAIL_FROM` | `UniFresh <unifreshbynk@gmail.com>` |
| `ADMIN_REVIEW_EMAIL` | `unifreshbynk@gmail.com` |

Après ajout : **Redeploy** le projet.

## Vérification

`https://unifresh.ch/api/health` doit répondre :

```json
{ "ok": true, "apiVersion": 3, "storage": "sqlite" }
```

## Note base de données

Sur Vercel, SQLite est dans `/tmp` (données réinitialisées si la fonction redémarre). Pour un site à fort trafic, préférez un **VPS** (`DEPLOY.md`).
