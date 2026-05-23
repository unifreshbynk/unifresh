import "dotenv/config";
import express from "express";
import helmet from "helmet";
import nodemailer from "nodemailer";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import * as db from "./server/db.js";
const { DB_FILE, DATA_DIR } = db;
import { assertEnvValid } from "./server/env.js";
import { scheduleBackups } from "./server/backup.js";
import { rateLimitMiddleware } from "./server/rateLimit.js";

assertEnvValid();
db.getDatabase();
import {
  escapeHtml,
  formatDemandeText,
  formatDemandeHtml,
  clientServiceConfirmationHtml,
} from "./server/emails.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.MAIL_SERVER_PORT || 8787);
const DIST_DIR = path.join(__dirname, "dist");
const SERVICE_AREA =
  String(process.env.SERVICE_AREA_LABEL || "").trim() ||
  "Suisse romande (Genève, Vaud, Valais, Fribourg, Neuchâtel, Jura)";

const app = express();
const isProd = process.env.NODE_ENV === "production";

if (String(process.env.TRUST_PROXY || "").trim() === "1" || isProd) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: isProd
      ? {
          useDefaults: true,
          directives: {
            "default-src": ["'self'"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            "font-src": ["'self'", "https://fonts.gstatic.com"],
            "img-src": ["'self'", "data:"],
            "connect-src": ["'self'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  })
);
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ error: "Corps JSON invalide." });
  }
  next(err);
});

const corsOrigins = String(process.env.CORS_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (corsOrigins.length > 0) {
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin && corsOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });
}

function createTransporter() {
  const host = String(process.env.SMTP_HOST || "").trim();
  const user = String(process.env.SMTP_USER || "").trim();
  const pass = String(process.env.SMTP_PASS || "").trim().replace(/\s+/g, "");
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || "false") === "true";
  if (!host || !user || !pass) {
    throw new Error("SMTP_HOST, SMTP_USER et SMTP_PASS sont obligatoires.");
  }
  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

function buildSenderAddress() {
  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const configuredFrom = String(process.env.MAIL_FROM || "").trim();
  return configuredFrom && configuredFrom.includes(smtpUser)
    ? configuredFrom
    : `UniFresh <${smtpUser}>`;
}

function formatSmtpError(error) {
  const raw = error instanceof Error ? error.message : String(error || "");
  if (/535|BadCredentials|Username and Password not accepted/i.test(raw)) {
    const user = String(process.env.SMTP_USER || "").trim() || "votre compte Gmail";
    return (
      `Connexion Gmail refusée pour ${user}. ` +
      "Vérifiez SMTP_PASS (mot de passe d'application Google) dans .env."
    );
  }
  if (/EAUTH|authentication/i.test(raw)) {
    return "Authentification SMTP échouée. Vérifiez SMTP_USER et SMTP_PASS.";
  }
  return raw || "Erreur serveur";
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();
  const from = buildSenderAddress();
  const replyTo = String(process.env.SMTP_USER || "").trim();
  await transporter.sendMail({ from, replyTo, to, subject, text, html });
}

async function notifyAdminDemande(demande) {
  const adminEmail = String(process.env.ADMIN_REVIEW_EMAIL || process.env.SMTP_USER || "").trim();
  if (!adminEmail) return;
  const kindLabel = demande.kind === "inscription" ? "Inscription" : "Demande service";
  await sendMail({
    to: adminEmail,
    subject: `[UniFresh] ${kindLabel} — ${[demande.prenom, demande.nom].filter(Boolean).join(" ") || demande.email}`,
    text: formatDemandeText(demande),
    html: formatDemandeHtml(demande),
  });
}

function requireAdmin(req, res, next) {
  const auth = String(req.headers.authorization || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!db.validateAdminToken(token)) {
    return res.status(401).json({ error: "Session admin invalide ou expirée." });
  }
  next();
}

const registerCodeLimit = rateLimitMiddleware("register-send", 8, 15 * 60 * 1000);
const registerCompleteLimit = rateLimitMiddleware("register-complete", 15, 15 * 60 * 1000);
const loginCodeLimit = rateLimitMiddleware("login-send", 10, 15 * 60 * 1000);
const loginCompleteLimit = rateLimitMiddleware("login-complete", 20, 15 * 60 * 1000);
const adminRequestLimit = rateLimitMiddleware("admin-request", 5, 60 * 60 * 1000);
const adminAccessCodeLimit = rateLimitMiddleware("admin-access-code", 12, 15 * 60 * 1000);

function appBaseUrl(req) {
  const configured = String(process.env.APP_BASE_URL || "").trim().replace(/\/$/, "");
  if (configured) return configured;
  return `${req.protocol}://${req.get("host")}`;
}

