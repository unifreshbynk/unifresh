# Prompt de reprise — Site UniFresh (ex-Uniclean)

Copie tout ce document dans une nouvelle conversation IA pour continuer le projet sans rien oublier.

---

## Rôle demandé à l’IA

Tu reprends le développement d’**UniFresh**, plateforme web de mise en relation pour le **nettoyage** en Suisse : **étudiant·es** (missions), **entreprises** et **particuliers** (demandes de service). Le code existe déjà ; tu dois le **comprendre, le faire tourner, puis étendre** en respectant l’architecture et les choix déjà faits sauf demande contraire du client.

---

## Emplacement du projet

- Dossier racine app : `uniclean/` (nom historique du dossier, **marque affichée = UniFresh**)
- Workspace parent possible : `MicrosoftWindows.Client.CBS_cw5n1h2txyewy!InputApp/`
- Chemin typique Windows : `c:\Users\nolan\Downloads\MicrosoftWindows.Client.CBS_cw5n1h2txyewy!InputApp\uniclean`

---

## Stack technique

| Couche | Techno |
|--------|--------|
| Frontend | React 18 + Vite 5, **un seul gros fichier** `src/App.jsx` (~2200 lignes) + `src/storage.js`, `src/WeekCalendar.jsx`, `src/dates.js`, `src/styles.css` |
| Backend mail | Node.js **Express 5** `server.js` (port **8787**) |
| E-mails | Nodemailer + SMTP (`.env`) |
| Données métier | **localStorage uniquement** (pas de base de données, pas d’API REST métier) |
| Polices | Google Fonts : DM Sans + Fraunces (`index.html`) |

### Commandes

```bash
cd uniclean
npm install
npm run server    # Terminal 1 — API mail http://localhost:8787
npm run dev       # Terminal 2 — UI http://localhost:5173 (proxy /api → 8787)
npm run build     # Production → dist/
```

**Important :** `http://localhost:8787/` seul renvoie souvent une erreur — c’est normal. L’UI est sur **5173**.

### Proxy Vite (`vite.config.js`)

`/api/*` → `http://localhost:8787`

---

## Branding & assets

- **Nom affiché partout : UniFresh** (remplacement complet de l’ancien nom Uniclean dans les textes)
- **Logo fichier :** `public/uniclean-logo.png` (nom de fichier historique, **ne pas renommer** sans copier l’image)
- Composant : `UniFreshLogo()` → `<img src="/uniclean-logo.png" />`
- **Contact e-mail affiché :** `unifreshbynk@gmail.com` (adresse Gmail réelle du client)
- Script optionnel logo : `scripts/trim-logo.mjs`

---

## Les 3 profils utilisateur (`ProfilType`)

| Valeur | Label UI | Parcours après connexion |
|--------|----------|---------------------------|
| `etudiant` | Étudiant·e | Page d’accueil remerciement uniquement — **pas de formulaire de service** |
| `entreprise` | Entreprise | Formulaire demande de nettoyage + créneaux |
| `particulier` | Particulier | Idem entreprise (sans mode « besoin régulier ») |

### Champs profil (`UserProfile` dans `storage.js`)

- `email`, `prenom`, `nom`, `telephone`, `profilType`
- Étudiant uniquement : `age` (16–110), `canton` (liste `SWISS_CANTONS`), `ecole`
- Entreprise : **pas de prénom** à l’inscription (vidé si sélection entreprise)

---

## Authentification (pas de mot de passe)

### Inscription

1. Formulaire landing `#landing-inscription` : profil + champs + validation
2. **Étape récap** (`reviewRegistration`) : l’utilisateur vérifie avant envoi du code
3. `POST /api/register/send-code` → code 6 chiffres, **10 min**, e-mail SMTP
4. Saisie code → `POST /api/register/verify-code`
5. **Aucune validation admin** à l’inscription (supprimée)
6. `saveUser(profile)` + `saveSessionEmail(email)` + `addDemande({ kind: "inscription", ... })`

### Connexion

1. Section `#landing-connexion` sur la landing
2. E-mail doit correspondre à `loadUser()` **sur cet appareil** (un compte local)
3. `POST /api/login/send-code` puis `POST /api/login/verify-code`
4. `saveSessionEmail` + `setUser`

### Session

