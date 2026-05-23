import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR =
  String(process.env.DATA_DIR || "").trim() ||
  (process.env.VERCEL
    ? path.join("/tmp", "unifresh-data")
    : path.join(__dirname, "..", "data"));
export const DB_FILE = path.join(DATA_DIR, "unifresh.json");

const DEFAULT_DB = {
  users: {},
  demandes: [],
  pendingCodes: {},
  adminTokens: {},
  adminAccessRequests: {},
  pendingAdminAccessCode: null,
};

function ensureDb() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf8");
  }
}

function readDb() {
  ensureDb();
  try {
    const raw = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    return {
      users: raw.users && typeof raw.users === "object" ? raw.users : {},
      demandes: Array.isArray(raw.demandes) ? raw.demandes : [],
      pendingCodes: raw.pendingCodes && typeof raw.pendingCodes === "object" ? raw.pendingCodes : {},
      adminTokens: raw.adminTokens && typeof raw.adminTokens === "object" ? raw.adminTokens : {},
      adminAccessRequests:
        raw.adminAccessRequests && typeof raw.adminAccessRequests === "object"
          ? raw.adminAccessRequests
          : {},
      pendingAdminAccessCode:
        raw.pendingAdminAccessCode && typeof raw.pendingAdminAccessCode === "object"
          ? raw.pendingAdminAccessCode
          : null,
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

function writeDb(data) {
  ensureDb();
  const tmp = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, DB_FILE);
}

function mutate(fn) {
  const db = readDb();
  const result = fn(db);
  writeDb(db);
  return result;
}

export function getDatabase() {
  ensureDb();
  return readDb();
}

export function closeDatabase() {}

export function newId(prefix = "") {
  return `${prefix}${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

export function getUserByEmail(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return null;
  return readDb().users[key] || null;
}

export function emailExists(email) {
  return Boolean(getUserByEmail(email));
}

export function saveUser(profile) {
  const key = String(profile.email || "").trim().toLowerCase();
  if (!key) throw new Error("Email requis.");
  return mutate((db) => {
    db.users[key] = {
      ...profile,
      email: key,
      updatedAt: new Date().toISOString(),
      createdAt: db.users[key]?.createdAt || new Date().toISOString(),
    };
    return db.users[key];
  });
}

export function deleteUser(email) {
  const key = String(email || "").trim().toLowerCase();
  if (!key) return false;
  return mutate((db) => {
    if (!db.users[key]) return false;
    delete db.users[key];
    db.demandes = db.demandes.filter((d) => String(d.email || "").trim().toLowerCase() !== key);
    return true;
  });
}

export function setPendingCode(email, type, code, expiresAt, meta = {}) {
  const key = `${type}:${String(email || "").trim().toLowerCase()}`;
  return mutate((db) => {
    db.pendingCodes[key] = { code, expiresAt, type, email: String(email).trim().toLowerCase(), meta };
    return key;
  });
}

export function getPendingCode(email, type) {
  const key = `${type}:${String(email || "").trim().toLowerCase()}`;
  return readDb().pendingCodes[key] || null;
}

export function deletePendingCode(email, type) {
  const key = `${type}:${String(email || "").trim().toLowerCase()}`;
  return mutate((db) => {
    delete db.pendingCodes[key];
  });
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
  mutate((db) => {
    for (const [key, entry] of Object.entries(db.pendingCodes)) {
      if (entry.expiresAt <= now) delete db.pendingCodes[key];
    }
  });
}

export function addDemandeRecord(input) {
  const record = {
    id: newId(),
    createdAt: new Date().toISOString(),
    adminSeenAt: null,
    ...input,
  };
  mutate((db) => {
    db.demandes.push(record);
  });
  return record;
}

export function listDemandes() {
  return readDb().demandes.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function setDemandeSeen(demandeId, seen) {
  return mutate((db) => {
    const idx = db.demandes.findIndex((d) => d.id === demandeId);
    if (idx < 0) return false;
    db.demandes[idx] = {
      ...db.demandes[idx],
      adminSeenAt: seen ? new Date().toISOString() : null,
    };
    return true;
  });
}

export function markAllDemandesSeen() {
  return mutate((db) => {
    const now = new Date().toISOString();
    let count = 0;
    db.demandes = db.demandes.map((d) => {
      if (d.adminSeenAt) return d;
      count += 1;
      return { ...d, adminSeenAt: now };
    });
    return count;
  });
}

export function adminSummary() {
  const demandes = readDb().demandes;
  const unseen = demandes.filter((d) => !d.adminSeenAt);
  return {
    total: demandes.length,
    unseenTotal: unseen.length,
    unseenServices: unseen.filter((d) => d.kind === "demande_service").length,
    unseenInscriptions: unseen.filter((d) => d.kind === "inscription").length,
  };
}

export function saveAdminToken(token, expiresAt) {
  return mutate((db) => {
    db.adminTokens[token] = { expiresAt };
  });
}

export function validateAdminToken(token) {
  const clean = String(token || "").trim();
  if (!clean) return false;
  const db = readDb();
  const entry = db.adminTokens[clean];
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    mutate((d) => {
      delete d.adminTokens[clean];
    });
    return false;
  }
  return true;
}

export function purgeExpiredAdminTokens() {
  const now = Date.now();
  mutate((db) => {
    for (const [token, entry] of Object.entries(db.adminTokens)) {
      if (entry.expiresAt <= now) delete db.adminTokens[token];
    }
    if (db.pendingAdminAccessCode && db.pendingAdminAccessCode.expiresAt <= now) {
      db.pendingAdminAccessCode = null;
    }
    purgeExpiredPendingCodes();
  });
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
  mutate((db) => {
    if (!db.adminAccessRequests) db.adminAccessRequests = {};
    db.adminAccessRequests[requestId] = record;
  });
  return record;
}

export function getAdminAccessRequest(requestId) {
  const clean = String(requestId || "").trim();
  if (!clean) return null;
  return readDb().adminAccessRequests?.[clean] || null;
}

export function getAdminRequestStatusPayload(requestId) {
  const reqRecord = getAdminAccessRequest(requestId);
  if (!reqRecord) return null;
  const db = readDb();
  const pending = db.pendingAdminAccessCode;
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
  for (const req of Object.values(readDb().adminAccessRequests || {})) {
    if (req[column] === clean && req.status === "pending") return req;
  }
  return null;
}

export function findAdminRequestByApproveToken(token) {
  return findAdminRequestByToken("approveToken", token);
}

export function findAdminRequestByRejectToken(token) {
  return findAdminRequestByToken("rejectToken", token);
}

export function approveAdminAccessRequest(requestId) {
  const code = String(crypto.randomInt(100000, 1000000));
  const expiresAt = Date.now() + 15 * 60 * 1000;
  let approved = null;
  mutate((db) => {
    const req = db.adminAccessRequests?.[requestId];
    if (!req || req.status !== "pending") return;
    req.status = "approved";
    req.approvedAt = new Date().toISOString();
    db.pendingAdminAccessCode = { code, expiresAt, requestId, used: false };
    approved = { code, request: req };
  });
  return approved;
}

export function rejectAdminAccessRequest(requestId) {
  return mutate((db) => {
    const req = db.adminAccessRequests?.[requestId];
    if (!req || req.status !== "pending") return false;
    req.status = "rejected";
    req.rejectedAt = new Date().toISOString();
    return true;
  });
}

export function consumeAdminAccessCode(code) {
  const clean = String(code || "").trim();
  if (!clean) return { ok: false, error: "Code requis." };
  const db = readDb();
  const pending = db.pendingAdminAccessCode;
  if (!pending || pending.used) {
    return { ok: false, error: "Aucun code en attente. Approuvez d'abord une demande par e-mail." };
  }
  if (Date.now() > pending.expiresAt) {
    mutate((d) => {
      d.pendingAdminAccessCode = null;
    });
    return { ok: false, error: "Code expiré. Approuvez à nouveau une demande." };
  }
  if (String(pending.code) !== clean) {
    return { ok: false, error: "Code invalide." };
  }
  mutate((d) => {
    if (d.pendingAdminAccessCode) d.pendingAdminAccessCode.used = true;
  });
  return { ok: true, requestId: pending.requestId };
}