function adminResultHtml(title, message) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${escapeHtml(title)}</title><style>body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:1rem;line-height:1.5}h1{font-size:1.25rem}</style></head><body><h1>${escapeHtml(title)}</h1><p>${message}</p></body></html>`;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    apiVersion: 3,
    storage: "sqlite",
    features: { loginComplete: true, registerComplete: true },
    serviceArea: SERVICE_AREA,
    environment: process.env.NODE_ENV || "development",
    time: new Date().toISOString(),
  });
});

app.get("/api/config/public", (_req, res) => {
  res.json({ serviceArea: SERVICE_AREA });
});

app.get("/api/users/check-email", (req, res) => {
  const email = String(req.query.email || "").trim().toLowerCase();
  if (!email) return res.status(400).json({ error: "Email requis." });
  return res.json({ exists: db.emailExists(email) });
});

app.post("/api/register/send-code", registerCodeLimit, async (req, res) => {
  try {
    const { email, prenom, nom, profilType, telephone, age, canton, ecole } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: "Email requis." });
    if (db.emailExists(cleanEmail)) {
      return res.status(409).json({ error: "Cet e-mail est déjà inscrit. Connectez-vous." });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = Date.now() + 10 * 60 * 1000;
    db.setPendingCode(cleanEmail, "register", code, expiresAt, {
      prenom,
      nom,
      profilType,
      telephone,
      age,
      canton,
      ecole,
    });

    const profileLabel =
      profilType === "entreprise" ? "Entreprise" : profilType === "particulier" ? "Particulier" : "Étudiant·e";

    await sendMail({
      to: cleanEmail,
      subject: "Code de confirmation UniFresh",
      text: [
        "Bonjour,",
        "",
        "Merci pour votre inscription sur UniFresh.",
        "",
        `Votre code de confirmation : ${code}`,
        "",
        "Ce code est valable pendant 10 minutes.",
        "",
        `Profil : ${profileLabel}`,
        telephone ? `Téléphone : ${telephone}` : "",
        "",
        "L'équipe UniFresh",
      ]
        .filter(Boolean)
        .join("\n"),
      html: `
        <p>Bonjour,</p>
        <p>Merci pour votre inscription sur UniFresh.</p>
        <p>Code de confirmation : <strong>${escapeHtml(code)}</strong></p>
        <p>Valable <strong>10 minutes</strong>.</p>
        <p><strong>Profil :</strong> ${escapeHtml(profileLabel)}</p>
        <p>L'équipe UniFresh</p>
      `,
    });

    return res.json({ ok: true, expiresInSeconds: 600 });
  } catch (error) {
    console.error("[SMTP] register/send-code:", error);
    return res.status(500).json({ error: formatSmtpError(error) });
  }
});

app.post("/api/register/complete", registerCompleteLimit, async (req, res) => {
  try {
    const body = req.body || {};
    const cleanEmail = String(body.email || "").trim().toLowerCase();
    const code = String(body.code || "").trim();
    if (!cleanEmail || !code) {
      return res.status(400).json({ error: "Email et code requis." });
    }
    if (db.emailExists(cleanEmail)) {
      return res.status(409).json({ error: "Cet e-mail est déjà inscrit." });
    }

    const verified = db.verifyPendingCode(cleanEmail, "register", code);
    if (!verified.ok) return res.status(verified.error.includes("expiré") ? 410 : 401).json({ error: verified.error });

    const profile = {
      email: cleanEmail,
      prenom: String(body.prenom || "").trim(),
      nom: String(body.nom || "").trim(),
      telephone: String(body.telephone || "").trim(),
      age: body.age != null ? Number(body.age) : null,
      profilType: body.profilType || "etudiant",
      canton: String(body.canton || "").trim(),
      ecole: String(body.ecole || "").trim(),
      privacyAcceptedAt: body.privacyAcceptedAt || new Date().toISOString(),
    };

    const savedUser = db.saveUser(profile);

    const inscription = db.addDemandeRecord({
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
        privacyAcceptedAt: profile.privacyAcceptedAt,
      },
    });

    notifyAdminDemande(inscription).catch((err) => console.error("[MAIL] admin inscription:", err));

    return res.json({ ok: true, user: savedUser });
  } catch (error) {
    console.error("[API] register/complete:", error);
    return res.status(500).json({ error: "Impossible de finaliser l'inscription." });
  }
});

app.post("/api/login/send-code", loginCodeLimit, async (req, res) => {
  try {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    if (!cleanEmail) return res.status(400).json({ error: "Email requis." });
    const hasLocalAccount = req.body?.hasLocalAccount === true;
    if (!db.emailExists(cleanEmail) && !hasLocalAccount) {
      return res.status(404).json({ error: "Aucun compte avec cet e-mail. Inscrivez-vous d'abord." });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    db.setPendingCode(cleanEmail, "login", code, Date.now() + 10 * 60 * 1000);

    await sendMail({
      to: cleanEmail,
      subject: "Code de connexion UniFresh",
      text: `Bonjour,\n\nCode de connexion : ${code}\n\nValable 10 minutes.\n\nL'équipe UniFresh`,
      html: `<p>Bonjour,</p><p>Code de connexion : <strong>${escapeHtml(code)}</strong></p><p>Valable 10 minutes.</p>`,
    });

    return res.json({ ok: true, expiresInSeconds: 600 });
  } catch (error) {
    console.error("[SMTP] login/send-code:", error);
    return res.status(500).json({ error: formatSmtpError(error) });
  }
});