- Clé `unifresh_session_email` : si e-mail session ≠ e-mail du profil stocké → déconnecté
- Anciennes installs sans session : auto-remplissage session au chargement
- **Déconnexion** : confirmation UI → `clearSessionEmail()` (profil local reste pour reconnexion)
- **Un seul compte** stocké dans `unifresh_user` par navigateur

---

## Espace connecté — Entreprise / Particulier

### Intro « Demande de nettoyage »

- Carte intro affichée tant que `serviceRequestSubmitted === false`
- **Masquée** après envoi réussi du formulaire (`onSubmitted` → `setServiceRequestSubmitted(true)`)

### `ClientServiceForm`

Champs + validation :

- **Adresse** (min 12 caractères)
- **Surface m²** (1–500 000)
- **Intensité** : `leger` | `moyen` | `gros` (`INTENSITE_OPTIONS`)
- **Type de lieu** (`TYPE_LIEU_OPTIONS`) + champ « autre » si `autre`
- **Détails nettoyage** (min 10 caractères)
- **Notes complémentaires** (optionnel)
- Persistance partielle : `saveServiceDetail` à chaque modification

### Créneaux (`CreneauxSoirWeekend` dans `WeekCalendar.jsx`)

Trois tags uniquement (`CRENEAU_SOIR_WEEKEND`) :

- `soir_semaine` — Soir durant la semaine
- `samedi`
- `dimanche`

**Entreprise** : onglets mode créneaux (`entrepriseSlotMode`) :

- `week` : sélection par semaine (`serviceWeeks` : clé = lundi ISO `YYYY-MM-DD`)
- `recurring` : besoin régulier (`serviceRecurringTags` : tableau d’ids)

**Particulier** : semaine uniquement.

À l’envoi, payload service inclut : détail formulaire + `selectedWeekTags` + `selectedRecurringTags` + `entrepriseSlotMode`.

`addDemande({ kind: "demande_service", profilType, nom, prenom, email, telephone, payload })`.

---

## Espace connecté — Étudiant

- Message de bienvenue personnalisé (prénom, école, canton)
- Texte : UniFresh contactera pour missions — **rien à remplir**
- `loadEtudiantWeeks` / `saveEtudiantWeeks` existent dans `storage.js` mais **ne sont plus branchés dans l’UI** (code mort / futur)

---

## Réglages (`GlobalSettingsMenu`)

### Apparence (tous, sans compte) — `SiteSettings` / `unifresh_site_settings`

- `theme` : dark | light
- `fontSize` : normal | large
- `density` : comfortable | compact
- `showHints`, `highContrast`, `reducedMotion`
- Classes CSS sur `.shell` : `theme-light`, `font-large`, `density-compact`, `high-contrast`, `reduced-motion`, `hide-hints`

### Compte (connecté uniquement)

- Modifier : prénom, nom, téléphone ; étudiant : âge, canton, école
- **E-mail non modifiable**
- `syncUserDemandesFromProfile(user)` met à jour toutes les demandes admin avec le même e-mail
- **Suppression compte** : confirmation → `removeDemandesForUserEmail` + `clearUser` + `clearSessionEmail`

### Code mort

- `loadClientPreferences` / `saveClientPreferences` dans `storage.js` — **plus utilisés dans l’UI** (anciennes prefs contact/SMS retirées des réglages)

---

## Widget aide IA (`AiAdvisorWidget`)

- Bouton flottant rond avatar 👩‍💼
- Titre panneau : **« Aide UniFresh »** (pas « Conseiller IA »)
- Fermeture : ✕, Esc, clic backdrop
- Réponses **rule-based** (`getAdvisorAnswer`) — pas d’API LLM
- Questions rapides prédéfinies (`ADVISOR_QUICK_QUESTIONS`)
- **Ne pas parler de l’admin** dans l’aide
- ⚠️ Certaines réponses sont **obsolètes** (ex. « pas d’édition de profil » alors que Réglages → Compte permet l’édition) — à corriger si tu touches l’aide

---

## Landing page (`RegistrationForm`)

- Nav haut : liens **Inscription** / **Connexion** → scroll smooth vers `#landing-inscription` / `#landing-connexion` (alignés à gauche, `scrollToLandingSection`)
- Sections : hero, pitch « Pourquoi UniFresh ? », formulaire inscription, connexion
- Bouton **« Accès demandes (admin) »** avec badge `X non lue(s)` si demandes non vues
- `AiAdvisorWidget` + footer contact

