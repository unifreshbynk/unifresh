import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import Database from "better-sqlite3";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR =
  String(process.env.DATA_DIR || "").trim() ||
  (process.env.VERCEL
    ? path.join("/tmp", "unifresh-data")
    : path.join(__dirname, "..", "data"));
export const DB_FILE = path.join(DATA_DIR, "unifresh.db");
const LEGACY_JSON = path.join(DATA_DIR, "unifresh.json");

/** @type {import("better-sqlite3").Database | null} */
let sqlite = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function initSchema(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      prenom TEXT NOT NULL DEFAULT '',
      nom TEXT NOT NULL DEFAULT '',
      telephone TEXT NOT NULL DEFAULT '',
      age INTEGER,
      profil_type TEXT NOT NULL DEFAULT 'etudiant',
      canton TEXT NOT NULL DEFAULT '',
      ecole TEXT NOT NULL DEFAULT '',
      privacy_accepted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS demandes (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      kind TEXT NOT NULL,
      profil_type TEXT,
      nom TEXT,
      prenom TEXT,
      email TEXT,
      telephone TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      admin_seen_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_demandes_created ON demandes(created_at DESC);
    CREATE TABLE IF NOT EXISTS pending_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      type TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      meta TEXT NOT NULL DEFAULT '{}'
    );
    CREATE INDEX IF NOT EXISTS idx_pending_expires ON pending_codes(expires_at);
    CREATE TABLE IF NOT EXISTS admin_tokens (
      token TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_access_requests (
      request_id TEXT PRIMARY KEY,
      status TEXT NOT NULL,
      email TEXT NOT NULL,
      prenom TEXT NOT NULL DEFAULT '',
      nom TEXT NOT NULL DEFAULT '',
      profil_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      approved_at TEXT,
      rejected_at TEXT,
      approve_token TEXT NOT NULL,
      reject_token TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function rowToUser(row) {
  if (!row) return null;
  return {
    email: row.email,
    prenom: row.prenom,
    nom: row.nom,
    telephone: row.telephone,
    age: row.age,
    profilType: row.profil_type,
    canton: row.canton,
    ecole: row.ecole,
    privacyAcceptedAt: row.privacy_accepted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToDemande(row) {
  let payload = {};
  try {
    payload = JSON.parse(row.payload || "{}");
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    createdAt: row.created_at,
    kind: row.kind,
    profilType: row.profil_type,
    nom: row.nom,
    prenom: row.prenom,
    email: row.email,
    telephone: row.telephone,
    payload,
    adminSeenAt: row.admin_seen_at,
  };
}

function getPendingAdminAccessCode(database) {
  const row = database.prepare("SELECT value FROM app_state WHERE key = ?").get("pendingAdminAccessCode");
  if (!row) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

function setPendingAdminAccessCode(database, value) {
  if (!value) {
    database.prepare("DELETE FROM app_state WHERE key = ?").run("pendingAdminAccessCode");
    return;
  }
  database
    .prepare(
      `INSERT INTO app_state (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run("pendingAdminAccessCode", JSON.stringify(value));
}

function migrateFromLegacyJson(database) {
  if (!fs.existsSync(LEGACY_JSON)) return;
  const marker = path.join(DATA_DIR, ".json-migrated");
  if (fs.existsSync(marker)) return;

  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(LEGACY_JSON, "utf8"));
  } catch {
    console.warn("[DB] unifresh.json illisible — migration ignorée.");
    return;
  }

  const insertUser = database.prepare(`
    INSERT OR REPLACE INTO users (email, prenom, nom, telephone, age, profil_type, canton, ecole, privacy_accepted_at, created_at, updated_at)
    VALUES (@email, @prenom, @nom, @telephone, @age, @profil_type, @canton, @ecole, @privacy_accepted_at, @created_at, @updated_at)
  `);
  const insertDemande = database.prepare(`
    INSERT OR IGNORE INTO demandes (id, created_at, kind, profil_type, nom, prenom, email, telephone, payload, admin_seen_at)
    VALUES (@id, @created_at, @kind, @profil_type, @nom, @prenom, @email, @telephone, @payload, @admin_seen_at)
  `);
  const insertPending = database.prepare(`
    INSERT OR REPLACE INTO pending_codes (id, email, type, code, expires_at, meta)
    VALUES (@id, @email, @type, @code, @expires_at, @meta)
  `);
  const insertToken = database.prepare(`
    INSERT OR REPLACE INTO admin_tokens (token, expires_at) VALUES (@token, @expires_at)
  `);
  const insertAdminReq = database.prepare(`
    INSERT OR REPLACE INTO admin_access_requests
    (request_id, status, email, prenom, nom, profil_type, created_at, approved_at, rejected_at, approve_token, reject_token)
    VALUES (@request_id, @status, @email, @prenom, @nom, @profil_type, @created_at, @approved_at, @rejected_at, @approve_token, @reject_token)
  `);

  const tx = database.transaction(() => {
    for (const [email, u] of Object.entries(raw.users || {})) {
      insertUser.run({
        email: String(email).toLowerCase(),
        prenom: u.prenom || "",
        nom: u.nom || "",
        telephone: u.telephone || "",
        age: u.age ?? null,
        profil_type: u.profilType || "etudiant",
        canton: u.canton || "",
        ecole: u.ecole || "",
        privacy_accepted_at: u.privacyAcceptedAt || null,
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: u.updatedAt || new Date().toISOString(),
      });
    }
    for (const d of raw.demandes || []) {
      insertDemande.run({
        id: d.id,
        created_at: d.createdAt,
        kind: d.kind,
        profil_type: d.profilType,
        nom: d.nom,
        prenom: d.prenom,
        email: d.email,
        telephone: d.telephone,
        payload: JSON.stringify(d.payload || {}),
        admin_seen_at: d.adminSeenAt,
      });
    }
    for (const [id, p] of Object.entries(raw.pendingCodes || {})) {
      insertPending.run({
        id,
        email: p.email,
        type: p.type,
        code: p.code,
        expires_at: p.expiresAt,
        meta: JSON.stringify(p.meta || {}),
      });
    }
    for (const [token, t] of Object.entries(raw.adminTokens || {})) {
      insertToken.run({ token, expires_at: t.expiresAt });
    }
    for (const req of Object.values(raw.adminAccessRequests || {})) {
      insertAdminReq.run({
        request_id: req.requestId,
        status: req.status,
        email: req.email,
        prenom: req.prenom || "",
        nom: req.nom || "",
        profil_type: req.profilType || "",
        created_at: req.createdAt,
        approved_at: req.approvedAt || null,
        rejected_at: req.rejectedAt || null,
        approve_token: req.approveToken,
        reject_token: req.rejectToken,
      });
    }
    if (raw.pendingAdminAccessCode) {
      setPendingAdminAccessCode(database, raw.pendingAdminAccessCode);
    }
  });
  tx();
  fs.writeFileSync(marker, new Date().toISOString(), "utf8");
  const archived = `${LEGACY_JSON}.migrated.${Date.now()}`;
  fs.renameSync(LEGACY_JSON, archived);
  console.log(`[DB] Migration JSON → SQLite terminée (archive : ${path.basename(archived)})`);
}

export function getDatabase() {
  if (sqlite) return sqlite;
  ensureDataDir();
  sqlite = new Database(DB_FILE);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("busy_timeout = 5000");
  sqlite.pragma("foreign_keys = ON");
  initSchema(sqlite);
  migrateFromLegacyJson(sqlite);
  purgeExpiredPendingCodes();
  return sqlite;
}

export function closeDatabase() {
  if (sqlite) {
    sqlite.close();
    sqlite = null;
  }
}

function transaction(fn) {
  const database = getDatabase();
  return database.transaction(fn)();
}

export function newId(prefix = "") {
  return `${prefix}${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function getUserByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  const row = getDatabase().prepare("SELECT * FROM users WHERE email = ?").get(key);
  return rowToUser(row);
}

export function emailExists(email) {
  return Boolean(getUserByEmail(email));
}

export function saveUser(profile) {
  const key = String(profile.email || "").trim().toLowerCase();
  if (!key) throw new Error("Email requis.");
  const now = new Date().toISOString();
  const existing = getUserByEmail(key);
  const createdAt = existing?.createdAt || now;
  getDatabase()
    .prepare(
      `INSERT INTO users (email, prenom, nom, telephone, age, profil_type, canton, ecole, privacy_accepted_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET
         prenom = excluded.prenom,
         nom = excluded.nom,
         telephone = excluded.telephone,
         age = excluded.age,
         profil_type = excluded.profil_type,
         canton = excluded.canton,
         ecole = excluded.ecole,
         privacy_accepted_at = COALESCE(excluded.privacy_accepted_at, users.privacy_accepted_at),
         updated_at = excluded.updated_at`
    )
    .run(
      key,
      String(profile.prenom || "").trim(),
      String(profile.nom || "").trim(),
      String(profile.telephone || "").trim(),
      profile.age != null ? Number(profile.age) : null,
      profile.profilType || "etudiant",
      String(profile.canton || "").trim(),
      String(profile.ecole || "").trim(),
      profile.privacyAcceptedAt || existing?.privacyAcceptedAt || null,
      createdAt,
      now
    );
  return getUserByEmail(key);
}

export function deleteUser(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return false;
  let deleted = false;
  transaction(() => {
    const database = getDatabase();
    const info = database.prepare("DELETE FROM users WHERE email = ?").run(key);
    database.prepare("DELETE FROM demandes WHERE lower(email) = ?").run(key);
    deleted = info.changes > 0;
  });
  return deleted;
}

export function setPendingCode(email, type, code, expiresAt, meta = {}) {
  const key = `${type}:${String(email || "").trim().toLowerCase()}`;
  getDatabase()
    .prepare(
      `INSERT INTO pending_codes (id, email, type, code, expires_at, meta)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET code = excluded.code, expires_at = excluded.expires_at, meta = excluded.meta`
    )
    .run(key, String(email).trim().toLowerCase(), type, code, expiresAt, JSON.stringify(meta || {}));
  return key;
}

export function getPendingCode(email, type) {
  const key = `${type}:${String(email || "").trim().toLowerCase()}`;
  const row = getDatabase().prepare("SELECT * FROM pending_codes WHERE id = ?").get(key);
  if (!row) return null;
  let meta = {};
  try {
    meta = JSON.parse(row.meta || "{}");
  } catch {
    meta = {};
  }
  return { code: row.code, expiresAt: row.expires_at, type: row.type, email: row.email, meta };
}

export function deletePendingCode(email, type) {
  const key = `${type}:${String(email || "").trim().toLowerCase()}`;
  getDatabase().prepare("DELETE FROM pending_codes WHERE id = ?").run(key);
}

export function verifyPendingCode(email, type, code) {
  const pending = getPendingCode(email, type);
  if (!pending) return { ok: false, error: "Aucun code en attente pour cet e-mail." };
  if (Date.now() > pending.expiresAt) {
    deletePendingCode(email, type);
    return { ok: false, error: "Code expiré. Demandez un nouveau code." };
  }
  if (String(pending.code) !== String(code).trim()) {
    return { ok: false, error: "Code invalide." };
  }
  deletePendingCode(email, type);
  return { ok: true, meta: pending.meta || {} };
}

export function purgeExpiredPendingCodes() {
  const now = Date.now();
  getDatabase().prepare("DELETE FROM pending_codes WHERE expires_at <= ?").run(now);
}

export function addDemandeRecord(input) {
  const record = {
    id: newId(),
    createdAt: new Date().toISOString(),
    adminSeenAt: null,
    ...input,
  };
  getDatabase()
    .prepare(
      `INSERT INTO demandes (id, created_at, kind, profil_type, nom, prenom, email, telephone, payload, admin_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.id,
      record.createdAt,
      record.kind,
      record.profilType,
      record.nom,
      record.prenom,
      record.email,
      record.telephone,
      JSON.stringify(record.payload || {}),
      record.adminSeenAt
    );
  return record;
}

export function listDemandes() {
  const rows = getDatabase()
    .prepare("SELECT * FROM demandes ORDER BY created_at DESC")
    .all();
  return rows.map(rowToDemande);
}

export function setDemandeSeen(demandeId, seen) {
  const info = getDatabase()
    .prepare("UPDATE demandes SET admin_seen_at = ? WHERE id = ?")
    .run(seen ? new Date().toISOString() : null, demandeId);
  return info.changes > 0;
}

export function markAllDemandesSeen() {
  return transaction(() => {
    const database = getDatabase();
    const rows = database.prepare("SELECT id FROM demandes WHERE admin_seen_at IS NULL").all();
    const now = new Date().toISOString();
    const stmt = database.prepare("UPDATE demandes SET admin_seen_at = ? WHERE id = ?");
    for (const row of rows) stmt.run(now, row.id);
    return rows.length;
  });
}

export function adminSummary() {
  const database = getDatabase();
  const total = database.prepare("SELECT COUNT(*) AS c FROM demandes").get().c;
  const unseen = database.prepare("SELECT * FROM demandes WHERE admin_seen_at IS NULL").all();
  return {
    total,
    unseenTotal: unseen.length,
    unseenServices: unseen.filter((d) => d.kind === "demande_service").length,
    unseenInscriptions: unseen.filter((d) => d.kind === "inscription").length,
  };
}

export function saveAdminToken(token, expiresAt) {
  getDatabase()
    .prepare("INSERT OR REPLACE INTO admin_tokens (token, expires_at) VALUES (?, ?)")
    .run(token, expiresAt);
}

export function validateAdminToken(token) {
  const clean = String(token || "").trim();
  if (!clean) return false;
  const row = getDatabase().prepare("SELECT expires_at FROM admin_tokens WHERE token = ?").get(clean);
  if (!row) return false;
  if (Date.now() > row.expires_at) {
    getDatabase().prepare("DELETE FROM admin_tokens WHERE token = ?").run(clean);
    return false;
  }
  return true;
}

export function purgeExpiredAdminTokens() {
  const now = Date.now();
  const database = getDatabase();
  database.prepare("DELETE FROM admin_tokens WHERE expires_at <= ?").run(now);
  purgeExpiredPendingCodes();
  const pending = getPendingAdminAccessCode(database);
  if (pending && pending.expiresAt <= now) {
    setPendingAdminAccessCode(database, null);
  }
}

export function createAdminAccessRequest({ email, prenom, nom, profilType }) {
  const requestId = newId("req_");
  const approveToken = crypto.randomBytes(20).toString("hex");
  const rejectToken = crypto.randomBytes(20).toString("hex");
  const record = {
    requestId,
    status: "pending",
    email: String(email || "").trim().toLowerCase() || "non-renseigne@visiteur.local",
    prenom: String(prenom || "").trim(),
    nom: String(nom || "").trim(),
    profilType: String(profilType || "inconnu"),
    createdAt: new Date().toISOString(),
    approveToken,
    rejectToken,
  };
  getDatabase()
    .prepare(
      `INSERT INTO admin_access_requests
       (request_id, status, email, prenom, nom, profil_type, created_at, approve_token, reject_token)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      record.requestId,
      record.status,
      record.email,
      record.prenom,
      record.nom,
      record.profilType,
      record.createdAt,
      record.approveToken,
      record.rejectToken
    );
  return record;
}

export function getAdminAccessRequest(requestId) {
  const clean = String(requestId || "").trim();
  if (!clean) return null;
  const row = getDatabase()
    .prepare("SELECT * FROM admin_access_requests WHERE request_id = ?")
    .get(clean);
  if (!row) return null;
  return {
    requestId: row.request_id,
    status: row.status,
    email: row.email,
    prenom: row.prenom,
    nom: row.nom,
    profilType: row.profil_type,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
    approveToken: row.approve_token,
    rejectToken: row.reject_token,
  };
}

export function getAdminRequestStatusPayload(requestId) {
  const reqRecord = getAdminAccessRequest(requestId);
  if (!reqRecord) return null;
  const pending = getPendingAdminAccessCode(getDatabase());
  const canEnterCode =
    reqRecord.status === "approved" &&
    pending &&
    !pending.used &&
    pending.requestId === reqRecord.requestId &&
    Date.now() <= pending.expiresAt;
  return {
    requestId: reqRecord.requestId,
    status: reqRecord.status,
    canEnterCode: Boolean(canEnterCode),
  };
}

function findAdminRequestByToken(column, token) {
  const clean = String(token || "").trim();
  if (!clean) return null;
  const row = getDatabase()
    .prepare(`SELECT * FROM admin_access_requests WHERE ${column} = ? AND status = 'pending'`)
    .get(clean);
  if (!row) return null;
  return getAdminAccessRequest(row.request_id);
}

export function findAdminRequestByApproveToken(token) {
  return findAdminRequestByToken("approve_token", token);
}

export function findAdminRequestByRejectToken(token) {
  return findAdminRequestByToken("reject_token", token);
}

export function approveAdminAccessRequest(requestId) {
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = Date.now() + 15 * 60 * 1000;
  let approved = null;
  transaction(() => {
    const database = getDatabase();
    const req = getAdminAccessRequest(requestId);
    if (!req || req.status !== "pending") return;
    database
      .prepare(
        "UPDATE admin_access_requests SET status = 'approved', approved_at = ? WHERE request_id = ?"
      )
      .run(new Date().toISOString(), requestId);
    setPendingAdminAccessCode(database, { code, expiresAt, requestId, used: false });
    approved = { code, request: getAdminAccessRequest(requestId) };
  });
  return approved;
}

export function rejectAdminAccessRequest(requestId) {
  const info = getDatabase()
    .prepare(
      "UPDATE admin_access_requests SET status = 'rejected', rejected_at = ? WHERE request_id = ? AND status = 'pending'"
    )
    .run(new Date().toISOString(), requestId);
  return info.changes > 0;
}

export function consumeAdminAccessCode(code) {
  const clean = String(code || "").trim();
  if (!clean) return { ok: false, error: "Code requis." };
  const database = getDatabase();
  const pending = getPendingAdminAccessCode(database);
  if (!pending || pending.used) {
    return { ok: false, error: "Aucun code en attente. Approuvez d'abord une demande par e-mail." };
  }
  if (Date.now() > pending.expiresAt) {
    setPendingAdminAccessCode(database, null);
    return { ok: false, error: "Code expiré. Approuvez à nouveau une demande." };
  }
  if (String(pending.code) !== clean) {
    return { ok: false, error: "Code invalide." };
  }
  setPendingAdminAccessCode(database, { ...pending, used: true });
  return { ok: true, requestId: pending.requestId };
}