async function handleLoginComplete(req, res) {
  try {
    const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!cleanEmail || !code) return res.status(400).json({ error: "Email et code requis." });

    const verified = db.verifyPendingCode(cleanEmail, "login", code);
    if (!verified.ok) {
      return res.status(verified.error.includes("expiré") ? 410 : 401).json({ error: verified.error });
    }

    let user = db.getUserByEmail(cleanEmail);
    if (!user) {
      const profile = req.body?.profile;
      const profileEmail = String(profile?.email || "").trim().toLowerCase();
      if (profile && profileEmail === cleanEmail) {
        user = db.saveUser({
          email: cleanEmail,
          prenom: String(profile.prenom || "").trim(),
          nom: String(profile.nom || "").trim(),
          telephone: String(profile.telephone || "").trim(),
          age: profile.age != null ? Number(profile.age) : null,
          profilType: profile.profilType || "etudiant",
          canton: String(profile.canton || "").trim(),
          ecole: String(profile.ecole || "").trim(),
        });
      }
    }
    if (!user) {
      return res.status(404).json({
        error: "Compte introuvable sur le serveur. Réinscrivez-vous ou contactez le support.",
      });
    }
    return res.json({ ok: true, user });
  } catch (error) {
    console.error("[API] login/complete:", error);
    return res.status(500).json({ error: "Impossible de finaliser la connexion." });
  }
}

app.post("/api/login/complete", loginCompleteLimit, handleLoginComplete);
app.post("/api/login/verify-code", loginCompleteLimit, handleLoginComplete);

app.post("/api/demandes", async (req, res) => {
  try {
    const { kind, profilType, nom, prenom, email, telephone, payload } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    if (!cleanEmail || !kind) {
      return res.status(400).json({ error: "Données de demande incomplètes." });
    }

    const record = db.addDemandeRecord({
      kind,
      profilType,
      nom: String(nom || ""),
      prenom: String(prenom || ""),
      email: cleanEmail,
      telephone: String(telephone || ""),
      payload: payload && typeof payload === "object" ? payload : {},
    });

    notifyAdminDemande(record).catch((err) => console.error("[MAIL] admin demande:", err));

    if (kind === "demande_service") {
      sendMail({
        to: cleanEmail,
        subject: "UniFresh — demande bien reçue",
        text: [
          `Bonjour${prenom ? ` ${prenom}` : ""},`,
          "",
          "Nous avons bien reçu votre demande de nettoyage.",
          "Nous vous recontacterons avec un devis personnalisé.",
          "",
          `Zone d'intervention UniFresh : ${SERVICE_AREA}`,
          "",
          "L'équipe UniFresh",
        ].join("\n"),
        html: clientServiceConfirmationHtml(prenom, record.payload),
      }).catch((err) => console.error("[MAIL] client confirmation:", err));
    }

    return res.json({ ok: true, demande: record });
  } catch (error) {
    console.error("[API] demandes:", error);
    return res.status(500).json({ error: "Impossible d'enregistrer la demande." });
  }
});

app.delete("/api/users", async (req, res) => {
  const cleanEmail = String(req.body?.email || "").trim().toLowerCase();
  if (!cleanEmail) return res.status(400).json({ error: "Email requis." });
  db.deleteUser(cleanEmail);
  return res.json({ ok: true });
});