---

## Espace admin (`AdminPanel`)

### Accès

- Code dans `storage.js` : `ADMIN_ACCESS_CODE = "NoKy17170908"`
- Pas de route URL dédiée : état `adminOpen` dans `App`

### UI actuelle (important)

- **Focus principal : demandes de service**
- Titre : « Demandes de service »
- Onglets profil : comptent **uniquement les `demande_service`** (+ indicateur non lues par profil)
- Liste groupée **par jour** (date `createdAt`)

### Inscriptions

- **Petit bouton en haut à droite** : `Inscr. N` (+ point si inscriptions non vues)
- Ouvre un **panneau latéral** (backdrop + dialog) avec **toutes** les inscriptions (tous profils)
- Fermeture : ✕, clic extérieur, Escape

### Système vu / non vu

- Champ `adminSeenAt` (ISO string ou null) sur chaque `DemandeRecord`
- Badge : « Pas encore vu » / « Vu »
- Boutons : Marquer comme vu / Marquer comme non vu
- « Tout marquer comme vu » (toutes demandes)
- `countUnseenDemandes()` pour badge landing admin
- Demandes `fallback_*` (données migrées) : pas de toggle vu

### Supprimé (ne pas réintroduire sans demande)

- Système **Accepter / Refuser** inscriptions
- E-mails admin à l’inscription
- `GET /api/admin/review`

### Fallback admin

Si `loadDemandes()` vide mais `loadUser()` existe : génère entrées synthétiques `fallback_user_*` / `fallback_service_*` pour anciennes données locales.

---

## Modèle données — Demandes (`DemandeRecord`)

```ts
{
  id: string,              // `${Date.now()}_${random}`
  createdAt: string,       // ISO
  kind: "inscription" | "demande_service",
  profilType: "etudiant" | "entreprise" | "particulier",
  nom, prenom, email, telephone: string,
  payload: Record<string, unknown>,
  adminSeenAt?: string | null
}
```

Stockage : `unifresh_demandes` (JSON array dans localStorage).

Fonctions : `loadDemandes`, `saveDemandes`, `addDemande`, `isDemandeSeen`, `setDemandeSeen`, `markAllDemandesSeen`, `countUnseenDemandes`, `syncUserDemandesFromProfile`, `removeDemandesForUserEmail`.

---

## Clés localStorage (préfixe `unifresh_`)

| Clé | Usage |
|-----|--------|
| `unifresh_user` | Profil unique |
| `unifresh_session_email` | Session connexion |
| `unifresh_demandes` | Journal admin |
| `unifresh_site_settings` | Apparence |
| `unifresh_service_detail` | Brouillon formulaire service |
| `unifresh_service_weeks` | Créneaux par semaine (entreprise/particulier) |
| `unifresh_service_recurring` | Créneaux récurrents entreprise |
| `unifresh_entreprise_slot_mode` | `week` \| `recurring` |
| `unifresh_etudiant_weeks` | (non utilisé UI) |
| `unifresh_availability` | Ancien format dispos |
| `unifresh_service_request` | Legacy texte notes |
| `unifresh_client_prefs` | Legacy prefs (UI retirée) |

**Migration automatique** au chargement : anciennes clés `uniclean_*` → `unifresh_*` (`migrateStorageKeysFromUniclean` dans `storage.js`).

---

## API serveur mail (`server.js`)

| Route | Body | Effet |
|-------|------|--------|
| `POST /api/register/send-code` | email, prenom, nom, profilType, telephone, age?, canton?, ecole? | Code 6 chiffres, Map mémoire `pendingConfirmations` |
| `POST /api/register/verify-code` | email, code | Valide / supprime pending |
| `POST /api/login/send-code` | email | Code, `pendingLoginConfirmations` |
| `POST /api/login/verify-code` | email, code | Valide connexion |

Codes en **mémoire serveur** (perdus au redémarrage du serveur).

### Variables `.env` (voir `.env.example`)

