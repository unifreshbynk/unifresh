# UniFresh — code complet du site (copier-coller)

> Logo binaire : copier aussi `public/uniclean-logo.png` depuis le dossier du projet.
> Créer `.env` à partir de `.env.example` + mot de passe Gmail application.


---

## FICHIER: `index.html`

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="UniFresh — nettoyage pour étudiants, entreprises et particuliers : disponibilités ou demande de service." />
    <title>UniFresh — Nettoyage</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

---

## FICHIER: `package.json`

```json
{
  "name": "unifresh",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "server": "node server.js",
    "test-smtp": "node scripts/test-smtp.mjs"
  },
  "dependencies": {
    "dotenv": "^17.4.2",
    "express": "^5.2.1",
    "nodemailer": "^8.0.7",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.2",
    "vite": "^5.4.8"
  }
}
```

---

## FICHIER: `vite.config.js`

```javascript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8787",
        changeOrigin: true,
      },
    },
  },
});
```

---

## FICHIER: `server.js`

```javascript
import "dotenv/config";
import express from "express";
import nodemailer from "nodemailer";
import crypto from "crypto";

const app = express();
const PORT = Number(process.env.MAIL_SERVER_PORT || 8787);
app.use(express.json({ limit: "1mb" }));
const pendingConfirmations = new Map();
const pendingLoginConfirmations = new Map();

function createTransporter() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim().replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";

  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER et SMTP_PASS sont obligatoires.");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function buildSenderAddress() {
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const configuredFrom = String(process.env.MAIL_FROM || "").trim();
  // For best deliverability, keep "from" aligned with authenticated SMTP identity.
  return configuredFrom && configuredFrom.includes(smtpUser)
    ? configuredFrom
    : `UniFresh <${smtpUser}>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/** Message lisible pour l'interface (sans dump technique SMTP). */
function formatSmtpError(error) {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/535|BadCredentials|Username and Password not accepted/i.test(raw)) {
    const user = String(process.env.SMTP_USER || "").trim() || "votre compte Gmail";
    return (
      `Connexion Gmail refusée pour ${user}. ` +
      "Créez un mot de passe d'application Google (compte → Sécurité → Validation en 2 étapes → Mots de passe des applications), " +
      "collez-le dans SMTP_PASS du fichier .env, puis relancez npm run server."
    );
  }
  if (/EAUTH|authentication/i.test(raw)) {
    return "Authentification SMTP échouée. Vérifiez SMTP_USER et SMTP_PASS dans .env.";
  }
  return raw || "Erreur serveur";
}