app.post("/api/admin/request-access", adminRequestLimit, async (req, res) => {
  try {
    const { email, prenom, nom, profilType } = req.body || {};
    const record = db.createAdminAccessRequest({ email, prenom, nom, profilType });
    const adminEmail = String(process.env.ADMIN_REVIEW_EMAIL || process.env.SMTP_USER || "").trim();
    if (!adminEmail) {
      return res.status(500).json({ error: "ADMIN_REVIEW_EMAIL non configuré." });
    }

    const base = appBaseUrl(req);
    const approveUrl = `${base}/api/admin/approve/${record.approveToken}`;
    const rejectUrl = `${base}/api/admin/reject/${record.rejectToken}`;
    const who = [record.prenom, record.nom].filter(Boolean).join(" ") || "Utilisateur";
    const when = new Date(record.createdAt).toLocaleString("fr-FR");

    await sendMail({
      to: adminEmail,
      subject: "[UniFresh] Demande d'accès administration",
      text: [
        "Bonjour,",
        "",
        "Une personne demande l'accès au panneau d'administration UniFresh.",
        "",
        `Identité : ${who}`,
        `E-mail : ${record.email}`,
        `Profil : ${record.profilType}`,
        `Date : ${when}`,
        "",
        "Pour ACCEPTER (un code vous sera envoyé à cette adresse e-mail) :",
        approveUrl,
        "",
        "Pour REFUSER :",
        rejectUrl,
        "",
        "Après acceptation, saisissez le code reçu dans Réglages > Administration sur le site.",
      ].join("\n"),
      html: `
        <p>Bonjour,</p>
        <p><strong>Demande d'accès administration UniFresh</strong></p>
        <ul>
          <li><strong>Identité :</strong> ${escapeHtml(who)}</li>
          <li><strong>E-mail :</strong> ${escapeHtml(record.email)}</li>
          <li><strong>Profil :</strong> ${escapeHtml(record.profilType)}</li>
          <li><strong>Date :</strong> ${escapeHtml(when)}</li>
        </ul>
        <p>Souhaitez-vous autoriser cette personne ?</p>
        <p>
          <a href="${approveUrl}" style="display:inline-block;padding:10px 16px;background:#2a9d67;color:#fff;text-decoration:none;border-radius:6px;margin-right:8px;">Oui, accepter</a>
          <a href="${rejectUrl}" style="display:inline-block;padding:10px 16px;background:#555;color:#fff;text-decoration:none;border-radius:6px;">Non, refuser</a>
        </p>
        <p style="font-size:13px;color:#666;">Après acceptation, un code à 6 chiffres vous sera envoyé par e-mail. Saisissez-le dans <strong>Réglages → Administration</strong> sur le site.</p>
      `,
    });

    return res.json({
      ok: true,
      requestId: record.requestId,
      status: "pending",
      message: "Demande envoyée. En attente de validation par e-mail.",
    });
  } catch (error) {
    console.error("[ADMIN] request-access:", error);
    return res.status(500).json({ error: formatSmtpError(error) });
  }
});

app.get("/api/admin/request-status/:requestId", (req, res) => {
  const payload = db.getAdminRequestStatusPayload(req.params.requestId);
  if (!payload) return res.status(404).json({ error: "Demande introuvable." });
  return res.json(payload);
});

app.get("/api/admin/approve/:token", async (req, res) => {
  try {
    const reqRecord = db.findAdminRequestByApproveToken(req.params.token);
    if (!reqRecord) {
      return res.status(404).send(adminResultHtml("Lien invalide", "Cette demande est introuvable ou déjà traitée."));
    }
    const approved = db.approveAdminAccessRequest(reqRecord.requestId);
    if (!approved) {
      return res.status(409).send(adminResultHtml("Déjà traité", "Cette demande a déjà été traitée."));
    }

    const adminEmail = String(process.env.ADMIN_REVIEW_EMAIL || process.env.SMTP_USER || "").trim();
    await sendMail({
      to: adminEmail,
      subject: "UniFresh — code d'accès administration",
      text: [
        "Demande acceptée.",
        "",
        `Code à saisir sur le site (Réglages > Administration) : ${approved.code}`,
        "",
        "Ce code est valable 15 minutes.",
        "",
        `Demande concernée : ${reqRecord.email}`,
      ].join("\n"),
      html: `
        <p><strong>Demande acceptée.</strong></p>
        <p>Code à saisir sur le site (<em>Réglages → Administration</em>) :</p>
        <p style="font-size:28px;font-weight:bold;letter-spacing:4px;">${escapeHtml(approved.code)}</p>
        <p>Valable <strong>15 minutes</strong>.</p>
        <p style="font-size:13px;color:#666;">Demande : ${escapeHtml(reqRecord.email)}</p>
      `,
    });

    return res.send(
      adminResultHtml(
        "Demande acceptée",
        `Un code à 6 chiffres a été envoyé à <strong>${escapeHtml(adminEmail)}</strong>. Saisissez-le dans <strong>Réglages → Administration</strong> sur le site UniFresh.`
      )
    );
  } catch (error) {
    console.error("[ADMIN] approve:", error);
    return res.status(500).send(adminResultHtml("Erreur", escapeHtml(formatSmtpError(error))));
  }
});

