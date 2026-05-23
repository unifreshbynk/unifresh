# Checklist de test UniFresh

## Inscription

- [ ] Inscription étudiant·e avec code e-mail
- [ ] Inscription entreprise / particulier
- [ ] Refus si e-mail déjà inscrit
- [ ] Case confidentialité obligatoire
- [ ] E-mail admin reçu à `ADMIN_REVIEW_EMAIL`

## Connexion

- [ ] Code envoyé uniquement si compte existant
- [ ] Connexion sur un autre navigateur (même e-mail)

## Demande de service

- [ ] Formulaire particulier (m², logement, produits)
- [ ] Formulaire entreprise
- [ ] Canton / zone obligatoire
- [ ] E-mail de confirmation client reçu
- [ ] E-mail admin reçu
- [ ] Demande visible dans l'admin (autre navigateur OK)

## Admin

- [ ] Code admin valide / invalide
- [ ] Marquer vu / non vu
- [ ] Export CSV
- [ ] Session expire après `ADMIN_TOKEN_EXPIRY`

## Légal

- [ ] Liens Confidentialité et Mentions légales
- [ ] Zone d'intervention affichée

## Production

- [ ] HTTPS actif
- [ ] `APP_BASE_URL` en `https://` dans `.env`
- [ ] `TRUST_PROXY=1` derrière reverse proxy
- [ ] `npm run build` + `npm run start:prod` (ou PM2)
- [ ] `GET /api/health` → `apiVersion: 3`, `storage: sqlite`
- [ ] Sauvegardes présentes dans `data/backups/`
- [ ] Bannière cookies + politique de confidentialité OK