app.post("/api/register/send-code", async (req, res) => {
  try {
    const { email, prenom, nom, profilType, telephone, age, canton, ecole } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: "Email requis." });

    const sender = buildSenderAddress();
    const replyTo = String(process.env.SMTP_USER || "").trim();
    const profileLabel =
      profilType === "entreprise" ? "Entreprise" : profilType === "particulier" ? "Particulier" : "Etudiant·e";
    const transporter = createTransporter();
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    pendingConfirmations.set(cleanEmail, { code, expiresAt });

    await transporter.sendMail({
      from: sender,
      replyTo,
      to: cleanEmail,
      subject: "Code de confirmation UniFresh",
      text: [
        "Bonjour,",
        "",
        "Merci pour votre inscription sur UniFresh.",
        "",
        `Voici votre code de confirmation : ${code}`,
        "",
        "Ce code est valable pendant 10 minutes.",
        "",
        "Veuillez saisir ce code dans le formulaire de confirmation afin de finaliser votre inscription.",
        "",
        "Recapitulatif de votre inscription",
        "",
        `Profil: ${profileLabel}`,
        telephone ? `Telephone: ${telephone}` : "",
        age != null ? `Age: ${age}` : "",
        canton ? `Canton: ${canton}` : "",
        ecole ? `Etablissement: ${ecole}` : "",
        "",
        "Vous recevez cet e-mail car une inscription a ete effectuee avec cette adresse e-mail. Si vous n'etes pas a l'origine de cette demande, aucune action n'est necessaire.",
        "",
        "Notre equipe vous contactera prochainement.",
        "",
        "Cordialement,",
        "",
        "L'equipe UniFresh",
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p>Bonjour,</p>
        <p>Merci pour votre inscription sur UniFresh.</p>
        <p>Voici votre code de confirmation : <strong>${escapeHtml(code)}</strong></p>
        <p>Ce code est valable pendant <strong>10 minutes</strong>.</p>
        <p>Veuillez saisir ce code dans le formulaire de confirmation afin de finaliser votre inscription.</p>
        <p><strong>Récapitulatif de votre inscription</strong></p>
        <ul>
          <li><strong>Profil :</strong> ${escapeHtml(profileLabel)}</li>
          ${telephone ? `<li><strong>Téléphone :</strong> ${escapeHtml(telephone)}</li>` : ""}
          ${age != null ? `<li><strong>Âge :</strong> ${escapeHtml(age)}</li>` : ""}
          ${canton ? `<li><strong>Canton :</strong> ${escapeHtml(canton)}</li>` : ""}
          ${ecole ? `<li><strong>Établissement :</strong> ${escapeHtml(ecole)}</li>` : ""}
        </ul>
        <p>Vous recevez cet e-mail car une inscription a été effectuée avec cette adresse e-mail. Si vous n’êtes pas à l’origine de cette demande, aucune action n’est nécessaire.</p>
        <p>Notre équipe vous contactera prochainement.</p>
        <p>Cordialement,</p>
        <p><strong>L’équipe UniFresh</strong></p>
      `,
    });

    return res.json({ ok: true, expiresInSeconds: 600 });
  } catch (error) {
    console.error("[SMTP] register/send-code:", error);
    return res.status(500).json({ error: formatSmtpError(error) });
  }
});

app.post("/api/register/verify-code", (req, res) => {
  const { email, code } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  if (!cleanEmail || !cleanCode) {
    return res.status(400).json({ error: "Email et code requis." });
  }

  const pending = pendingConfirmations.get(cleanEmail);
  if (!pending) {
    return res.status(404).json({ error: "Aucun code en attente pour cet e-mail." });
  }
  if (Date.now() > pending.expiresAt) {
    pendingConfirmations.delete(cleanEmail);
    return res.status(410).json({ error: "Code expiré. Demandez un nouveau code." });
  }
  if (pending.code !== cleanCode) {
    return res.status(401).json({ error: "Code invalide." });
  }

  pendingConfirmations.delete(cleanEmail);
  return res.json({ ok: true });
});

app.post("/api/login/send-code", async (req, res) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: "Email requis." });

    const sender = buildSenderAddress();
    const replyTo = String(process.env.SMTP_USER || "").trim();
    const transporter = createTransporter();
    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    pendingLoginConfirmations.set(cleanEmail, { code, expiresAt });

    await transporter.sendMail({
      from: sender,
      replyTo,
      to: cleanEmail,
      subject: "Code de connexion UniFresh",
      text: [
        "Bonjour,",
        "",
        "Voici votre code de connexion UniFresh :",
        code,
        "",
        "Ce code est valable pendant 10 minutes.",
        "",
        "Si vous n'etes pas a l'origine de cette demande, ignorez cet e-mail.",
      ].join("\n"),
      html: `
        <p>Bonjour,</p>
        <p>Voici votre code de connexion UniFresh :</p>
        <p><strong style="font-size:20px;letter-spacing:1px;">${escapeHtml(code)}</strong></p>
        <p>Ce code est valable pendant <strong>10 minutes</strong>.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>
      `,
    });

    return res.json({ ok: true, expiresInSeconds: 600 });
  } catch (error) {
    console.error("[SMTP] login/send-code:", error);
    return res.status(500).json({ error: formatSmtpError(error) });
  }
});

app.post("/api/login/verify-code", (req, res) => {
  const { email, code } = req.body || {};
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanCode = String(code || "").trim();
  if (!cleanEmail || !cleanCode) {
    return res.status(400).json({ error: "Email et code requis." });
  }

  const pending = pendingLoginConfirmations.get(cleanEmail);
  if (!pending) {
    return res.status(404).json({ error: "Aucun code en attente pour cet e-mail." });
  }
  if (Date.now() > pending.expiresAt) {
    pendingLoginConfirmations.delete(cleanEmail);
    return res.status(410).json({ error: "Code expiré. Demandez un nouveau code." });
  }
  if (pending.code !== cleanCode) {
    return res.status(401).json({ error: "Code invalide." });
  }

  pendingLoginConfirmations.delete(cleanEmail);
  return res.json({ ok: true });
});

// POST /api/admin/verify-code — vérifier code admin (secret uniquement côté serveur)
app.post("/api/admin/verify-code", (req, res) => {
  const { code } = req.body || {};
  const adminCode = String(process.env.ADMIN_CODE || "").trim();

  if (!code) {
    return res.status(400).json({ success: false, message: "Code requis" });
  }
  if (!adminCode) {
    return res.status(500).json({ success: false, message: "ADMIN_CODE non configuré sur le serveur." });
  }

  const cleanCode = String(code).trim();
  if (cleanCode === adminCode) {
    const token = `admin_${crypto.randomBytes(12).toString("hex")}`;
    const expiryMs = Number(process.env.ADMIN_TOKEN_EXPIRY || 3600000);
    const expiresAt = Date.now() + (Number.isFinite(expiryMs) ? expiryMs : 3600000);

    console.log("[ADMIN] Code correct — token émis:", `${token.slice(0, 10)}...`);

    return res.json({
      success: true,
      token,
      expiresAt,
    });
  }

  console.log("[ADMIN] Code incorrect");
  return res.status(401).json({
    success: false,
    message: "Code admin invalide",
  });
});

app.listen(PORT, () => {
  console.log(`UniFresh mail server running on http://localhost:${PORT}`);
  const user = String(process.env.SMTP_USER || "").trim();
  if (user) {
    createTransporter()
      .verify()
      .then(() => console.log(`[SMTP] Connexion OK pour ${user}`))
      .catch((err) => {
        console.error(`[SMTP] Échec connexion pour ${user}:`, formatSmtpError(err));
      });
  }
});
```

---

## FICHIER: `.env.example`

```
MAIL_SERVER_PORT=8787
APP_BASE_URL=http://localhost:8787
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-user@example.com
# Mot de passe d'application Google (16 caractères), PAS le mot de passe Gmail normal
SMTP_PASS=your-gmail-app-password
MAIL_FROM=UniFresh <no-reply@unifresh.ch>
ADMIN_REVIEW_EMAIL=admin@example.com
ADMIN_CODE=your-admin-secret-code
ADMIN_TOKEN_EXPIRY=3600000
```

---

## FICHIER: `src/main.jsx`

```javascript
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## FICHIER: `src/dates.js`

```javascript
/** @param {Date} d */
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lundi de la semaine contenant `date` (locale) */
export function startOfWeekMonday(date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** @param {Date} monday */
export function addDays(monday, n) {
  const d = new Date(monday);
  d.setDate(d.getDate() + n);
  return d;
}
```

---

## FICHIER: `src/WeekCalendar.jsx`

```javascript
import { CRENEAU_SOIR_WEEKEND } from "./storage";
import { addDays } from "./dates";

function formatWeekRange(monday) {
  const end = addDays(monday, 6);
  const opts = { day: "numeric", month: "long" };
  return `${monday.toLocaleDateString("fr-FR", opts)} – ${end.toLocaleDateString("fr-FR", {
    ...opts,
    year: "numeric",
  })}`;
}

/**
 * Uniquement : soir en semaine, samedi, dimanche.
 * @param {{
 *   showWeekNav: boolean,
 *   weekAnchor?: Date,
 *   setWeekAnchor?: (fn: (d: Date) => Date) => void,
 *   onToggleTag: (tagId: string) => void,
 *   isTagOn: (tagId: string) => boolean,
 *   hint: string,
 *   lead: string,
 *   recurringTitle?: string,
 *   recurringSubtitle?: string,
 * }} props
 */
export function CreneauxSoirWeekend({
  showWeekNav,
  weekAnchor,
  setWeekAnchor,
  onToggleTag,
  isTagOn,
  hint,
  lead,
  recurringTitle,
  recurringSubtitle,
}) {
  return (
    <section className="card calendar-card etudiant-calendar">
      {showWeekNav && weekAnchor && setWeekAnchor ? (
        <div className="week-toolbar">
          <button
            type="button"
            className="btn secondary"
            onClick={() => setWeekAnchor((w) => addDays(w, -7))}
            aria-label="Semaine précédente"
          >
            ← Semaine précédente
          </button>
          <h3 className="week-title">Semaine du {formatWeekRange(weekAnchor)}</h3>
          <button
            type="button"
            className="btn secondary"
            onClick={() => setWeekAnchor((w) => addDays(w, 7))}
            aria-label="Semaine suivante"
          >
            Semaine suivante →
          </button>
        </div>
      ) : (
        <div className="recurring-slot-header">
          <h3 className="recurring-slot-title">{recurringTitle || "Besoin régulier"}</h3>
          {recurringSubtitle ? <p className="recurring-slot-sub">{recurringSubtitle}</p> : null}
        </div>
      )}

      {lead ? <p className="etudiant-calendar-lead">{lead}</p> : null}
      <p className="hint">Cliquez sur un créneau pour l'activer, recliquez pour le retirer.</p>

      <div className="etudiant-creneau-grid">
        {CRENEAU_SOIR_WEEKEND.map((c) => {
          const on = isTagOn(c.id);
          return (
            <button
              key={c.id}
              type="button"
              className={`etudiant-creneau-card ${on ? "on" : ""}`}
              onClick={() => onToggleTag(c.id)}
              aria-pressed={on}
            >
              <span className="etudiant-creneau-label">{c.label}</span>
              <span className="etudiant-creneau-hint">{c.hint}</span>
              <span className="etudiant-creneau-state">{on ? "✓ Choisi" : "Cliquez pour choisir"}</span>
            </button>
          );
        })}
      </div>
      <p className="hint">{hint}</p>
    </section>
  );
}
```

---

## FICHIER: `src/storage.js`

```javascript
const USER_KEY = "unifresh_user";
const SESSION_EMAIL_KEY = "unifresh_session_email";
const AVAIL_KEY = "unifresh_availability";
const ETUDIANT_WEEKS_KEY = "unifresh_etudiant_weeks";
const SERVICE_REQ_KEY = "unifresh_service_request";
const SERVICE_DETAIL_KEY = "unifresh_service_detail";
const SERVICE_WEEK_KEY = "unifresh_service_weeks";
const SERVICE_RECURRING_KEY = "unifresh_service_recurring";
const ENTREPRISE_SLOT_MODE_KEY = "unifresh_entreprise_slot_mode";
const DEMANDES_KEY = "unifresh_demandes";
const SITE_SETTINGS_KEY = "unifresh_site_settings";
const CLIENT_PREFS_KEY = "unifresh_client_prefs";

const STORAGE_KEY_MIGRATIONS = [
  ["uniclean_user", USER_KEY],
  ["uniclean_session_email", SESSION_EMAIL_KEY],
  ["uniclean_availability", AVAIL_KEY],
  ["uniclean_etudiant_weeks", ETUDIANT_WEEKS_KEY],
  ["uniclean_service_request", SERVICE_REQ_KEY],
  ["uniclean_service_detail", SERVICE_DETAIL_KEY],
  ["uniclean_service_weeks", SERVICE_WEEK_KEY],
  ["uniclean_service_recurring", SERVICE_RECURRING_KEY],
  ["uniclean_entreprise_slot_mode", ENTREPRISE_SLOT_MODE_KEY],
  ["uniclean_demandes", DEMANDES_KEY],
  ["uniclean_site_settings", SITE_SETTINGS_KEY],
  ["uniclean_client_prefs", CLIENT_PREFS_KEY],
];

function migrateStorageKeysFromUniclean() {
  if (typeof localStorage === "undefined") return;
  for (const [legacyKey, nextKey] of STORAGE_KEY_MIGRATIONS) {
    const legacyValue = localStorage.getItem(legacyKey);
    if (legacyValue == null) continue;
    if (localStorage.getItem(nextKey) == null) {
      localStorage.setItem(nextKey, legacyValue);
    }
    localStorage.removeItem(legacyKey);
  }
}

migrateStorageKeysFromUniclean();

/** @typedef {"leger" | "moyen" | "gros"} IntensiteNettoyage */

/**
 * @typedef {{
 *   surfaceM2: string,
 *   intensite: string,
 *   typeLieu: string,
 *   typeLieuAutre: string,
 *   detailsLavage: string,
 *   notesComplementaires: string,
 *   adresse: string
 * }} ServiceDetailForm
 */

export const TYPE_LIEU_OPTIONS = [
  { id: "bureaux", label: "Bureaux", desc: "Open space, cabinets, salles de réunion…" },
  {
    id: "atelier_construction",
    label: "Atelier / chantier / construction",
    desc: "Poussière, traces de travaux, matériaux…",
  },
  { id: "commerce", label: "Commerce / boutique", desc: "Vitrine, salle d’exposition…" },
  { id: "entrepot", label: "Entrepôt / logistique", desc: "Grands volumes, allées…" },
  { id: "industriel", label: "Locaux industriels", desc: "Atelier machine, chaîne de prod…" },
  { id: "sante_education", label: "École / crèche / santé", desc: "Normes d’hygiène renforcées…" },
  { id: "particulier_logement", label: "Logement (maison ou appartement)", desc: "Résidence principale ou secondaire" },
  { id: "parties_communes", label: "Parties communes d’immeuble", desc: "Hall, cage d’escalier…" },
  { id: "autre", label: "Autre", desc: "Précisez dans le champ dédié" },
];

export const INTENSITE_OPTIONS = [
  {
    id: "leger",
    label: "Nettoyage léger",
    desc: "Entretien courant, peu de taches, locaux déjà corrects.",
  },
  {
    id: "moyen",
    label: "Nettoyage moyen",
    desc: "Vaisselle / sanitaires marqués, poussière accumulée, besoin classique.",
  },
  {
    id: "gros",
    label: "Gros travail",
    desc: "Remise en état, forte salissure, après travaux ou longue négligence.",
  },
];

/** @typedef {"etudiant" | "entreprise" | "particulier"} ProfilType */

/**
 * @typedef {{
 *   email: string,
 *   prenom: string,
 *   nom: string,
 *   telephone: string,
 *   age: number | null,
 *   profilType: ProfilType,
 *   canton: string,
 *   ecole: string
 * }} UserProfile
 */

/** Cantons suisses (valeur = abréviation officielle). */
export const SWISS_CANTONS = [
  { value: "AG", label: "Argovie" },
  { value: "AI", label: "Appenzell Rhodes-Intérieures" },
  { value: "AR", label: "Appenzell Rhodes-Extérieures" },
  { value: "BE", label: "Berne" },
  { value: "BL", label: "Bâle-Campagne" },
  { value: "BS", label: "Bâle-Ville" },
  { value: "FR", label: "Fribourg" },
  { value: "GE", label: "Genève" },
  { value: "GL", label: "Glaris" },
  { value: "GR", label: "Grisons" },
  { value: "JU", label: "Jura" },
  { value: "LU", label: "Lucerne" },
  { value: "NE", label: "Neuchâtel" },
  { value: "NW", label: "Nidwald" },
  { value: "OW", label: "Obwald" },
  { value: "SG", label: "Saint-Gall" },
  { value: "SH", label: "Schaffhouse" },
  { value: "SO", label: "Soleure" },
  { value: "SZ", label: "Schwyz" },
  { value: "TG", label: "Thurgovie" },
  { value: "TI", label: "Tessin" },
  { value: "UR", label: "Uri" },
  { value: "VD", label: "Vaud" },
  { value: "VS", label: "Valais" },
  { value: "ZG", label: "Zoug" },
  { value: "ZH", label: "Zurich" },
];

export function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** @param {UserProfile} user */
export function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearUser() {
  localStorage.removeItem(USER_KEY);
}

/** @returns {string | null} */
export function loadSessionEmail() {
  try {
    return localStorage.getItem(SESSION_EMAIL_KEY);
  } catch {
    return null;
  }
}

/** @param {string} email */
export function saveSessionEmail(email) {
  localStorage.setItem(SESSION_EMAIL_KEY, email);
}

export function clearSessionEmail() {
  localStorage.removeItem(SESSION_EMAIL_KEY);
}

/**
 * Ancien format dispos (jour → créneaux) — conservé pour compatibilité éventuelle.
 * @returns {Record<string, Record<string, string[]>>}
 */
export function loadAvailability() {
  try {
    const raw = localStorage.getItem(AVAIL_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** @param {Record<string, Record<string, string[]>>} data */
export function saveAvailability(data) {
  localStorage.setItem(AVAIL_KEY, JSON.stringify(data));
}

/** Seuls créneaux proposés partout (étudiants, entreprises, particuliers). */
export const CRENEAU_SOIR_WEEKEND = [
  {
    id: "soir_semaine",
    label: "Soir durant la semaine",
    hint: "Exemple: apres 18h en semaine",
  },
  {
    id: "samedi",
    label: "Samedi",
    hint: "Disponible uniquement le samedi",
  },
  {
    id: "dimanche",
    label: "Dimanche",
    hint: "Disponible uniquement le dimanche",
  },
];

/** @deprecated utiliser CRENEAU_SOIR_WEEKEND */
export const ETUDIANT_CRENEAUX = CRENEAU_SOIR_WEEKEND;

/**
 * Clé = lundi de la semaine (YYYY-MM-DD), valeur = liste d’ids parmi ETUDIANT_CRENEAUX.
 * @returns {Record<string, string[]>}
 */
export function loadEtudiantWeeks() {
  try {
    const raw = localStorage.getItem(ETUDIANT_WEEKS_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const allowed = new Set(CRENEAU_SOIR_WEEKEND.map((c) => c.id));
    /** @type {Record<string, string[]>} */
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) {
        const filtered = v.filter((id) => allowed.has(id)).sort();
        if (filtered.length) out[k] = filtered;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** @param {Record<string, string[]>} data */
export function saveEtudiantWeeks(data) {
  localStorage.setItem(ETUDIANT_WEEKS_KEY, JSON.stringify(data));
}

export const SLOT_DEFS = [
  { id: "matin", label: "Matin", hint: "8h–12h" },
  { id: "apresmidi", label: "Après-midi", hint: "12h–18h" },
  { id: "soir", label: "Soir", hint: "18h–22h" },
];

export const DAY_LABELS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

export const PROFIL_LABELS = {
  etudiant: "Étudiant·e",
  entreprise: "Entreprise",
  particulier: "Particulier",
};

/** @returns {string | null} */
export function loadServiceRequestText() {
  try {
    return localStorage.getItem(SERVICE_REQ_KEY);
  } catch {
    return null;
  }
}

/** @param {string} text */
export function saveServiceRequestText(text) {
  localStorage.setItem(SERVICE_REQ_KEY, text);
}

/** @returns {ServiceDetailForm} */
export function loadServiceDetail() {
  try {
    const raw = localStorage.getItem(SERVICE_DETAIL_KEY);
    if (raw) {
      const o = JSON.parse(raw);
      return {
        surfaceM2: String(o.surfaceM2 ?? ""),
        intensite: String(o.intensite ?? ""),
        typeLieu: String(o.typeLieu ?? ""),
        typeLieuAutre: String(o.typeLieuAutre ?? ""),
        detailsLavage: String(o.detailsLavage ?? ""),
        notesComplementaires: String(o.notesComplementaires ?? ""),
        adresse: String(o.adresse ?? ""),
      };
    }
  } catch {
    /* ignore */
  }
  const legacy = loadServiceRequestText();
  return {
    surfaceM2: "",
    intensite: "",
    typeLieu: "",
    typeLieuAutre: "",
    detailsLavage: "",
    notesComplementaires: legacy || "",
    adresse: "",
  };
}

/** @param {ServiceDetailForm} data */
export function saveServiceDetail(data) {
  localStorage.setItem(SERVICE_DETAIL_KEY, JSON.stringify(data));
}

/**
 * Créneaux entreprise / particulier : clé = lundi (YYYY-MM-DD), valeur = ids parmi CRENEAU_SOIR_WEEKEND.
 * @returns {Record<string, string[]>}
 */
export function loadServiceWeeks() {
  try {
    const raw = localStorage.getItem(SERVICE_WEEK_KEY);
    if (!raw) return {};
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object" || Array.isArray(o)) return {};
    const allowed = new Set(CRENEAU_SOIR_WEEKEND.map((c) => c.id));
    /** @type {Record<string, string[]>} */
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (Array.isArray(v)) {
        out[k] = v.filter((id) => allowed.has(id)).sort();
      }
    }
    return out;
  } catch {
    return {};
  }
}

/** @param {Record<string, string[]>} data */
export function saveServiceWeeks(data) {
  localStorage.setItem(SERVICE_WEEK_KEY, JSON.stringify(data));
}

/**
 * Besoin régulier entreprise : mêmes trois créneaux, répétés chaque semaine.
 * @returns {string[]}
 */
export function loadServiceRecurringTags() {
  try {
    const raw = localStorage.getItem(SERVICE_RECURRING_KEY);
    if (!raw) return [];
    const o = JSON.parse(raw);
    const allowed = new Set(CRENEAU_SOIR_WEEKEND.map((c) => c.id));
    if (Array.isArray(o)) return o.filter((id) => allowed.has(id)).sort();
  } catch {
    /* ignore */
  }
  return [];
}

/** @param {string[]} tags */
export function saveServiceRecurringTags(tags) {
  localStorage.setItem(SERVICE_RECURRING_KEY, JSON.stringify(tags));
}

/** @returns {"week" | "recurring"} */
export function loadEntrepriseSlotMode() {
  try {
    const v = localStorage.getItem(ENTREPRISE_SLOT_MODE_KEY);
    if (v === "recurring" || v === "week") return v;
  } catch {
    /* ignore */
  }
  return "week";
}

/** @param {"week" | "recurring"} mode */
export function saveEntrepriseSlotMode(mode) {
  localStorage.setItem(ENTREPRISE_SLOT_MODE_KEY, mode);
}

/**
 * Réglages d'apparence (sans compte), stockés localement.
 * @typedef {{
 *   theme: "dark" | "light",
 *   fontSize: "normal" | "large",
 *   density: "comfortable" | "compact",
 *   showHints: boolean,
 *   highContrast: boolean,
 *   reducedMotion: boolean
 * }} SiteSettings
 */

/** @returns {SiteSettings} */
export function loadSiteSettings() {
  const defaults = {
    theme: "dark",
    fontSize: "normal",
    density: "comfortable",
    showHints: true,
    highContrast: false,
    reducedMotion: false,
  };
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_KEY);
    if (!raw) return defaults;
    const o = JSON.parse(raw);
    return {
      theme: o.theme === "light" ? "light" : "dark",
      fontSize: o.fontSize === "large" ? "large" : "normal",
      density: o.density === "compact" ? "compact" : "comfortable",
      showHints: o.showHints !== false,
      highContrast: o.highContrast === true,
      reducedMotion: o.reducedMotion === true,
    };
  } catch {
    return defaults;
  }
}

/** @param {SiteSettings} settings */
export function saveSiteSettings(settings) {
  localStorage.setItem(SITE_SETTINGS_KEY, JSON.stringify(settings));
}

/**
 * @typedef {{
 *   contactMethod: "telephone" | "email" | "whatsapp",
 *   preferredTime: "matin" | "apresmidi" | "soir",
 *   notifyByEmail: boolean,
 *   notifyBySms: boolean,
 *   reminderBeforeVisit: boolean,
 *   language: "fr" | "en",
 *   marketingConsent: boolean
 * }} ClientPreferences
 */

/** @param {string} email @returns {ClientPreferences} */
export function loadClientPreferences(email) {
  const defaults = {
    contactMethod: "telephone",
    preferredTime: "apresmidi",
    notifyByEmail: true,
    notifyBySms: true,
    reminderBeforeVisit: true,
    language: "fr",
    marketingConsent: false,
  };
  const key = String(email || "").trim().toLowerCase();
  if (!key) return defaults;
  try {
    const raw = localStorage.getItem(CLIENT_PREFS_KEY);
    if (!raw) return defaults;
    const all = JSON.parse(raw);
    const p = all && typeof all === "object" ? all[key] : null;
    if (!p || typeof p !== "object") return defaults;
    return {
      contactMethod:
        p.contactMethod === "email" || p.contactMethod === "whatsapp" ? p.contactMethod : "telephone",
      preferredTime:
        p.preferredTime === "matin" || p.preferredTime === "soir" ? p.preferredTime : "apresmidi",
      notifyByEmail: p.notifyByEmail !== false,
      notifyBySms: p.notifyBySms !== false,
      reminderBeforeVisit: p.reminderBeforeVisit !== false,
      language: p.language === "en" ? "en" : "fr",
      marketingConsent: p.marketingConsent === true,
    };
  } catch {
    return defaults;
  }
}

/** @param {string} email @param {ClientPreferences} prefs */
export function saveClientPreferences(email, prefs) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return;
  try {
    const raw = localStorage.getItem(CLIENT_PREFS_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const next = all && typeof all === "object" ? { ...all, [key]: prefs } : { [key]: prefs };
    localStorage.setItem(CLIENT_PREFS_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * @typedef {{
 *   id: string,
 *   createdAt: string,
 *   kind: "inscription" | "demande_service",
 *   profilType: ProfilType,
 *   nom: string,
 *   prenom: string,
 *   email: string,
 *   telephone: string,
 *   payload: Record<string, unknown>,
 *   adminSeenAt?: string | null
 * }} DemandeRecord
 */

/** @param {DemandeRecord} d */
export function isDemandeSeen(d) {
  return Boolean(d.adminSeenAt);
}

/** @param {string} demandeId @param {boolean} seen */
export function setDemandeSeen(demandeId, seen) {
  const all = loadDemandes();
  const idx = all.findIndex((d) => d.id === demandeId);
  if (idx < 0) return false;
  all[idx] = {
    ...all[idx],
    adminSeenAt: seen ? new Date().toISOString() : null,
  };
  saveDemandes(all);
  return true;
}

/** @returns {number} */
export function markAllDemandesSeen() {
  const all = loadDemandes();
  if (all.length === 0) return 0;
  const now = new Date().toISOString();
  let count = 0;
  const next = all.map((d) => {
    if (d.adminSeenAt) return d;
    count += 1;
    return { ...d, adminSeenAt: now };
  });
  if (count > 0) saveDemandes(next);
  return count;
}

/** @returns {number} */
export function countUnseenDemandes() {
  return loadDemandes().filter((d) => !isDemandeSeen(d)).length;
}

/** @returns {DemandeRecord[]} */
export function loadDemandes() {
  try {
    const raw = localStorage.getItem(DEMANDES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {DemandeRecord[]} records */
export function saveDemandes(records) {
  localStorage.setItem(DEMANDES_KEY, JSON.stringify(records));
}

/**
 * @param {{
 *   kind: "inscription" | "demande_service",
 *   profilType: ProfilType,
 *   nom: string,
 *   prenom: string,
 *   email: string,
 *   telephone: string,
 *   payload: Record<string, unknown>
 * }} input
 */
export function addDemande(input) {
  const next = [
    ...loadDemandes(),
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      ...input,
    },
  ];
  saveDemandes(next);
}

const ADMIN_TOKEN_KEY = "unifresh_admin_token";

/** @param {string} code */
export async function verifyAdminCode(code) {
  try {
    const res = await fetch("/api/admin/verify-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();

    if (data.success) {
      localStorage.setItem(
        ADMIN_TOKEN_KEY,
        JSON.stringify({
          token: data.token,
          expiresAt: data.expiresAt,
        })
      );
      console.log("[ADMIN] Token sauvegardé, expire:", new Date(data.expiresAt).toLocaleTimeString());
      return true;
    }

    console.log("[ADMIN] Erreur:", data.message);
    return false;
  } catch (err) {
    console.error("[ADMIN] Erreur fetch verify-code:", err);
    return false;
  }
}

export function isAdminTokenValid() {
  try {
    const raw = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!raw) return false;
    const stored = JSON.parse(raw);
    if (!stored?.expiresAt) return false;

    const isValid = stored.expiresAt > Date.now();
    if (!isValid) {
      console.log("[ADMIN] Token expiré");
      localStorage.removeItem(ADMIN_TOKEN_KEY);
    }
    return isValid;
  } catch {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    return false;
  }
}

export function clearAdminToken() {
  console.log("[ADMIN] Token supprimé");
  localStorage.removeItem(ADMIN_TOKEN_KEY);
}

/** @returns {number | null} */
export function getAdminTokenExpiresAt() {
  try {
    const raw = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw);
    return stored?.expiresAt ?? null;
  } catch {
    return null;
  }
}

/** @param {UserProfile} user */
export function syncUserDemandesFromProfile(user) {
  const key = String(user.email || "").trim().toLowerCase();
  if (!key) return false;
  const all = loadDemandes();
  let changed = false;
  const profileUpdatedAt = new Date().toISOString();
  const inscriptionPayload =
    user.profilType === "etudiant"
      ? {
          age: user.age ?? null,
          canton: user.canton || "",
          ecole: user.ecole || "",
          profileUpdatedAt,
        }
      : {
          age: null,
          canton: "",
          ecole: "",
          profileUpdatedAt,
        };
  const next = all.map((d) => {
    if (String(d.email || "").trim().toLowerCase() !== key) return d;
    changed = true;
    return {
      ...d,
      profilType: user.profilType,
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
      payload:
        d.kind === "inscription"
          ? { ...d.payload, ...inscriptionPayload }
          : { ...d.payload, profileUpdatedAt },
    };
  });
  if (changed) saveDemandes(next);
  return changed;
}

/** @param {string} email */
export function removeDemandesForUserEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return false;
  const all = loadDemandes();
  const next = all.filter((d) => String(d.email || "").trim().toLowerCase() !== key);
  if (next.length === all.length) return false;
  saveDemandes(next);
  return true;
}
```

---

## FICHIER: `src/styles.css`

```css
:root {
  --bg: #0f1714;
  --bg-card: #16231f;
  --bg-elevated: #1c2e28;
  --text: #e8f2ed;
  --muted: #8aa99a;
  --accent: #3ecf8e;
  --accent-dim: #2a9d67;
  --accent-glow: rgba(62, 207, 142, 0.25);
  --border: rgba(255, 255, 255, 0.08);
  --radius: 14px;
  font-family: "DM Sans", system-ui, sans-serif;
}

*,
*::before,
*::after {
  box-sizing: border-box;
}

html {
  color-scheme: dark;
  scroll-behavior: smooth;
}

.reduced-motion {
  scroll-behavior: auto;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(62, 207, 142, 0.12), transparent),
    radial-gradient(800px 400px at 100% 0%, rgba(42, 157, 103, 0.08), transparent),
    var(--bg);
  color: var(--text);
  line-height: 1.5;
}

h1,
h2,
h3 {
  font-family: "Fraunces", Georgia, serif;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.5rem;
}

h1 {
  font-size: 1.85rem;
}

h2 {
  font-size: 1.35rem;
}

h3.week-title {
  font-size: 1.1rem;
  text-align: center;
  flex: 1;
  margin: 0 0.75rem;
}

.shell {
  max-width: 1040px;
  margin: 0 auto;
  padding: 1.5rem clamp(1rem, 4vw, 2rem) 2rem;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.shell.landing .foot {
  margin-top: auto;
}

.top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.75rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.brand.large h1 {
  font-size: 2.25rem;
}

.brand p {
  margin: 0.2rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  flex-shrink: 0;
  display: block;
  overflow: hidden;
  background: transparent;
  position: relative;
}

.brand.large .brand-logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
}

.brand-logo-img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 114%;
  height: 114%;
  max-width: none;
  transform: translate(-50%, -50%);
  display: block;
  object-fit: cover;
}

.user-strip {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.user-logout-confirm {
  width: min(100%, 280px);
  text-align: left;
}

.user-name {
  font-weight: 600;
}

.user-meta {
  font-size: 0.85rem;
  color: var(--muted);
}

.user-badge {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--accent);
  border: 1px solid rgba(62, 207, 142, 0.45);
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  align-self: flex-end;
}

.hero {
  margin-bottom: 2rem;
}

.tagline {
  color: var(--muted);
  max-width: 36ch;
  margin: 0.35rem 0 0;
  font-size: 1.05rem;
}

.lead {
  font-size: 1.05rem;
  color: var(--muted);
  max-width: 56ch;
  margin: 1.25rem 0 0;
}

.split {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: 1fr 1.1fr;
  align-items: start;
}

@media (max-width: 820px) {
  .split {
    grid-template-columns: 1fr;
  }

  .week-toolbar {
    flex-direction: column;
  }

  h3.week-title {
    order: -1;
    margin: 0 0 0.5rem;
  }
}

.card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.35rem 1.5rem;
}

.intro p {
  margin: 0;
  color: var(--muted);
}

.main {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  flex: 1;
}

.pitch ul {
  margin: 0.75rem 0 0;
  padding-left: 1.2rem;
  color: var(--muted);
}

.pitch h3 {
  margin-top: 1rem;
  margin-bottom: 0.4rem;
  font-size: 1rem;
}

.pitch p {
  margin: 0;
  color: var(--muted);
  line-height: 1.55;
}

.pitch li {
  margin-bottom: 0.35rem;
}

.form-card h2 {
  margin-bottom: 1rem;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--muted);
}

.form input {
  font: inherit;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
}

.form select {
  font: inherit;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
}

.form input:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: transparent;
}

.profil-fieldset {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 0.85rem 1rem 1rem;
  margin: 0;
}

.profil-fieldset legend {
  padding: 0 0.35rem;
  font-size: 0.9rem;
  color: var(--muted);
}

.profil-options {
  display: grid;
  gap: 0.65rem;
  margin-top: 0.25rem;
}

@media (min-width: 560px) {
  .profil-options {
    grid-template-columns: repeat(3, 1fr);
  }
}

.profil-option {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.55rem;
  row-gap: 0.1rem;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  align-items: start;
}

.profil-option:hover {
  border-color: rgba(62, 207, 142, 0.35);
}

.profil-option.selected {
  border-color: var(--accent);
  background: rgba(62, 207, 142, 0.08);
}

.profil-option input {
  grid-row: 1 / 3;
  margin-top: 0.2rem;
  accent-color: var(--accent);
  width: 1.05rem;
  height: 1.05rem;
}

.profil-option-title {
  grid-column: 2;
  grid-row: 1;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text);
}

.profil-option-desc {
  grid-column: 2;
  grid-row: 2;
  font-size: 0.78rem;
  color: var(--muted);
  line-height: 1.35;
}

.service-request h2 {
  margin-bottom: 0.75rem;
}

.service-textarea-label {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.9rem;
  color: var(--muted);
  margin-bottom: 0.75rem;
}

.service-textarea {
  font: inherit;
  padding: 0.75rem 0.9rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
  resize: vertical;
  min-height: 6.5rem;
}

.service-textarea:focus {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: transparent;
}

.service-request .btn.secondary {
  align-self: flex-start;
}

.client-service-page {
  padding: 1.35rem 1.5rem 1.6rem;
}

.client-service-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: 1.45rem;
  margin: 0 0 0.5rem;
}

.client-service-lead {
  margin: 0 0 1.25rem;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.client-service-form .btn.primary {
  margin-top: 0.5rem;
}

.form-section {
  margin-bottom: 1.35rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--border);
}

.form-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0.5rem;
  padding-bottom: 0;
}

.form-section-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0 0 0.75rem;
  color: var(--text);
}

.intensite-grid {
  display: grid;
  gap: 0.65rem;
}

@media (min-width: 720px) {
  .intensite-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.intensite-option {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  column-gap: 0.55rem;
  row-gap: 0.12rem;
  padding: 0.85rem 0.95rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
  align-items: start;
}

.intensite-option:hover {
  border-color: rgba(62, 207, 142, 0.35);
}

.intensite-option.selected {
  border-color: var(--accent);
  background: rgba(62, 207, 142, 0.08);
}

.intensite-option input {
  grid-row: 1 / 3;
  margin-top: 0.15rem;
  accent-color: var(--accent);
  width: 1.05rem;
  height: 1.05rem;
}

.intensite-option-title {
  grid-column: 2;
  grid-row: 1;
  font-weight: 600;
  font-size: 0.95rem;
}

.intensite-option-desc {
  grid-column: 2;
  grid-row: 2;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.4;
}

.type-lieu-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.type-lieu-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  cursor: pointer;
  transition: border-color 0.15s, background 0.15s;
}

.type-lieu-row:hover {
  border-color: rgba(62, 207, 142, 0.3);
}

.type-lieu-row.selected {
  border-color: var(--accent);
  background: rgba(62, 207, 142, 0.06);
}

.type-lieu-row input {
  margin-top: 0.25rem;
  accent-color: var(--accent);
  flex-shrink: 0;
}

.type-lieu-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.type-lieu-label {
  font-weight: 600;
  font-size: 0.92rem;
}

.type-lieu-desc {
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.35;
}

.type-lieu-autre {
  margin-top: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: var(--muted);
}

.success-banner {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: rgba(62, 207, 142, 0.12);
  border: 1px solid rgba(62, 207, 142, 0.35);
  color: #b8f5d9;
  font-size: 0.9rem;
}

.alert {
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: rgba(220, 80, 80, 0.15);
  border: 1px solid rgba(220, 80, 80, 0.35);
  color: #ffb4b4;
  font-size: 0.9rem;
}

.btn {
  font: inherit;
  cursor: pointer;
  border-radius: 10px;
  padding: 0.65rem 1rem;
  border: 1px solid transparent;
  transition: background 0.15s, border-color 0.15s, transform 0.1s;
}

.btn:active {
  transform: scale(0.98);
}

.btn.primary {
  background: linear-gradient(145deg, var(--accent), var(--accent-dim));
  color: #081410;
  font-weight: 600;
  margin-top: 0.25rem;
}

.btn.primary:hover {
  filter: brightness(1.05);
}

.btn.secondary {
  background: var(--bg-elevated);
  border-color: var(--border);
  color: var(--text);
}

.btn.secondary:hover {
  border-color: rgba(255, 255, 255, 0.2);
}

.btn.ghost {
  background: transparent;
  border-color: var(--border);
  color: var(--muted);
  font-size: 0.85rem;
  padding: 0.4rem 0.75rem;
}

.btn.ghost:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.2);
}

.settings-wrap {
  position: relative;
}

.landing-settings-row {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.8rem;
}

.landing-scroll-nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

#landing-inscription,
#landing-connexion {
  scroll-margin-top: 1rem;
}

.landing-connexion {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.settings-panel {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  z-index: 30;
  min-width: 290px;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.settings-panel-wide {
  min-width: 320px;
  max-height: min(82vh, 640px);
  overflow: auto;
}

.settings-section-divider {
  border-top: 1px solid var(--border);
  padding-top: 0.65rem;
  margin-top: 0.25rem;
}

.settings-section-divider h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.settings-danger-box {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(220, 80, 80, 0.35);
  background: rgba(220, 80, 80, 0.12);
}

.settings-danger-box p {
  margin: 0 0 0.55rem;
  font-size: 0.9rem;
}

.settings-danger-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.settings-danger-btn {
  color: #ffb4b4;
  border-color: rgba(220, 80, 80, 0.45);
}

.settings-panel input:disabled {
  opacity: 0.75;
  cursor: not-allowed;
}

.settings-panel h3 {
  margin: 0 0 0.2rem;
  font-size: 1rem;
}

.settings-panel label {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.84rem;
  color: var(--muted);
}

.settings-panel .settings-check {
  flex-direction: row;
  align-items: center;
  gap: 0.45rem;
}

.settings-panel input[type="checkbox"] {
  accent-color: var(--accent);
}

.advisor-wrap {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 60;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.advisor-toggle {
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.22);
}

.advisor-toggle-round {
  width: 62px;
  height: 62px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
}

.advisor-avatar {
  width: 44px;
  height: 44px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 25px;
  background: linear-gradient(145deg, rgba(62, 207, 142, 0.2), rgba(42, 157, 103, 0.14));
}

.advisor-toggle-round:hover {
  border-color: rgba(62, 207, 142, 0.5);
}

.advisor-panel {
  position: relative;
  z-index: 2;
  width: min(380px, calc(100vw - 2rem));
  padding: 0.95rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  box-shadow: 0 14px 28px rgba(0, 0, 0, 0.25);
}

.advisor-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1;
  border: none;
  background: transparent;
  padding: 0;
  margin: 0;
  cursor: default;
}

.advisor-panel h3 {
  margin: 0;
}

.advisor-close {
  position: absolute;
  top: 0.45rem;
  right: 0.45rem;
  padding: 0.2rem 0.45rem;
  line-height: 1;
  font-size: 1rem;
}

.advisor-chat {
  max-height: 270px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding-right: 0.1rem;
}

.advisor-msg {
  margin: 0;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  font-size: 0.84rem;
  line-height: 1.4;
}

.advisor-msg.assistant {
  align-self: flex-start;
  max-width: 92%;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
}

.advisor-msg.user {
  align-self: flex-end;
  max-width: 92%;
  background: rgba(62, 207, 142, 0.14);
  border: 1px solid rgba(62, 207, 142, 0.42);
}

.advisor-quick {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.advisor-form {
  display: flex;
  gap: 0.45rem;
}

.advisor-form input {
  min-width: 0;
  flex: 1;
}

@media (max-width: 620px) {
  .advisor-wrap {
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .advisor-panel {
    width: min(100vw - 1.5rem, 420px);
  }

  .advisor-form {
    flex-direction: column;
  }
}

.calendar-card {
  overflow: hidden;
}

.slot-mode-card {
  padding: 1.15rem 1.35rem 1.25rem;
}

.slot-mode-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: 1.2rem;
  margin: 0 0 0.45rem;
}

.slot-mode-lead {
  margin: 0 0 1rem;
  font-size: 0.92rem;
  color: var(--muted);
  line-height: 1.5;
}

.slot-mode-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.slot-mode-tab {
  font: inherit;
  cursor: pointer;
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--muted);
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}

.slot-mode-tab:hover {
  color: var(--text);
  border-color: rgba(255, 255, 255, 0.18);
}

.slot-mode-tab.active {
  border-color: var(--accent);
  color: var(--text);
  background: rgba(62, 207, 142, 0.12);
  font-weight: 600;
}

.recurring-slot-card .recurring-slot-header {
  margin-bottom: 1rem;
}

.recurring-slot-title {
  font-family: "Fraunces", Georgia, serif;
  font-size: 1.15rem;
  margin: 0 0 0.4rem;
}

.recurring-slot-sub {
  margin: 0;
  font-size: 0.9rem;
  color: var(--muted);
  line-height: 1.45;
}

.recurring-slot-sub strong {
  color: var(--text);
  font-weight: 600;
}

.day-date.recurring-every {
  font-style: italic;
  color: var(--accent);
  opacity: 0.9;
}

.etudiant-calendar-lead {
  margin: 0 0 1.1rem;
  font-size: 0.92rem;
  color: var(--muted);
  line-height: 1.5;
}

.etudiant-calendar-lead strong {
  color: var(--text);
}

.etudiant-creneau-grid {
  display: grid;
  gap: 0.75rem;
}

@media (min-width: 720px) {
  .etudiant-creneau-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.etudiant-creneau-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.4rem;
  text-align: left;
  font: inherit;
  cursor: pointer;
  padding: 1rem 1.1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--text);
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
}

.etudiant-creneau-card:hover {
  border-color: rgba(62, 207, 142, 0.45);
}

.etudiant-creneau-card.on {
  border-color: var(--accent);
  background: rgba(62, 207, 142, 0.1);
  box-shadow: 0 0 0 1px rgba(62, 207, 142, 0.2);
}

.etudiant-creneau-label {
  font-weight: 700;
  font-size: 1rem;
}

.etudiant-creneau-hint {
  font-size: 0.82rem;
  color: var(--muted);
  line-height: 1.4;
}

.etudiant-creneau-state {
  font-size: 0.8rem;
  margin-top: 0.25rem;
  color: var(--muted);
}

.etudiant-creneau-card.on .etudiant-creneau-state {
  color: var(--accent);
  font-weight: 600;
}

.etudiant-accueil .etudiant-accueil-thanks {
  margin: 0 0 1rem;
  font-size: 1.02rem;
  line-height: 1.55;
}

.etudiant-accueil .etudiant-accueil-suite {
  margin: 0.85rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
  line-height: 1.5;
}

.week-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.1rem;
}

.calendar-wrap {
  overflow-x: auto;
  margin: 0 -0.25rem;
  padding: 0 0.25rem 0.25rem;
}

.avail-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9rem;
}

.avail-table th,
.avail-table td {
  border-bottom: 1px solid var(--border);
  padding: 0.5rem 0.35rem;
  text-align: center;
  vertical-align: middle;
}

.avail-table thead th {
  border-bottom: 2px solid var(--border);
  padding-bottom: 0.65rem;
}

.avail-table tbody th {
  text-align: left;
  white-space: nowrap;
  font-weight: 500;
  min-width: 140px;
  padding-right: 0.75rem;
}

.slot-head {
  display: block;
  font-weight: 600;
  color: var(--text);
}

.slot-hint {
  display: block;
  font-size: 0.75rem;
  color: var(--muted);
  font-weight: 400;
}

.day-name {
  display: block;
}

.day-date {
  display: block;
  font-size: 0.8rem;
  color: var(--muted);
  font-weight: 400;
}

.slot-cell {
  width: 100%;
  min-width: 72px;
  min-height: 44px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--bg-elevated);
  color: var(--muted);
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;
}

.slot-cell:hover {
  border-color: rgba(62, 207, 142, 0.5);
  color: var(--text);
}

.slot-cell.on {
  background: rgba(62, 207, 142, 0.2);
  border-color: var(--accent);
  color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-glow);
}

.hint {
  margin: 1rem 0 0;
  font-size: 0.8rem;
  color: var(--muted);
  line-height: 1.45;
}

.admin-service-card {
  position: relative;
}

.admin-session-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem 1rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px dashed var(--border);
}

.admin-session-expiry {
  margin: 0;
}

.admin-logout-btn {
  font-size: 0.85rem;
}

.admin-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.35rem;
}

.admin-panel-head-main {
  flex: 1;
  min-width: 0;
}

.admin-panel-head-main h2 {
  margin: 0 0 0.25rem;
}

.admin-inscriptions-chip {
  flex-shrink: 0;
  margin-top: 0.15rem;
  padding: 0.22rem 0.45rem;
  border-radius: 999px;
  border: 1px solid rgba(62, 207, 142, 0.4);
  background: rgba(62, 207, 142, 0.1);
  color: #a5eccc;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  position: relative;
}

.admin-inscriptions-chip:hover {
  background: rgba(62, 207, 142, 0.18);
}

.admin-inscriptions-chip-dot {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ffd68a;
  box-shadow: 0 0 0 1px var(--bg-elevated);
}

.admin-inscriptions-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  justify-content: flex-end;
  padding: 0.75rem;
}

.admin-inscriptions-panel {
  width: min(420px, 100%);
  max-height: calc(100vh - 1.5rem);
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elevated);
  padding: 0.85rem 0.95rem 1rem;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

.admin-inscriptions-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
  position: sticky;
  top: 0;
  background: var(--bg-elevated);
  padding-bottom: 0.35rem;
  z-index: 1;
}

.admin-inscriptions-panel-head h3 {
  margin: 0;
  font-size: 0.95rem;
}

.admin-inscriptions-close {
  border: 1px solid var(--border);
  background: transparent;
  color: var(--muted);
  border-radius: 8px;
  width: 1.75rem;
  height: 1.75rem;
  cursor: pointer;
  line-height: 1;
  font-size: 0.85rem;
}

.admin-inscriptions-close:hover {
  color: var(--text);
  border-color: var(--text);
}

.admin-group-primary {
  margin-top: 0.5rem;
}

.admin-demandes-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  margin-top: 0.9rem;
}

.admin-group {
  margin-top: 1rem;
}

.admin-group-title {
  font-size: 1.02rem;
  margin: 0.2rem 0 0.45rem;
}

.admin-day-group {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.admin-day-title {
  margin: 0.15rem 0 0.1rem;
  font-size: 0.9rem;
  color: var(--muted);
  text-transform: capitalize;
}

.admin-demande-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
  padding: 0.95rem 1rem;
}

.admin-demande-card.unseen {
  border-color: rgba(255, 214, 138, 0.55);
  box-shadow: inset 3px 0 0 rgba(255, 214, 138, 0.85);
}

.admin-mark-all-seen {
  margin-top: 0.35rem;
  margin-bottom: 0.35rem;
}

.admin-seen-status {
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  border: 1px solid var(--border);
}

.admin-seen-status.unseen {
  color: #ffd68a;
  border-color: rgba(255, 214, 138, 0.45);
  background: rgba(255, 214, 138, 0.12);
}

.admin-seen-status.seen {
  color: var(--muted);
  border-color: var(--border);
  background: rgba(255, 255, 255, 0.04);
}

.admin-seen-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.admin-unseen-pill {
  margin-left: 0.45rem;
  padding: 0.12rem 0.45rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  color: #ffd68a;
  background: rgba(255, 214, 138, 0.14);
  border: 1px solid rgba(255, 214, 138, 0.4);
  vertical-align: middle;
}

.admin-demande-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.7rem;
  margin-bottom: 0.55rem;
}

.admin-kind {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.admin-kind.inscription {
  background: rgba(62, 207, 142, 0.14);
  color: #a5eccc;
  border: 1px solid rgba(62, 207, 142, 0.35);
}

.admin-kind.service {
  background: rgba(90, 164, 255, 0.15);
  color: #bbd8ff;
  border: 1px solid rgba(90, 164, 255, 0.35);
}

.admin-date {
  font-size: 0.8rem;
  color: var(--muted);
}

.admin-details {
  margin-top: 0.45rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--border);
}

.admin-line,
.review-line {
  margin: 0.25rem 0;
  font-size: 0.9rem;
}

.admin-slots {
  margin-top: 0.45rem;
  font-size: 0.9rem;
}

.admin-slots ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}

.foot {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
  text-align: center;
  color: var(--muted);
  font-size: 0.85rem;
}

.foot p {
  margin: 0;
}

.hide-hints .hint {
  display: none;
}

.font-large {
  font-size: 18px;
}

.density-compact .card {
  padding: 1rem 1.05rem;
}

.density-compact .form {
  gap: 0.75rem;
}

.reduced-motion *,
.reduced-motion *::before,
.reduced-motion *::after {
  transition: none !important;
  animation: none !important;
}

.high-contrast {
  --border: rgba(255, 255, 255, 0.28);
  --muted: #d3e6dc;
}

.theme-light {
  --bg: #f1f7f4;
  --bg-card: #ffffff;
  --bg-elevated: #f4faf7;
  --text: #163126;
  --muted: #4d6e60;
  --border: rgba(0, 0, 0, 0.12);
}

.theme-light.high-contrast {
  --border: rgba(0, 0, 0, 0.35);
  --muted: #0f2419;
}

body:has(.theme-light) {
  color-scheme: light;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(62, 207, 142, 0.14), transparent),
    radial-gradient(800px 400px at 100% 0%, rgba(42, 157, 103, 0.1), transparent),
    #f1f7f4;
  color: #163126;
}
```

---

## FICHIER: `src/App.jsx`

```javascript
import { useState, useMemo, useCallback, useEffect } from "react";
import {
  loadUser,
  saveUser,
  clearUser,
  loadSessionEmail,
  saveSessionEmail,
  clearSessionEmail,
  saveServiceWeeks,
  saveServiceRecurringTags,
  saveEntrepriseSlotMode,
  loadServiceDetail,
  loadServiceWeeks,
  loadServiceRecurringTags,
  loadEntrepriseSlotMode,
  saveServiceDetail,
  loadDemandes,
  addDemande,
  isDemandeSeen,
  setDemandeSeen,
  markAllDemandesSeen,
  countUnseenDemandes,
  syncUserDemandesFromProfile,
  removeDemandesForUserEmail,
  PROFIL_LABELS,
  TYPE_LIEU_OPTIONS,
  INTENSITE_OPTIONS,
  SWISS_CANTONS,
  verifyAdminCode,
  isAdminTokenValid,
  clearAdminToken,
  getAdminTokenExpiresAt,
  CRENEAU_SOIR_WEEKEND,
  loadSiteSettings,
  saveSiteSettings,
} from "./storage";
import { toISODate, startOfWeekMonday } from "./dates";
import { CreneauxSoirWeekend } from "./WeekCalendar.jsx";

/** @param {import("./storage").UserProfile | null} raw */
function normalizeUser(raw) {
  if (!raw) return null;
  const profilType =
    raw.profilType === "entreprise" || raw.profilType === "particulier" || raw.profilType === "etudiant"
      ? raw.profilType
      : "etudiant";
  let age = null;
  if (typeof raw.age === "number" && !Number.isNaN(raw.age)) age = raw.age;
  else if (raw.age != null && raw.age !== "") {
    const n = parseInt(String(raw.age), 10);
    if (!Number.isNaN(n)) age = n;
  }
  const canton =
    typeof raw.canton === "string" && SWISS_CANTONS.some((c) => c.value === raw.canton)
      ? raw.canton
      : "";
  const ecole = raw.ecole != null ? String(raw.ecole) : "";
  return { ...raw, profilType, age, canton, ecole };
}

/** @param {import("./storage").SiteSettings} s */
function appearanceClassNames(s) {
  return [
    s.theme === "light" ? "theme-light" : "",
    s.fontSize === "large" ? "font-large" : "",
    s.density === "compact" ? "density-compact" : "",
    s.highContrast ? "high-contrast" : "",
    s.reducedMotion ? "reduced-motion" : "",
    s.showHints ? "" : "hide-hints",
  ]
    .filter(Boolean)
    .join(" ");
}

/** @param {string} sectionId @param {boolean} reducedMotion */
function scrollToLandingSection(sectionId, reducedMotion) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
}

/** Logo exact fourni (fichier `public/uniclean-logo.png`). */
function UniFreshLogo() {
  return (
    <span className="brand-logo" aria-hidden="true">
      <img
        className="brand-logo-img"
        src="/uniclean-logo.png"
        alt=""
        width={48}
        height={48}
        decoding="async"
        fetchPriority="high"
      />
    </span>
  );
}

const ADVISOR_QUICK_QUESTIONS = [
  "Comment m'inscrire ?",
  "Quelle difference entre etudiant et entreprise ?",
  "Comment envoyer une demande de nettoyage ?",
  "Comment changer mes informations ?",
];

/**
 * @param {string} rawQuestion
 * @returns {string}
 */
function getAdvisorAnswer(rawQuestion) {
  const q = String(rawQuestion || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const hasAny = (...words) => words.some((w) => q.includes(w));

  if (
    hasAny("changer", "modifier", "corriger", "mise a jour", "mettre a jour") &&
    hasAny("nom", "entreprise", "societe", "raison sociale", "email", "telephone", "prenom")
  ) {
    return "Pour modifier vos informations (nom d'entreprise, e-mail, telephone...), deconnectez-vous puis refaites l'inscription avec les bonnes donnees sur cet appareil. Le site ne propose pas encore l'edition directe du profil apres inscription.";
  }
  if (hasAny("supprimer", "effacer", "retirer") && hasAny("compte", "inscription", "donnees")) {
    return "La suppression de compte n'est pas encore disponible en un clic. Pour repartir de zero sur cet appareil, vous pouvez effacer les donnees du navigateur (localStorage) puis vous reinscrire.";
  }
  if (hasAny("mot de passe", "password")) {
    return "Il n'y a pas de mot de passe classique ici: la validation se fait via code envoye par e-mail pendant l'inscription.";
  }

  if (q.includes("inscri") || q.includes("compte") || q.includes("code")) {
    return "Pour vous inscrire: choisissez votre profil, remplissez le formulaire, puis validez le code recu par e-mail. Ensuite vous pourrez vous connecter avec le meme e-mail sur cet appareil.";
  }
  if (q.includes("entreprise") || q.includes("particulier") || q.includes("etudiant") || q.includes("profil")) {
    return "Le site a 3 profils: etudiant (missions proposees par UniFresh), entreprise (demande de nettoyage pro), particulier (besoin a domicile). Selectionnez le profil qui correspond a votre besoin dans l'inscription.";
  }
  if (q.includes("demande") || q.includes("nettoyage") || q.includes("devis") || q.includes("formulaire")) {
    return "Apres connexion (entreprise ou particulier), ouvrez le formulaire de demande, indiquez l'adresse, la surface, l'intensite, le type de lieu et les creneaux. Puis cliquez sur 'Envoyer la demande'.";
  }
  if (q.includes("reglage") || q.includes("theme") || q.includes("apparence") || q.includes("texte")) {
    return "Le bouton 'Reglages' permet de modifier l'apparence du site (theme, taille du texte, densite, contraste, animations), meme sans compte.";
  }
  if (q.includes("contact") || q.includes("mail") || q.includes("email")) {
    return "Vous pouvez contacter UniFresh a l'adresse: unifreshbynk@gmail.com.";
  }
  return "Je peux vous aider sur: inscription, choix du profil, demande de nettoyage, modification d'informations et reglages d'apparence. Posez-moi une question plus precise sur le fonctionnement du site.";
}

function AiAdvisorWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(() => [
    {
      role: "assistant",
      text: "Bonjour, je suis le conseiller IA UniFresh. Je reponds aux questions sur le fonctionnement du site.",
    },
  ]);

  const ask = useCallback(
    (text) => {
      const q = String(text || "").trim();
      if (!q) return;
      setMessages((prev) => [...prev, { role: "user", text: q }, { role: "assistant", text: getAdvisorAnswer(q) }]);
      setQuestion("");
      if (!open) setOpen(true);
    },
    [open]
  );

  function submit(e) {
    e.preventDefault();
    ask(question);
  }

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className={`advisor-wrap ${open ? "open" : ""}`}>
      <button
        type="button"
        className="advisor-toggle advisor-toggle-round"
        aria-label={open ? "Fermer l'aide" : "Ouvrir l'aide"}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true" className="advisor-avatar">
          👩‍💼
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="advisor-backdrop"
            aria-label="Fermer l'aide"
            onClick={() => setOpen(false)}
          />
          <section className="advisor-panel card" aria-label="Aide du site">
            <button
              type="button"
              className="advisor-close btn ghost"
              aria-label="Fermer l'aide"
              onClick={() => setOpen(false)}
            >
              ✕
            </button>
            <h3>Aide UniFresh</h3>
            <p className="hint">Questions sur le site, les profils, les demandes et l'inscription.</p>
            <div className="advisor-chat">
              {messages.map((m, idx) => (
                <p key={`${m.role}-${idx}`} className={`advisor-msg ${m.role === "user" ? "user" : "assistant"}`}>
                  {m.text}
                </p>
              ))}
            </div>
            <div className="advisor-quick">
              {ADVISOR_QUICK_QUESTIONS.map((q) => (
                <button key={q} type="button" className="btn ghost" onClick={() => ask(q)}>
                  {q}
                </button>
              ))}
            </div>
            <form className="advisor-form" onSubmit={submit}>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Posez votre question sur le site..."
              />
              <button type="submit" className="btn primary">
                Envoyer
              </button>
            </form>
          </section>
        </>
      ) : null}
    </div>
  );
}

export default function App() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [demandesVersion, setDemandesVersion] = useState(0);
  const [user, setUser] = useState(() => {
    const stored = normalizeUser(loadUser());
    if (!stored) return null;
    const sessionEmail = (loadSessionEmail() || "").trim().toLowerCase();
    if (!sessionEmail) {
      // Compatibility: old installs had no session key and stayed connected.
      saveSessionEmail(String(stored.email || "").trim().toLowerCase());
      return stored;
    }
    return String(stored.email || "").trim().toLowerCase() === sessionEmail ? stored : null;
  });
  const [serviceWeeks, setServiceWeeks] = useState({});
  const [serviceRecurringTags, setServiceRecurringTags] = useState([]);
  const [entrepriseSlotMode, setEntrepriseSlotMode] = useState("week");
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeekMonday(new Date()));
  const [appearance, setAppearance] = useState(loadSiteSettings);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [serviceRequestSubmitted, setServiceRequestSubmitted] = useState(false);
  const shellAppearance = useMemo(() => appearanceClassNames(appearance), [appearance]);

  const updateAppearance = useCallback((key, value) => {
    setAppearance((prev) => {
      const next = { ...prev, [key]: value };
      saveSiteSettings(next);
      return next;
    });
  }, []);

  const mondayISO = useMemo(() => toISODate(weekAnchor), [weekAnchor]);

  const toggleServiceTag = useCallback(
    (tagId) => {
      const weekKey = mondayISO;
      setServiceWeeks((prev) => {
        const next = { ...prev };
        const current = new Set(next[weekKey] || []);
        if (current.has(tagId)) current.delete(tagId);
        else current.add(tagId);
        const arr = Array.from(current).sort();
        if (arr.length === 0) delete next[weekKey];
        else next[weekKey] = arr;
        saveServiceWeeks(next);
        return next;
      });
    },
    [mondayISO]
  );

  const toggleServiceRecurringTag = useCallback((tagId) => {
    setServiceRecurringTags((prev) => {
      const s = new Set(prev);
      if (s.has(tagId)) s.delete(tagId);
      else s.add(tagId);
      const arr = Array.from(s).sort();
      saveServiceRecurringTags(arr);
      return arr;
    });
  }, []);

  const isServiceTagOn = (tagId) => {
    const tags = serviceWeeks[mondayISO];
    return (tags || []).includes(tagId);
  };

  const isRecurringTagOn = (tagId) => serviceRecurringTags.includes(tagId);

  if (!user) {
    if (adminOpen) {
      return (
        <AdminPanel
          onClose={() => setAdminOpen(false)}
          demandesVersion={demandesVersion}
          onDemandesChange={() => setDemandesVersion((v) => v + 1)}
          appearance={appearance}
          onUpdateAppearance={updateAppearance}
          shellAppearance={shellAppearance}
        />
      );
    }
    return (
      <RegistrationForm
        onRegistered={(profile) => {
          saveUser(profile);
          saveSessionEmail(String(profile.email || "").trim().toLowerCase());
          addDemande({
            kind: "inscription",
            profilType: profile.profilType,
            nom: profile.nom,
            prenom: profile.prenom,
            email: profile.email,
            telephone: profile.telephone,
            payload: {
              age: profile.age,
              canton: profile.canton,
              ecole: profile.ecole,
            },
          });
          setDemandesVersion((v) => v + 1);
          setUser(normalizeUser(profile));
        }}
        onLogin={(profile) => {
          saveSessionEmail(String(profile.email || "").trim().toLowerCase());
          setUser(normalizeUser(profile));
        }}
        onOpenAdmin={() => setAdminOpen(true)}
        adminUnseenCount={countUnseenDemandes()}
        appearance={appearance}
        onUpdateAppearance={updateAppearance}
        shellAppearance={shellAppearance}
      />
    );
  }

  const isEtudiant = user.profilType === "etudiant";
  const tagline =
    user.profilType === "entreprise"
      ? "Nettoyage pour les pros"
      : user.profilType === "particulier"
        ? "Nettoyage à domicile"
        : "Nettoyage étudiant, à côté des cours";

  return (
    <div className={["shell", shellAppearance].filter(Boolean).join(" ")}>
      <header className="top">
        <div className="brand">
          <UniFreshLogo />
          <div>
            <h1>UniFresh</h1>
            <p>{tagline}</p>
          </div>
        </div>
        <div className="user-strip">
          <GlobalSettingsMenu
            appearance={appearance}
            onUpdateAppearance={updateAppearance}
            account={user}
            onSaveAccount={(profile) => {
              const normalized = normalizeUser(profile);
              saveUser(normalized);
              syncUserDemandesFromProfile(normalized);
              setDemandesVersion((v) => v + 1);
              setUser(normalized);
            }}
            onDeleteAccount={() => {
              removeDemandesForUserEmail(user.email);
              clearUser();
              clearSessionEmail();
              setDemandesVersion((v) => v + 1);
              setServiceRequestSubmitted(false);
              setUser(null);
            }}
          />
          <span className="user-name">
            {[user.prenom, user.nom].filter(Boolean).join(" ") || user.nom}
          </span>
          <span className="user-badge">{PROFIL_LABELS[user.profilType]}</span>
          {user.age != null ? <span className="user-meta">{user.age} ans</span> : null}
          {isEtudiant && user.canton ? (
            <span className="user-meta">
              {SWISS_CANTONS.find((c) => c.value === user.canton)?.label ?? user.canton}
            </span>
          ) : null}
          {isEtudiant && user.ecole ? <span className="user-meta">{user.ecole}</span> : null}
          <span className="user-meta">{user.email}</span>
          {!logoutConfirmOpen ? (
            <button type="button" className="btn ghost" onClick={() => setLogoutConfirmOpen(true)}>
              Déconnexion
            </button>
          ) : (
            <div className="settings-danger-box user-logout-confirm" role="alert">
              <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
              <div className="settings-danger-actions">
                <button type="button" className="btn ghost" onClick={() => setLogoutConfirmOpen(false)}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => {
                    clearSessionEmail();
                    setServiceRequestSubmitted(false);
                    setUser(null);
                    setLogoutConfirmOpen(false);
                  }}
                >
                  Oui, me déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="main">
        {isEtudiant ? (
          <section className="intro card etudiant-accueil">
            <h2>Merci pour votre inscription</h2>
            <p className="etudiant-accueil-thanks">
              {user.prenom ? (
                <>
                  Bonjour <strong>{user.prenom}</strong>, votre inscription a bien été enregistrée.
                </>
              ) : (
                <>Votre inscription a bien été enregistrée.</>
              )}{" "}
              Nous sommes ravis de vous compter parmi les étudiant·es partenaires d’UniFresh.
              {user.ecole ? (
                <>
                  {" "}
                  Nous avons bien noté votre établissement : <strong>{user.ecole}</strong>
                  {user.canton
                    ? ` (${SWISS_CANTONS.find((c) => c.value === user.canton)?.label ?? user.canton}).`
                    : "."}
                </>
              ) : null}
            </p>
            <p>
              Vous n’avez rien d’autre à remplir ici pour l’instant : <strong>nous vous contacterons</strong>{" "}
              par téléphone ou par e-mail pour vous proposer des missions de nettoyage et convenir
              avec vous des horaires qui s’adaptent à vos cours.
            </p>
            <p className="etudiant-accueil-suite">
              Conservez bien ce compte : vos coordonnées nous permettent de vous joindre. En cas de
              changement (numéro, e-mail…), déconnectez-vous puis inscrivez-vous à nouveau avec les
              bonnes informations.
            </p>
          </section>
        ) : (
          <>
            {!serviceRequestSubmitted ? (
              <section className="intro card">
                <h2>Demande de nettoyage</h2>
                <p>
                  Renseignez le formulaire ci-dessous : surface, type de locaux et niveau de
                  salissure. Ensuite, précisez les créneaux pour une visite ou une intervention
                  {user.profilType === "entreprise"
                    ? " (une semaine précise ou un besoin régulier qui se répète)."
                    : "."}{" "}
                  UniFresh vous recontactera rapidement.
                </p>
              </section>
            ) : null}
            <ClientServiceForm
              profilType={user.profilType}
              entrepriseSlotMode={entrepriseSlotMode}
              setEntrepriseSlotMode={(mode) => {
                setEntrepriseSlotMode(mode);
                saveEntrepriseSlotMode(mode);
              }}
              weekAnchor={weekAnchor}
              setWeekAnchor={setWeekAnchor}
              onToggleWeekTag={toggleServiceTag}
              isWeekTagOn={isServiceTagOn}
              onToggleRecurringTag={toggleServiceRecurringTag}
              isRecurringTagOn={isRecurringTagOn}
              onSubmitted={(data) => {
                addDemande({
                  kind: "demande_service",
                  profilType: user.profilType,
                  nom: user.nom,
                  prenom: user.prenom,
                  email: user.email,
                  telephone: user.telephone,
                  payload: data,
                });
                setDemandesVersion((v) => v + 1);
                setServiceRequestSubmitted(true);
              }}
            />
          </>
        )}
      </main>

      <footer className="foot">
        <p>UniFresh · étudiants, entreprises & particuliers</p>
        <p>
          Site sécurisé · Contact: <a href="mailto:unifreshbynk@gmail.com">unifreshbynk@gmail.com</a>
        </p>
      </footer>
      <AiAdvisorWidget />
    </div>
  );
}

function ClientServiceForm({
  profilType,
  entrepriseSlotMode,
  setEntrepriseSlotMode,
  weekAnchor,
  setWeekAnchor,
  onToggleWeekTag,
  isWeekTagOn,
  onToggleRecurringTag,
  isRecurringTagOn,
  onSubmitted,
}) {
  const [surfaceM2, setSurfaceM2] = useState("");
  const [intensite, setIntensite] = useState("");
  const [typeLieu, setTypeLieu] = useState("");
  const [typeLieuAutre, setTypeLieuAutre] = useState("");
  const [detailsLavage, setDetailsLavage] = useState("");
  const [notesComplementaires, setNotesComplementaires] = useState("");
  const [adresse, setAdresse] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function persistPartial() {
    saveServiceDetail({
      surfaceM2,
      intensite,
      typeLieu,
      typeLieuAutre,
      detailsLavage,
      notesComplementaires,
      adresse,
    });
  }

  function submit(e) {
    e.preventDefault();
    const m2 = parseFloat(String(surfaceM2).replace(",", "."));
    if (Number.isNaN(m2) || m2 < 1 || m2 > 500000) {
      setError("Indiquez une surface valide en m² (entre 1 et 500 000).");
      return;
    }
    if (adresse.trim().length < 12) {
      setError(
        "Indiquez l’adresse complète des locaux (rue, numéro, code postal et ville — au moins une ligne claire)."
      );
      return;
    }
    if (!intensite) {
      setError("Choisissez le niveau de nettoyage : léger, moyen ou gros travail.");
      return;
    }
    if (!typeLieu) {
      setError("Indiquez le type de locaux à nettoyer.");
      return;
    }
    if (typeLieu === "autre" && !typeLieuAutre.trim()) {
      setError("Précisez le type de lieu dans le champ « Autre ».");
      return;
    }
    if (detailsLavage.trim().length < 10) {
      setError("Décrivez ce que nous devons laver (au moins quelques mots).");
      return;
    }
    setError("");
    const payload = {
      surfaceM2: String(m2),
      intensite,
      typeLieu,
      typeLieuAutre: typeLieu === "autre" ? typeLieuAutre.trim() : "",
      detailsLavage: detailsLavage.trim(),
      notesComplementaires: notesComplementaires.trim(),
      adresse: adresse.trim(),
    };
    saveServiceDetail(payload);
    const selectedWeekTags = ["soir_semaine", "samedi", "dimanche"].filter((id) => isWeekTagOn(id));
    const selectedRecurringTags =
      profilType === "entreprise" && entrepriseSlotMode === "recurring"
        ? ["soir_semaine", "samedi", "dimanche"].filter((id) => isRecurringTagOn(id))
        : [];
    onSubmitted({
      ...payload,
      entrepriseSlotMode,
      selectedWeekTags,
      selectedRecurringTags,
    });
    setSurfaceM2(payload.surfaceM2);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <section className="card client-service-page">
        <h2 className="client-service-title">Merci pour votre demande</h2>
        <p className="client-service-lead">
          Merci pour votre inscription et votre confiance. Nous avons bien reçu votre formulaire et
          nous vous contacterons bientôt.
        </p>
      </section>
    );
  }

  return (
    <section className="card client-service-page">
      <h2 className="client-service-title">Formulaire de demande</h2>
      <p className="client-service-lead">
        Ces informations nous permettent d’estimer la charge de travail et de vous proposer un
        devis adapté.
      </p>

      <form className="form client-service-form" onSubmit={submit} noValidate>
        {error ? (
          <div className="alert" role="alert">
            {error}
          </div>
        ) : null}
        <div className="form-section">
          <h3 className="form-section-title">Adresse d’intervention</h3>
          <label className="service-textarea-label">
            <span>Adresse complète des locaux à nettoyer</span>
            <textarea
              className="service-textarea"
              rows={3}
              value={adresse}
              onChange={(e) => {
                setAdresse(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder="Rue et numéro, code postal, ville (et complément d’accès si utile : étage, digicode…)"
            />
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Surface à nettoyer</h3>
          <label>
            <span>Superficie totale (m²)</span>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              value={surfaceM2}
              onChange={(e) => {
                setSurfaceM2(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder="Ex. : 250 ou 120,5"
            />
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Niveau de nettoyage</h3>
          <div className="intensite-grid">
            {INTENSITE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`intensite-option ${intensite === opt.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="intensite"
                  value={opt.id}
                  checked={intensite === opt.id}
                  onChange={() => {
                    setIntensite(opt.id);
                  }}
                />
                <span className="intensite-option-title">{opt.label}</span>
                <span className="intensite-option-desc">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Type de locaux</h3>
          <div className="type-lieu-list">
            {TYPE_LIEU_OPTIONS.map((opt) => (
              <label key={opt.id} className={`type-lieu-row ${typeLieu === opt.id ? "selected" : ""}`}>
                <input
                  type="radio"
                  name="typeLieu"
                  value={opt.id}
                  checked={typeLieu === opt.id}
                  onChange={() => {
                    setTypeLieu(opt.id);
                  }}
                />
                <span className="type-lieu-body">
                  <span className="type-lieu-label">{opt.label}</span>
                  <span className="type-lieu-desc">{opt.desc}</span>
                </span>
              </label>
            ))}
          </div>
          {typeLieu === "autre" ? (
            <label className="type-lieu-autre">
              <span>Précisez le type de lieu</span>
              <input
                type="text"
                value={typeLieuAutre}
                onChange={(e) => {
                  setTypeLieuAutre(e.target.value);
                }}
                onBlur={persistPartial}
                placeholder="Ex. : restaurant, salle de sport…"
              />
            </label>
          ) : null}
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Ce que nous devons laver</h3>
          <label className="service-textarea-label">
            <span>Détail des zones et tâches</span>
            <textarea
              className="service-textarea"
              rows={6}
              value={detailsLavage}
              onChange={(e) => {
                setDetailsLavage(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder="Ex. : sols des open spaces et couloirs, vitres intérieures des bureaux, 4 sanitaires avec cabines, cuisine collective (plans de travail, frigo extérieur), poubelles des open spaces…"
            />
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Informations complémentaires (optionnel)</h3>
          <label className="service-textarea-label">
            <span>Fréquence souhaitée, contraintes d’accès, matériel sur place…</span>
            <textarea
              className="service-textarea"
              rows={3}
              value={notesComplementaires}
              onChange={(e) => {
                setNotesComplementaires(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder="Ex. : intervention possible uniquement après 19 h ; badge obligatoire à l’accueil…"
            />
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Créneaux souhaités</h3>
          <p className="hint">
            Choisissez les moments où une visite/intervention est possible. Vous pouvez cocher 1, 2
            ou 3 créneaux.
          </p>
          {profilType === "entreprise" ? (
            <>
              <div className="slot-mode-tabs" role="tablist" aria-label="Type de planification">
                <button
                  type="button"
                  role="tab"
                  aria-selected={entrepriseSlotMode === "week"}
                  className={`slot-mode-tab ${entrepriseSlotMode === "week" ? "active" : ""}`}
                  onClick={() => setEntrepriseSlotMode("week")}
                >
                  Pour une semaine précise
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={entrepriseSlotMode === "recurring"}
                  className={`slot-mode-tab ${entrepriseSlotMode === "recurring" ? "active" : ""}`}
                  onClick={() => setEntrepriseSlotMode("recurring")}
                >
                  Chaque semaine (régulier)
                </button>
              </div>
              {entrepriseSlotMode === "week" ? (
                <CreneauxSoirWeekend
                  showWeekNav
                  weekAnchor={weekAnchor}
                  setWeekAnchor={setWeekAnchor}
                  onToggleTag={onToggleWeekTag}
                  isTagOn={isWeekTagOn}
                  lead="Choisissez les créneaux pour cette semaine."
                  hint="Cochez vos créneaux directement dans ce formulaire."
                />
              ) : (
                <CreneauxSoirWeekend
                  showWeekNav={false}
                  onToggleTag={onToggleRecurringTag}
                  isTagOn={isRecurringTagOn}
                  recurringTitle="Besoin régulier"
                  recurringSubtitle="Ces mêmes créneaux seront répétés toutes les semaines."
                  lead="Choisissez les créneaux fixes à répéter chaque semaine."
                  hint="Ces créneaux sont inclus dans votre demande."
                />
              )}
            </>
          ) : (
            <CreneauxSoirWeekend
              showWeekNav
              weekAnchor={weekAnchor}
              setWeekAnchor={setWeekAnchor}
              onToggleTag={onToggleWeekTag}
              isTagOn={isWeekTagOn}
              lead="Choisissez les créneaux qui vous conviennent."
              hint="Ces créneaux sont inclus dans votre demande."
            />
          )}
        </div>

        <button type="submit" className="btn primary">
          Envoyer la demande
        </button>
      </form>
    </section>
  );
}

function AdminPanel({ onClose, demandesVersion, onDemandesChange, appearance, onUpdateAppearance, shellAppearance }) {
  const [accessCode, setAccessCode] = useState("");
  const [isAllowed, setIsAllowed] = useState(() => isAdminTokenValid());
  const [authError, setAuthError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState("etudiant");
  const [inscriptionsOpen, setInscriptionsOpen] = useState(false);
  const demandes = useMemo(() => {
    const stored = loadDemandes();
    if (stored.length > 0) return stored.slice().reverse();

    // Fallback for older data entered before admin logging existed.
    const fallback = [];
    const currentUser = loadUser();
    if (currentUser) {
      fallback.push({
        id: `fallback_user_${String(currentUser.email || "unknown")}`,
        createdAt: new Date().toISOString(),
        kind: "inscription",
        profilType: currentUser.profilType || "etudiant",
        nom: currentUser.nom || "",
        prenom: currentUser.prenom || "",
        email: currentUser.email || "",
        telephone: currentUser.telephone || "",
        payload: {
          age: currentUser.age ?? null,
          canton: currentUser.canton || "",
          ecole: currentUser.ecole || "",
          source: "Données existantes (avant journal admin)",
        },
      });

      const detail = loadServiceDetail();
      const hasService =
        (detail.adresse || "").trim() ||
        (detail.surfaceM2 || "").trim() ||
        (detail.detailsLavage || "").trim() ||
        (detail.notesComplementaires || "").trim();
      if (hasService && (currentUser.profilType === "entreprise" || currentUser.profilType === "particulier")) {
        const weeks = loadServiceWeeks();
        const recurring = loadServiceRecurringTags();
        fallback.push({
          id: `fallback_service_${String(currentUser.email || "unknown")}`,
          createdAt: new Date().toISOString(),
          kind: "demande_service",
          profilType: currentUser.profilType,
          nom: currentUser.nom || "",
          prenom: currentUser.prenom || "",
          email: currentUser.email || "",
          telephone: currentUser.telephone || "",
          payload: {
            ...detail,
            entrepriseSlotMode: loadEntrepriseSlotMode(),
            selectedWeekTags: Object.values(weeks).flat(),
            selectedRecurringTags: recurring,
            source: "Données existantes (avant journal admin)",
          },
        });
      }
    }
    return fallback.reverse();
  }, [demandesVersion]);
  const currentProfileDemandes = useMemo(
    () => demandes.filter((d) => d.profilType === activeProfileTab),
    [demandes, activeProfileTab]
  );
  const allInscriptions = useMemo(() => demandes.filter((d) => d.kind === "inscription"), [demandes]);
  const currentServiceDemandes = useMemo(
    () => currentProfileDemandes.filter((d) => d.kind === "demande_service"),
    [currentProfileDemandes]
  );
  const groupByDay = useCallback((items) => {
    /** @type {Record<string, typeof items>} */
    const byDay = {};
    for (const item of items) {
      const dayKey = String(item.createdAt || "").slice(0, 10) || "inconnu";
      if (!byDay[dayKey]) byDay[dayKey] = [];
      byDay[dayKey].push(item);
    }
    return Object.entries(byDay)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([dayKey, dayItems]) => ({ dayKey, items: dayItems }));
  }, []);
  const allInscriptionsByDay = useMemo(() => groupByDay(allInscriptions), [allInscriptions, groupByDay]);
  const currentServiceByDay = useMemo(() => groupByDay(currentServiceDemandes), [currentServiceDemandes, groupByDay]);
  const serviceCountByProfile = useMemo(
    () => ({
      etudiant: demandes.filter((d) => d.profilType === "etudiant" && d.kind === "demande_service").length,
      entreprise: demandes.filter((d) => d.profilType === "entreprise" && d.kind === "demande_service").length,
      particulier: demandes.filter((d) => d.profilType === "particulier" && d.kind === "demande_service").length,
    }),
    [demandes]
  );
  const unseenServicesByProfile = useMemo(
    () => ({
      etudiant: demandes.filter(
        (d) => d.profilType === "etudiant" && d.kind === "demande_service" && !isDemandeSeen(d)
      ).length,
      entreprise: demandes.filter(
        (d) => d.profilType === "entreprise" && d.kind === "demande_service" && !isDemandeSeen(d)
      ).length,
      particulier: demandes.filter(
        (d) => d.profilType === "particulier" && d.kind === "demande_service" && !isDemandeSeen(d)
      ).length,
    }),
    [demandes]
  );
  const totalServiceDemandes = useMemo(
    () => demandes.filter((d) => d.kind === "demande_service").length,
    [demandes]
  );
  const totalUnseenServices = useMemo(
    () => demandes.filter((d) => d.kind === "demande_service" && !isDemandeSeen(d)).length,
    [demandes]
  );
  const unseenInscriptions = useMemo(
    () => allInscriptions.filter((d) => !isDemandeSeen(d)).length,
    [allInscriptions]
  );
  const canPersistSeen = useCallback((d) => !String(d.id || "").startsWith("fallback_"), []);

  function toggleDemandeSeen(demandeId, seen) {
    if (setDemandeSeen(demandeId, seen)) onDemandesChange?.();
  }

  function markAllSeen() {
    if (markAllDemandesSeen() > 0) onDemandesChange?.();
  }

  function profileTabLabel(profileKey, label) {
    const total = serviceCountByProfile[profileKey];
    const unseen = unseenServicesByProfile[profileKey];
    if (unseen > 0) return `${label} (${total} · ${unseen} non lue${unseen > 1 ? "s" : ""})`;
    return `${label} (${total})`;
  }

  useEffect(() => {
    if (!inscriptionsOpen) return;
    function onKey(e) {
      if (e.key === "Escape") setInscriptionsOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inscriptionsOpen]);

  useEffect(() => {
    if (!isAllowed) return;
    const interval = setInterval(() => {
      if (!isAdminTokenValid()) {
        setIsAllowed(false);
        setAuthError("Session admin expirée. Reconnectez-vous.");
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isAllowed]);

  function renderDemandesByDay(groups, keyPrefix) {
    if (groups.length === 0) return <p className="hint">Aucune entrée.</p>;
    return (
      <div className="admin-demandes-list">
        {groups.map((group) => (
          <section key={`${keyPrefix}-${group.dayKey}`} className="admin-day-group">
            <h4 className="admin-day-title">
              {new Date(`${group.dayKey}T00:00:00`).toLocaleDateString("fr-FR", {
                weekday: "long",
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </h4>
            {group.items.map((d) => (
              <AdminDemandeCard
                key={d.id}
                d={d}
                slotLabelById={slotLabelById}
                canToggleSeen={canPersistSeen(d)}
                onToggleSeen={toggleDemandeSeen}
              />
            ))}
          </section>
        ))}
      </div>
    );
  }
  const slotLabelById = useMemo(
    () => Object.fromEntries(CRENEAU_SOIR_WEEKEND.map((s) => [s.id, s.label])),
    []
  );
  async function unlock(e) {
    e.preventDefault();
    if (!accessCode.trim()) {
      setAuthError("Code requis.");
      return;
    }
    setIsVerifying(true);
    setAuthError("Vérification...");
    const success = await verifyAdminCode(accessCode.trim());
    setIsVerifying(false);
    if (success) {
      setIsAllowed(true);
      setAccessCode("");
      setAuthError("");
      console.log("[ADMIN] Connexion réussie");
    } else {
      setAuthError("Code admin invalide.");
      setAccessCode("");
    }
  }

  function logoutAdmin() {
    clearAdminToken();
    setIsAllowed(false);
    setAccessCode("");
    setAuthError("");
    console.log("[ADMIN] Déconnexion admin");
  }

  const adminShellClass = ["shell", "landing", shellAppearance].filter(Boolean).join(" ");

  if (!isAllowed) {
    return (
      <div className={adminShellClass}>
        <div className="landing-settings-row">
          <GlobalSettingsMenu appearance={appearance} onUpdateAppearance={onUpdateAppearance} />
        </div>
        <section className="card form-card">
          <h2>Accès admin</h2>
          <form className="form" onSubmit={unlock} noValidate>
            {authError ? (
              <div className="alert" role="alert">
                {authError}
              </div>
            ) : null}
            <label>
              <span>Code d'accès</span>
              <input
                type="password"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value)}
                placeholder="Code admin"
              />
            </label>
            <button type="submit" className="btn primary" disabled={isVerifying}>
              {isVerifying ? "Vérification..." : "Ouvrir les demandes"}
            </button>
            <button type="button" className="btn ghost" onClick={onClose}>
              Retour
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className={adminShellClass}>
      <div className="landing-settings-row">
        <GlobalSettingsMenu appearance={appearance} onUpdateAppearance={onUpdateAppearance} />
      </div>
      <section className="card form-card admin-service-card">
        <div className="admin-session-bar">
          <p className="hint admin-session-expiry">
            Session active — expire à{" "}
            <strong>
              {getAdminTokenExpiresAt()
                ? new Date(getAdminTokenExpiresAt()).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })
                : "—"}
            </strong>
          </p>
          <button type="button" className="btn ghost admin-logout-btn" onClick={logoutAdmin}>
            Déconnexion admin
          </button>
        </div>
        <div className="admin-panel-head">
          <div className="admin-panel-head-main">
            <h2>Demandes de service</h2>
            <p className="hint">
              {totalServiceDemandes === 0 ? (
                "Aucune demande de service pour le moment."
              ) : (
                <>
                  Total services: <strong>{totalServiceDemandes}</strong>
                  {totalUnseenServices > 0 ? (
                    <>
                      {" "}
                      · Non lues: <strong>{totalUnseenServices}</strong>
                    </>
                  ) : (
                    <> · Toutes lues</>
                  )}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="admin-inscriptions-chip"
            onClick={() => setInscriptionsOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={inscriptionsOpen}
            title="Voir toutes les inscriptions"
          >
            Inscr. {allInscriptions.length}
            {unseenInscriptions > 0 ? <span className="admin-inscriptions-chip-dot" aria-hidden /> : null}
          </button>
        </div>
        {totalUnseenServices > 0 ? (
          <button type="button" className="btn primary admin-mark-all-seen" onClick={markAllSeen}>
            Tout marquer comme vu
          </button>
        ) : null}
        <button type="button" className="btn ghost" onClick={onClose}>
          Fermer l'espace admin
        </button>
        {inscriptionsOpen ? (
          <div
            className="admin-inscriptions-backdrop"
            role="presentation"
            onClick={() => setInscriptionsOpen(false)}
          >
            <div
              className="admin-inscriptions-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-inscriptions-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="admin-inscriptions-panel-head">
                <h3 id="admin-inscriptions-title">Inscriptions ({allInscriptions.length})</h3>
                <button
                  type="button"
                  className="admin-inscriptions-close"
                  onClick={() => setInscriptionsOpen(false)}
                  aria-label="Fermer les inscriptions"
                >
                  ✕
                </button>
              </div>
              {renderDemandesByDay(allInscriptionsByDay, "insc-all")}
            </div>
          </div>
        ) : null}
        {totalServiceDemandes === 0 && allInscriptions.length > 0 ? (
          <p className="hint">Les inscriptions sont dans le bouton en haut à droite.</p>
        ) : null}
        {totalServiceDemandes === 0 && allInscriptions.length === 0 ? (
          <p>Aucune demande pour le moment.</p>
        ) : null}
        {totalServiceDemandes > 0 ? (
          <>
            <div className="slot-mode-tabs" role="tablist" aria-label="Profil de demandes de service">
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileTab === "etudiant"}
                className={`slot-mode-tab ${activeProfileTab === "etudiant" ? "active" : ""}`}
                onClick={() => setActiveProfileTab("etudiant")}
              >
                {profileTabLabel("etudiant", "Étudiants")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileTab === "entreprise"}
                className={`slot-mode-tab ${activeProfileTab === "entreprise" ? "active" : ""}`}
                onClick={() => setActiveProfileTab("entreprise")}
              >
                {profileTabLabel("entreprise", "Entreprises")}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeProfileTab === "particulier"}
                className={`slot-mode-tab ${activeProfileTab === "particulier" ? "active" : ""}`}
                onClick={() => setActiveProfileTab("particulier")}
              >
                {profileTabLabel("particulier", "Particuliers")}
              </button>
            </div>
            {currentServiceDemandes.length === 0 ? (
              <p className="hint">Aucune demande de service pour ce profil.</p>
            ) : (
              <section className="admin-group admin-group-primary">
                {renderDemandesByDay(currentServiceByDay, "svc")}
              </section>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
}

function AdminDemandeCard({ d, slotLabelById, canToggleSeen = false, onToggleSeen }) {
  const seen = isDemandeSeen(d);

  return (
    <article className={`admin-demande-card ${seen ? "seen" : "unseen"}`}>
      <div className="admin-demande-top">
        <span className={`admin-kind ${d.kind === "inscription" ? "inscription" : "service"}`}>
          {d.kind === "inscription" ? "Inscription" : "Demande service"}
        </span>
        <span className={`admin-seen-status ${seen ? "seen" : "unseen"}`}>
          {seen ? "Vu" : "Pas encore vu"}
        </span>
        <span className="admin-date">
          {new Date(d.createdAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
        </span>
      </div>
      <p className="admin-line">
        <strong>Profil:</strong> {PROFIL_LABELS[d.profilType]}
      </p>
      <p className="admin-line">
        <strong>Client:</strong> {[d.prenom, d.nom].filter(Boolean).join(" ") || d.nom}
      </p>
      <p className="admin-line">
        <strong>Contact:</strong> {d.email} · {d.telephone}
      </p>
      <div className="admin-details">
        {d.kind === "inscription" ? (
          <>
            {d.payload.age ? <p className="admin-line">Age: {String(d.payload.age)}</p> : null}
            {d.payload.canton ? <p className="admin-line">Canton: {String(d.payload.canton)}</p> : null}
            {d.payload.ecole ? <p className="admin-line">Ecole: {String(d.payload.ecole)}</p> : null}
          </>
        ) : (
          <>
            {d.payload.adresse ? (
              <p className="admin-line">
                <strong>Adresse:</strong> {String(d.payload.adresse)}
              </p>
            ) : null}
            <p className="admin-line">
              <strong>Surface:</strong> {String(d.payload.surfaceM2 || "-")} m2
            </p>
            <p className="admin-line">
              <strong>Intensité:</strong> {String(d.payload.intensite || "-")}
            </p>
            <p className="admin-line">
              <strong>Type de lieu:</strong> {String(d.payload.typeLieu || "-")}
            </p>
            {d.payload.detailsLavage ? (
              <p className="admin-line">
                <strong>Détails nettoyage:</strong> {String(d.payload.detailsLavage)}
              </p>
            ) : null}
            {d.payload.notesComplementaires ? (
              <p className="admin-line">
                <strong>Notes:</strong> {String(d.payload.notesComplementaires)}
              </p>
            ) : null}
            <div className="admin-slots">
              <strong>Créneaux:</strong>
              <ul>
                {[
                  ...(Array.isArray(d.payload.selectedWeekTags) ? d.payload.selectedWeekTags : []),
                  ...(Array.isArray(d.payload.selectedRecurringTags) ? d.payload.selectedRecurringTags : []),
                ]
                  .filter((v, i, arr) => arr.indexOf(v) === i)
                  .map((id) => (
                    <li key={`${d.id}-${String(id)}`}>{slotLabelById[String(id)] || String(id)}</li>
                  ))}
                {!(
                  (Array.isArray(d.payload.selectedWeekTags) && d.payload.selectedWeekTags.length > 0) ||
                  (Array.isArray(d.payload.selectedRecurringTags) && d.payload.selectedRecurringTags.length > 0)
                ) ? <li>Aucun créneau sélectionné</li> : null}
              </ul>
            </div>
          </>
        )}
        {d.payload.source ? <p className="hint">{String(d.payload.source)}</p> : null}
        {d.payload.profileUpdatedAt ? (
          <p className="hint">
            Informations compte mises à jour le{" "}
            {new Date(String(d.payload.profileUpdatedAt)).toLocaleString("fr-FR", {
              dateStyle: "short",
              timeStyle: "short",
            })}
          </p>
        ) : null}
      </div>
      {canToggleSeen && onToggleSeen ? (
        <div className="admin-seen-actions">
          {seen ? (
            <button type="button" className="btn ghost" onClick={() => onToggleSeen(d.id, false)}>
              Marquer comme non vu
            </button>
          ) : (
            <button type="button" className="btn primary" onClick={() => onToggleSeen(d.id, true)}>
              Marquer comme vu
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function GlobalSettingsMenu({ appearance, onUpdateAppearance, account, onSaveAccount, onDeleteAccount }) {
  const [open, setOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState(null);
  const [accountError, setAccountError] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!account) {
      setAccountDraft(null);
      setShowDeleteConfirm(false);
      return;
    }
    setAccountDraft({
      prenom: account.prenom || "",
      nom: account.nom || "",
      telephone: account.telephone || "",
      age: account.age != null ? String(account.age) : "",
      canton: account.canton || "",
      ecole: account.ecole || "",
    });
    setAccountError("");
    setAccountInfo("");
    setShowDeleteConfirm(false);
  }, [account, open]);

  function saveAccount(e) {
    e.preventDefault();
    if (!account || !accountDraft || !onSaveAccount) return;
    const nm = accountDraft.nom.trim();
    const tel = accountDraft.telephone.trim().replace(/\s/g, "");
    const pr = accountDraft.prenom.trim();
    if (!nm) {
      setAccountError("Indiquez un nom.");
      return;
    }
    if (account.profilType !== "entreprise" && !pr) {
      setAccountError("Indiquez un prénom.");
      return;
    }
    if (tel.length < 8) {
      setAccountError("Numéro de téléphone trop court.");
      return;
    }

    let ageOut = /** @type {number | null} */ (null);
    if (account.profilType === "etudiant") {
      const ageNum = parseInt(String(accountDraft.age).trim(), 10);
      if (!String(accountDraft.age).trim() || Number.isNaN(ageNum) || ageNum < 16 || ageNum > 110) {
        setAccountError("Âge invalide (entre 16 et 110 ans).");
        return;
      }
      ageOut = ageNum;
      if (!accountDraft.canton) {
        setAccountError("Choisissez le canton de votre établissement.");
        return;
      }
      const ec = accountDraft.ecole.trim();
      if (ec.length < 3) {
        setAccountError("Indiquez le nom de votre école ou établissement.");
        return;
      }
    }

    setAccountError("");
    onSaveAccount({
      ...account,
      prenom: account.profilType === "entreprise" ? "" : pr,
      nom: nm,
      telephone: tel,
      age: ageOut,
      canton: account.profilType === "etudiant" ? accountDraft.canton : "",
      ecole: account.profilType === "etudiant" ? accountDraft.ecole.trim() : "",
    });
    setAccountInfo("Modifications enregistrées.");
    setShowDeleteConfirm(false);
  }

  function confirmDeleteAccount() {
    if (!onDeleteAccount) return;
    onDeleteAccount();
    setOpen(false);
  }

  const panelClass = ["settings-panel", "card", account ? "settings-panel-wide" : ""].filter(Boolean).join(" ");

  return (
    <div className="settings-wrap">
      <button type="button" className="btn ghost" onClick={() => setOpen((v) => !v)}>
        Réglages
      </button>
      {open ? (
        <section className={panelClass}>
          <h3>Apparence</h3>
          <p className="hint">Ces réglages s’appliquent à tout le site, sans compte.</p>
          <label>
            <span>Thème</span>
            <select value={appearance.theme} onChange={(e) => onUpdateAppearance("theme", e.target.value)}>
              <option value="dark">Sombre</option>
              <option value="light">Clair</option>
            </select>
          </label>
          <label>
            <span>Taille du texte</span>
            <select value={appearance.fontSize} onChange={(e) => onUpdateAppearance("fontSize", e.target.value)}>
              <option value="normal">Normale</option>
              <option value="large">Grande</option>
            </select>
          </label>
          <label>
            <span>Densité</span>
            <select value={appearance.density} onChange={(e) => onUpdateAppearance("density", e.target.value)}>
              <option value="comfortable">Confortable</option>
              <option value="compact">Compacte</option>
            </select>
          </label>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={appearance.showHints}
              onChange={(e) => onUpdateAppearance("showHints", e.target.checked)}
            />
            <span>Afficher les textes d’aide</span>
          </label>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={appearance.highContrast}
              onChange={(e) => onUpdateAppearance("highContrast", e.target.checked)}
            />
            <span>Contraste renforcé</span>
          </label>
          <label className="settings-check">
            <input
              type="checkbox"
              checked={appearance.reducedMotion}
              onChange={(e) => onUpdateAppearance("reducedMotion", e.target.checked)}
            />
            <span>Réduire les animations</span>
          </label>

          {account && accountDraft ? (
            <form className="settings-section-divider form" onSubmit={saveAccount} noValidate>
              <h3>Compte</h3>
              <p className="hint">Modifiez vos informations. L’e-mail ne peut pas être changé ici.</p>
              {accountError ? (
                <div className="alert" role="alert">
                  {accountError}
                </div>
              ) : null}
              {accountInfo ? (
                <div className="success-banner" role="status">
                  {accountInfo}
                </div>
              ) : null}
              <label>
                <span>E-mail</span>
                <input type="email" value={account.email} readOnly disabled />
              </label>
              {account.profilType !== "entreprise" ? (
                <label>
                  <span>Prénom</span>
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={accountDraft.prenom}
                    onChange={(e) => setAccountDraft((prev) => ({ ...prev, prenom: e.target.value }))}
                  />
                </label>
              ) : null}
              <label>
                <span>{account.profilType === "entreprise" ? "Raison sociale ou nom de l’entreprise" : "Nom"}</span>
                <input
                  type="text"
                  autoComplete={account.profilType === "entreprise" ? "organization" : "family-name"}
                  value={accountDraft.nom}
                  onChange={(e) => setAccountDraft((prev) => ({ ...prev, nom: e.target.value }))}
                />
              </label>
              <label>
                <span>Téléphone</span>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={accountDraft.telephone}
                  onChange={(e) => setAccountDraft((prev) => ({ ...prev, telephone: e.target.value }))}
                />
              </label>
              {account.profilType === "etudiant" ? (
                <>
                  <label>
                    <span>Âge</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={16}
                      max={110}
                      value={accountDraft.age}
                      onChange={(e) => setAccountDraft((prev) => ({ ...prev, age: e.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Canton</span>
                    <select
                      value={accountDraft.canton}
                      onChange={(e) => setAccountDraft((prev) => ({ ...prev, canton: e.target.value }))}
                    >
                      <option value="">Choisissez votre canton</option>
                      {SWISS_CANTONS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>École ou établissement</span>
                    <input
                      type="text"
                      autoComplete="organization"
                      value={accountDraft.ecole}
                      onChange={(e) => setAccountDraft((prev) => ({ ...prev, ecole: e.target.value }))}
                    />
                  </label>
                </>
              ) : null}
              <button type="submit" className="btn primary">
                Enregistrer les modifications
              </button>
              {!showDeleteConfirm ? (
                <button type="button" className="btn ghost settings-danger-btn" onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer mon compte
                </button>
              ) : (
                <div className="settings-danger-box" role="alert">
                  <p>Êtes-vous sûr de vouloir supprimer le compte ?</p>
                  <div className="settings-danger-actions">
                    <button type="button" className="btn ghost" onClick={() => setShowDeleteConfirm(false)}>
                      Annuler
                    </button>
                    <button type="button" className="btn primary settings-danger-btn" onClick={confirmDeleteAccount}>
                      Oui, supprimer
                    </button>
                  </div>
                </div>
              )}
            </form>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function RegistrationForm({
  onRegistered,
  onLogin,
  onOpenAdmin,
  adminUnseenCount = 0,
  appearance,
  onUpdateAppearance,
  shellAppearance,
}) {
  const [email, setEmail] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [age, setAge] = useState("");
  const [profilType, setProfilType] = useState(/** @type {"etudiant"|"entreprise"|"particulier"|""} */ (""));
  const [canton, setCanton] = useState("");
  const [ecole, setEcole] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [reviewRegistration, setReviewRegistration] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [confirmError, setConfirmError] = useState("");
  const [confirmInfo, setConfirmInfo] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginInfo, setLoginInfo] = useState("");
  const [loginCode, setLoginCode] = useState("");
  const [pendingLoginEmail, setPendingLoginEmail] = useState("");
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);

  async function sendRegistrationCode(registrationPayload) {
    setError("");
    setConfirmError("");
    setConfirmInfo("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registrationPayload),
      });
      if (!response.ok) {
        let serverMessage = "Impossible d'envoyer l'e-mail de confirmation.";
        try {
          const data = await response.json();
          if (data && typeof data.error === "string" && data.error.trim()) serverMessage = data.error;
        } catch {
          /* ignore */
        }
        setError(`${serverMessage} Vérifiez la configuration SMTP puis réessayez.`);
        return;
      }
      setPendingRegistration(registrationPayload);
      setConfirmationCode("");
      setConfirmInfo("Un code de confirmation a ete envoye a votre e-mail.");
      setReviewRegistration(null);
    } catch {
      setError("Serveur e-mail indisponible. Lancez `npm run server` puis réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    const em = loginEmail.trim().toLowerCase();
    if (!em) {
      setLoginError("Indiquez l’e-mail utilisé lors de l’inscription.");
      return;
    }
    const existing = normalizeUser(loadUser());
    if (!existing || String(existing.email || "").trim().toLowerCase() !== em) {
      setLoginError("Aucun compte correspondant sur cet appareil. Merci de vous inscrire.");
      return;
    }
    setLoginError("");
    setLoginInfo("");
    setIsLoginSubmitting(true);
    try {
      const response = await fetch("/api/login/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      if (!response.ok) {
        let serverMessage = "Impossible d'envoyer le code de connexion.";
        try {
          const data = await response.json();
          if (data && typeof data.error === "string" && data.error.trim()) serverMessage = data.error;
        } catch {
          try {
            const raw = await response.text();
            if (raw && raw.trim()) serverMessage = raw.trim();
          } catch {
            /* ignore */
          }
        }
        setLoginError(`${serverMessage} Vérifiez la configuration SMTP puis réessayez.`);
        return;
      }
      setPendingLoginEmail(em);
      setLoginCode("");
      setLoginInfo("Un code de connexion a ete envoye a votre e-mail.");
    } catch {
      setLoginError("Serveur e-mail indisponible. Lancez `npm run server` puis réessayez.");
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  async function submitLoginCode(e) {
    e.preventDefault();
    const em = pendingLoginEmail.trim().toLowerCase();
    if (!em) {
      setLoginError("Aucun e-mail en attente. Demandez un code de connexion.");
      return;
    }
    const code = loginCode.trim();
    if (!code) {
      setLoginError("Saisissez le code de connexion reçu par e-mail.");
      return;
    }

    const existing = normalizeUser(loadUser());
    if (!existing || String(existing.email || "").trim().toLowerCase() !== em) {
      setLoginError("Aucun compte correspondant sur cet appareil. Merci de vous inscrire.");
      setPendingLoginEmail("");
      return;
    }

    setLoginError("");
    setIsLoginSubmitting(true);
    try {
      const response = await fetch("/api/login/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, code }),
      });
      if (!response.ok) {
        let serverMessage = "Code invalide ou expiré.";
        try {
          const data = await response.json();
          if (data && typeof data.error === "string" && data.error.trim()) serverMessage = data.error;
        } catch {
          /* ignore */
        }
        setLoginError(serverMessage);
        return;
      }
      onLogin(existing);
    } catch {
      setLoginError("Impossible de verifier le code pour le moment.");
    } finally {
      setIsLoginSubmitting(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    const em = email.trim();
    const pr = prenom.trim();
    const nm = nom.trim();
    const tel = telephone.trim().replace(/\s/g, "");

    if (!profilType) {
      setError("Indiquez si vous êtes étudiant·e, une entreprise ou un particulier.");
      return;
    }
    if (!em || !nm || !tel) {
      setError("Merci de remplir tous les champs obligatoires.");
      return;
    }
    if (profilType !== "entreprise" && !pr) {
      setError("Merci d’indiquer votre prénom.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setError("Adresse e-mail invalide.");
      return;
    }
    if (tel.length < 8) {
      setError("Numéro de téléphone trop court.");
      return;
    }

    let ageOut = /** @type {number | null} */ (null);
    if (profilType === "etudiant") {
      const ageNum = parseInt(String(age).trim(), 10);
      if (!age.trim() || Number.isNaN(ageNum) || ageNum < 16 || ageNum > 110) {
        setError("Âge invalide (entre 16 et 110 ans).");
        return;
      }
      ageOut = ageNum;
      if (!canton) {
        setError("Choisissez le canton de votre établissement scolaire.");
        return;
      }
      const ec = ecole.trim();
      if (ec.length < 3) {
        setError("Indiquez le nom de votre école ou établissement (au moins 3 caractères).");
        return;
      }
    }

    const registrationPayload = {
      email: em,
      prenom: profilType === "entreprise" ? "" : pr,
      nom: nm,
      telephone: tel,
      age: ageOut,
      profilType,
      canton: profilType === "etudiant" ? canton : "",
      ecole: profilType === "etudiant" ? ecole.trim() : "",
    };

    setError("");
    setReviewRegistration(registrationPayload);
  }

  async function submitConfirmation(e) {
    e.preventDefault();
    if (!pendingRegistration) return;
    const code = confirmationCode.trim();
    if (!code) {
      setConfirmError("Saisissez le code recu par e-mail.");
      return;
    }
    setConfirmError("");
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/register/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingRegistration.email, code }),
      });
      if (!response.ok) {
        let serverMessage = "Code invalide ou expiré.";
        try {
          const data = await response.json();
          if (data && typeof data.error === "string" && data.error.trim()) serverMessage = data.error;
        } catch {
          /* ignore */
        }
        setConfirmError(serverMessage);
        return;
      }
      onRegistered(pendingRegistration);
    } catch {
      setConfirmError("Impossible de verifier le code pour le moment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const landingClass = ["shell", "landing", shellAppearance].filter(Boolean).join(" ");
  const reducedMotion = shellAppearance.includes("reduced-motion");

  return (
    <div className={landingClass}>
      <nav className="landing-scroll-nav" aria-label="Navigation inscription et connexion">
        <button
          type="button"
          className="btn ghost"
          onClick={() => scrollToLandingSection("landing-inscription", reducedMotion)}
        >
          Inscription
        </button>
        <button
          type="button"
          className="btn ghost"
          onClick={() => scrollToLandingSection("landing-connexion", reducedMotion)}
        >
          Connexion
        </button>
      </nav>
      <header className="hero">
        <div className="landing-settings-row">
          <GlobalSettingsMenu appearance={appearance} onUpdateAppearance={onUpdateAppearance} />
        </div>
        <div className="brand large">
          <UniFreshLogo />
          <div>
            <h1>UniFresh</h1>
            <p className="tagline">
              Nettoyage pour étudiants, entreprises et particuliers — une seule plateforme.
            </p>
          </div>
        </div>
        <p className="lead">
          Deux parcours clairs: un pour les étudiant·es qui veulent travailler sereinement, un pour
          les entreprises qui veulent un service fiable sans perdre de temps.
        </p>
      </header>

      <div className="split">
        <section className="card pitch">
          <h2>Pourquoi UniFresh ?</h2>
          <h3>Pour les étudiant·es</h3>
          <p>
            Trouvez des missions adaptées à votre rythme d’études, sans stress ni démarches
            compliquées. Votre profil est étudié rapidement et l’agence vous contacte pour proposer
            des créneaux compatibles avec vos cours.
          </p>
          <h3>Pour les entreprises et particuliers</h3>
          <p>
            Gagnez du temps: vous décrivez votre besoin une seule fois, puis UniFresh vous recontacte
            avec une solution claire. Vous bénéficiez d’un suivi humain, d’intervenants motivés et
            d’une organisation fiable.
          </p>
        </section>

        <section id="landing-inscription" className="card form-card">
          <h2>Inscription</h2>
          <form onSubmit={submit} className="form" noValidate>
            {error ? (
              <div className="alert" role="alert">
                {error}
              </div>
            ) : null}

            <fieldset className="profil-fieldset">
              <legend>Vous êtes</legend>
              <div className="profil-options">
                <label className={`profil-option ${profilType === "etudiant" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="profil"
                    value="etudiant"
                    checked={profilType === "etudiant"}
                    onChange={() => {
                      setProfilType("etudiant");
                    }}
                  />
                  <span className="profil-option-title">Étudiant·e</span>
                  <span className="profil-option-desc">Missions à côté des cours</span>
                </label>
                <label className={`profil-option ${profilType === "entreprise" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="profil"
                    value="entreprise"
                    checked={profilType === "entreprise"}
                    onChange={() => {
                      setProfilType("entreprise");
                      setPrenom("");
                      setAge("");
                      setCanton("");
                      setEcole("");
                    }}
                  />
                  <span className="profil-option-title">Entreprise</span>
                  <span className="profil-option-desc">Demander un service de nettoyage</span>
                </label>
                <label className={`profil-option ${profilType === "particulier" ? "selected" : ""}`}>
                  <input
                    type="radio"
                    name="profil"
                    value="particulier"
                    checked={profilType === "particulier"}
                    onChange={() => {
                      setProfilType("particulier");
                      setAge("");
                      setCanton("");
                      setEcole("");
                    }}
                  />
                  <span className="profil-option-title">Particulier</span>
                  <span className="profil-option-desc">Besoin à la maison</span>
                </label>
              </div>
            </fieldset>

            <label>
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.fr"
              />
            </label>
            {profilType !== "entreprise" ? (
              <label>
                <span>Prénom</span>
                <input
                  type="text"
                  autoComplete="given-name"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  placeholder="Jean"
                />
              </label>
            ) : null}
            <label>
              <span>
                {profilType === "entreprise" ? "Raison sociale ou nom de l’entreprise" : "Nom"}
              </span>
              <input
                type="text"
                autoComplete={profilType === "entreprise" ? "organization" : "family-name"}
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={
                  profilType === "entreprise" ? "SARL Exemple Nettoyage" : "Dupont"
                }
              />
            </label>
            {profilType === "etudiant" ? (
              <label>
                <span>Âge</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={16}
                  max={110}
                  autoComplete="off"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="20"
                />
              </label>
            ) : null}
            {profilType === "etudiant" ? (
              <label>
                <span>Canton</span>
                <select
                  value={canton}
                  onChange={(e) => setCanton(e.target.value)}
                  autoComplete="address-level1"
                >
                  <option value="">Choisissez votre canton</option>
                  {SWISS_CANTONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {profilType === "etudiant" ? (
              <label>
                <span>École ou établissement</span>
                <input
                  type="text"
                  autoComplete="organization"
                  value={ecole}
                  onChange={(e) => setEcole(e.target.value)}
                  placeholder="Ex. : Gymnase de Nyon, EPFL, HES-SO…"
                />
              </label>
            ) : null}
            <label>
              <span>Téléphone</span>
              <input
                type="tel"
                autoComplete="tel"
                value={telephone}
                onChange={(e) => setTelephone(e.target.value)}
                placeholder="06 12 34 56 78"
              />
            </label>
            <button type="submit" className="btn primary" disabled={isSubmitting}>
              {isSubmitting ? "Envoi en cours..." : "Relire mon inscription"}
            </button>
          </form>
          {reviewRegistration ? (
            <section className="card" aria-live="polite">
              <h3>Relecture de votre inscription</h3>
              <p className="hint">Vérifiez chaque point avant d'envoyer le code de confirmation.</p>
              <div className="form">
                <p className="review-line">
                  <strong>Profil:</strong> {PROFIL_LABELS[reviewRegistration.profilType]}
                </p>
                <p className="review-line">
                  <strong>E-mail:</strong> {reviewRegistration.email}
                </p>
                {reviewRegistration.prenom ? (
                  <p className="review-line">
                    <strong>Prénom:</strong> {reviewRegistration.prenom}
                  </p>
                ) : null}
                <p className="review-line">
                  <strong>Nom:</strong> {reviewRegistration.nom}
                </p>
                <p className="review-line">
                  <strong>Téléphone:</strong> {reviewRegistration.telephone}
                </p>
                {reviewRegistration.age != null ? (
                  <p className="review-line">
                    <strong>Âge:</strong> {String(reviewRegistration.age)}
                  </p>
                ) : null}
                {reviewRegistration.canton ? (
                  <p className="review-line">
                    <strong>Canton:</strong> {SWISS_CANTONS.find((c) => c.value === reviewRegistration.canton)?.label ?? reviewRegistration.canton}
                  </p>
                ) : null}
                {reviewRegistration.ecole ? (
                  <p className="review-line">
                    <strong>Établissement:</strong> {reviewRegistration.ecole}
                  </p>
                ) : null}
                <div className="slot-mode-tabs">
                  <button type="button" className="btn ghost" onClick={() => setReviewRegistration(null)}>
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={isSubmitting}
                    onClick={() => sendRegistrationCode(reviewRegistration)}
                  >
                    {isSubmitting ? "Envoi en cours..." : "Valider et envoyer le code"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}
          {pendingRegistration ? (
            <form onSubmit={submitConfirmation} className="form" noValidate>
              {confirmInfo ? (
                <div className="success-banner" role="status">
                  {confirmInfo}
                </div>
              ) : null}
              <p className="hint">
                Pensez à vérifier vos spams / courriers indésirables : le code de confirmation y
                apparaît parfois.
              </p>
              {confirmError ? (
                <div className="alert" role="alert">
                  {confirmError}
                </div>
              ) : null}
              <label>
                <span>Code de confirmation</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Ex. : 123456"
                />
              </label>
              <button type="submit" className="btn primary" disabled={isSubmitting}>
                {isSubmitting ? "Verification..." : "Valider mon inscription"}
              </button>
            </form>
          ) : null}
          <hr />
          <div id="landing-connexion" className="landing-connexion">
            <h3>Déjà inscrit·e ?</h3>
          <form onSubmit={submitLogin} className="form" noValidate>
            {loginError ? (
              <div className="alert" role="alert">
                {loginError}
              </div>
            ) : null}
            {loginInfo ? (
              <div className="success-banner" role="status">
                {loginInfo}
              </div>
            ) : null}
            <label>
              <span>E-mail de connexion</span>
              <input
                type="email"
                autoComplete="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="vous@exemple.fr"
              />
            </label>
            <button type="submit" className="btn ghost" disabled={isLoginSubmitting}>
              {isLoginSubmitting ? "Envoi..." : "Envoyer le code de connexion"}
            </button>
          </form>
          {pendingLoginEmail ? (
            <form onSubmit={submitLoginCode} className="form" noValidate>
              <p className="hint">
                Entrez le code reçu pour <strong>{pendingLoginEmail}</strong>.
              </p>
              <label>
                <span>Code de connexion</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={loginCode}
                  onChange={(e) => setLoginCode(e.target.value)}
                  placeholder="Ex. : 123456"
                />
              </label>
              <button type="submit" className="btn primary" disabled={isLoginSubmitting}>
                {isLoginSubmitting ? "Verification..." : "Valider et se connecter"}
              </button>
            </form>
          ) : null}
          <button type="button" className="btn ghost" onClick={onOpenAdmin}>
            Accès demandes (admin)
            {adminUnseenCount > 0 ? (
              <span className="admin-unseen-pill">
                {adminUnseenCount} non lue{adminUnseenCount > 1 ? "s" : ""}
              </span>
            ) : null}
          </button>
          </div>
        </section>
      </div>

      <footer className="foot">
        <p>UniFresh · étudiants, entreprises & particuliers</p>
        <p>
          Site sécurisé · Contact: <a href="mailto:unifreshbynk@gmail.com">unifreshbynk@gmail.com</a>
        </p>
      </footer>
      <AiAdvisorWidget />
    </div>
  );
}
```

---

## FICHIER: `scripts/test-smtp.mjs`

```
import "dotenv/config";
import nodemailer from "nodemailer";

const user = String(process.env.SMTP_USER || "").trim();
const pass = String(process.env.SMTP_PASS || "").trim().replace(/\s+/g, "");

if (!user || !pass) {
  console.error("Renseignez SMTP_USER et SMTP_PASS dans .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user, pass },
});

console.log("Test SMTP pour:", user);
console.log("Longueur mot de passe:", pass.length, "(attendu: 16 pour Gmail)");

try {
  await transporter.verify();
  console.log("OK — Gmail accepte ces identifiants.");
} catch (err) {
  console.error("ÉCHEC —", err.message);
  console.error(
    "\n→ Créez un NOUVEAU mot de passe d'application pour",
    user,
    "sur https://myaccount.google.com/apppasswords\n→ Mettez-le dans SMTP_PASS puis relancez npm run server"
  );
  process.exit(1);
}
```

---

## FICHIER: `scripts/trim-logo.mjs`

```
import sharp from "sharp";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { renameSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const input = join(__dirname, "..", "public", "uniclean-logo.png");
const outTmp = join(__dirname, "..", "public", "uniclean-logo-crop.png");

const meta = await sharp(input).metadata();
const { width: W, height: H } = meta;
const inset = 0.1;
const left = Math.round(W * inset);
const top = Math.round(H * inset);
const width = Math.max(8, W - 2 * left);
const height = Math.max(8, H - 2 * top);

await sharp(input).extract({ left, top, width, height }).png().toFile(outTmp);
renameSync(outTmp, input);
console.log("Inset crop", inset * 100, "% →", width, "x", height);
```