- `MAIL_SERVER_PORT=8787`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`
- `MAIL_FROM=UniFresh <email>` (aligné avec `SMTP_USER` pour délivrabilité)
- `ADMIN_REVIEW_EMAIL` (existe encore dans .env, **plus utilisé** par le serveur actuel)

---

## Structure fichiers

```
uniclean/
├── index.html
├── package.json          # name: "unifresh"
├── vite.config.js
├── server.js
├── .env / .env.example
├── public/
│   └── uniclean-logo.png
├── scripts/trim-logo.mjs
└── src/
    ├── main.jsx
    ├── App.jsx           # ~95% de l’UI
    ├── storage.js
    ├── WeekCalendar.jsx  # CreneauxSoirWeekend
    ├── dates.js          # toISODate, startOfWeekMonday, addDays
    └── styles.css        # thème sombre vert, admin, advisor, landing, etc.
```

---

## Composants principaux dans `App.jsx`

| Composant | Rôle |
|-----------|------|
| `App` | Routage état : pas user → landing/admin ; user → dashboard profil |
| `RegistrationForm` | Landing inscription + connexion + bouton admin |
| `ClientServiceForm` | Formulaire service entreprise/particulier |
| `AdminPanel` | Admin code + services + panneau inscriptions |
| `AdminDemandeCard` | Carte demande + vu/non vu |
| `GlobalSettingsMenu` | Réglages apparence + compte |
| `AiAdvisorWidget` | Aide rule-based |
| `UniFreshLogo` | Logo header |

---

## Design / UX

- Thème **sombre vert** par défaut (variables CSS `--bg`, `--accent`, etc.)
- Cartes `.card`, boutons `.btn.primary` / `.ghost` / `.secondary`
- Formulaires accessibles, messages `.alert`, textes `.hint` (masquables)
- Admin : cartes non lues avec bordure jaune, chip inscriptions compact
- Responsive partiel (grilles créneaux, admin)

---

## Limitations connues (à garder en tête)

1. **Données locales navigateur** — pas de sync multi-appareils
2. **Un compte par navigateur** — pas de multi-utilisateurs serveur
3. **Codes e-mail** perdus si `npm run server` redémarre
4. **Pas de vrai backend métier** — l’admin lit le même localStorage que l’utilisateur sur **la même machine** (en pratique même navigateur)
5. Dossier projet toujours nommé `uniclean`
6. Réponses aide IA parfois incohérentes avec les fonctionnalités actuelles

---

## Historique des demandes client (chronologie utile)

1. Réglages = apparence seulement (plus prefs contact compte dans réglages ; compte dans section dédiée si connecté)
2. Conseiller IA → « Aide UniFresh », avatar rond, pas de sujets admin
3. Connexion par code e-mail comme inscription
4. Inscription : récap avant code ; **sans** validation admin
5. Admin : vu/non vu ; inscriptions dans petit bouton ; **services en priorité**
6. Rebrand **UniFresh** (textes) ; logo fichier reste `uniclean-logo.png`
7. Compte : édition profil + sync demandes ; suppression supprime demandes liées
8. Déconnexion avec confirmation
9. Landing : scroll inscription/connexion
10. Masquer intro « Demande de nettoyage » après envoi

---

## Pistes d’évolution fréquentes (non faites)

- Backend + BDD pour comptes et demandes multi-postes
- Admin sur autre machine que le client
- Calendrier disponibilités étudiant (code storage prêt)
- Corriger textes `getAdvisorAnswer`
- Renommer dossier `uniclean` → `unifresh`
- E-mail `@unifresh` si le client migre
- i18n EN (structure `ClientPreferences.language` existe mais inactive)

---

## Consignes pour la nouvelle IA

1. **Lire** `src/App.jsx`, `src/storage.js`, `server.js` avant de modifier.
2. **Toujours lancer** `npm run server` + `npm run dev` pour tester les e-mails.
3. **Ne pas casser** la migration `uniclean_*` → `unifresh_*`.
4. **Marque UI = UniFresh** ; fichier logo = `uniclean-logo.png` sauf demande explicite.
5. **Minimiser la portée** des diffs — gros fichier `App.jsx`, extraire des composants seulement si utile.
6. **Ne pas réintroduire** accept/refuse admin sans demande du client.
7. Après changements : `npm run build` pour vérifier la compilation.

---

## Premier message suggéré à coller avec ce prompt

> Je continue le site UniFresh (dossier `uniclean/`). Lis le prompt de reprise ci-dessus et les fichiers `src/App.jsx`, `src/storage.js`, `server.js`. Confirme que tu comprends l’architecture, puis [décris ici ta prochaine tâche].