app.get("/api/admin/reject/:token", (req, res) => {
  const reqRecord = db.findAdminRequestByRejectToken(req.params.token);
  if (!reqRecord) {
    return res.status(404).send(adminResultHtml("Lien invalide", "Cette demande est introuvable ou déjà traitée."));
  }
  db.rejectAdminAccessRequest(reqRecord.requestId);
  return res.send(
    adminResultHtml("Demande refusée", "L'accès administration n'a pas été autorisé pour cette personne.")
  );
});

app.post("/api/admin/verify-access-code", adminAccessCodeLimit, (req, res) => {
  const code = String(req.body?.code || "").trim();
  const result = db.consumeAdminAccessCode(code);
  if (!result.ok) {
    return res.status(result.error.includes("expiré") ? 410 : 401).json({ success: false, message: result.error });
  }
  const token = `admin_${crypto.randomBytes(16).toString("hex")}`;
  const expiryMs = Number(process.env.ADMIN_TOKEN_EXPIRY || 3600000);
  const expiresAt = Date.now() + (Number.isFinite(expiryMs) ? expiryMs : 3600000);
  db.saveAdminToken(token, expiresAt);
  return res.json({ success: true, token, expiresAt });
});

app.get("/api/admin/summary", requireAdmin, (_req, res) => {
  res.json(db.adminSummary());
});

app.get("/api/admin/demandes", requireAdmin, (_req, res) => {
  res.json({ demandes: db.listDemandes() });
});

app.patch("/api/admin/demandes/:id/seen", requireAdmin, (req, res) => {
  const seen = req.body?.seen !== false;
  const ok = db.setDemandeSeen(req.params.id, seen);
  if (!ok) return res.status(404).json({ error: "Demande introuvable." });
  return res.json({ ok: true });
});

app.post("/api/admin/demandes/mark-all-seen", requireAdmin, (_req, res) => {
  const count = db.markAllDemandesSeen();
  return res.json({ ok: true, count });
});

app.get("/api/admin/demandes/export.csv", requireAdmin, (_req, res) => {
  const rows = db.listDemandes();
  const header = [
    "id",
    "createdAt",
    "kind",
    "profilType",
    "nom",
    "prenom",
    "email",
    "telephone",
    "adminSeenAt",
    "payload",
  ];
  const escapeCsv = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) {
      return `"${s.replaceAll('"', '""')}"`;
    }
    return s;
  };
  const lines = [
    header.join(","),
    ...rows.map((d) =>
      header
        .map((col) =>
          escapeCsv(col === "payload" ? JSON.stringify(d.payload || {}) : d[col])
        )
        .join(",")
    ),
  ];
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="unifresh-demandes.csv"');
  res.send(`\uFEFF${lines.join("\n")}`);
});

if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { maxAge: isProd ? "1d" : 0, index: false }));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.use((err, _req, res, _next) => {
  console.error("[API] Erreur non gérée:", err);
  res.status(500).json({ error: "Erreur serveur interne." });
});

const backupDir = path.join(DATA_DIR, "backups");
const backupTimer = scheduleBackups(
  DB_FILE,
  backupDir,
  Number(process.env.BACKUP_INTERVAL_MS || 6 * 60 * 60 * 1000)
);

const maintenanceTimer = setInterval(
  () => db.purgeExpiredAdminTokens(),
  Number(process.env.MAINTENANCE_INTERVAL_MS || 15 * 60 * 1000)
);

const server = app.listen(PORT, () => {
  db.purgeExpiredAdminTokens();
  const base = String(process.env.APP_BASE_URL || "").trim() || `http://localhost:${PORT}`;
  console.log(`UniFresh server ${base}`);
  console.log(`Zone : ${SERVICE_AREA}`);
  console.log(`Base de données : ${DB_FILE}`);
  if (fs.existsSync(DIST_DIR)) console.log("Front statique : dist/");
  const user = String(process.env.SMTP_USER || "").trim();
  if (user) {
    createTransporter()
      .verify()
      .then(() => console.log(`[SMTP] OK — ${user}`))
      .catch((err) => console.error(`[SMTP] Échec — ${formatSmtpError(err)}`));
  }
});

function shutdown(signal) {
  console.log(`[SERVER] Arrêt (${signal})…`);
  clearInterval(backupTimer);
  clearInterval(maintenanceTimer);
  server.close(() => {
    db.closeDatabase();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
