/**
 * Stockage : JSON sur Vercel (sans module natif), SQLite en local / VPS.
 */
import { createRequire } from "module";
import * as json from "./db-json.js";

const require = createRequire(import.meta.url);

function pickImpl() {
  return process.env.VERCEL ? json : require("./db-sqlite.js");
}

const impl = pickImpl();

export const DATA_DIR = impl.DATA_DIR;
export const DB_FILE = impl.DB_FILE;
export const getDatabase = impl.getDatabase;
export const closeDatabase = impl.closeDatabase;
export const newId = impl.newId;
export const getUserByEmail = impl.getUserByEmail;
export const emailExists = impl.emailExists;
export const saveUser = impl.saveUser;
export const deleteUser = impl.deleteUser;
export const setPendingCode = impl.setPendingCode;
export const getPendingCode = impl.getPendingCode;
export const deletePendingCode = impl.deletePendingCode;
export const verifyPendingCode = impl.verifyPendingCode;
export const purgeExpiredPendingCodes = impl.purgeExpiredPendingCodes;
export const addDemandeRecord = impl.addDemandeRecord;
export const listDemandes = impl.listDemandes;
export const setDemandeSeen = impl.setDemandeSeen;
export const markAllDemandesSeen = impl.markAllDemandesSeen;
export const adminSummary = impl.adminSummary;
export const saveAdminToken = impl.saveAdminToken;
export const validateAdminToken = impl.validateAdminToken;
export const purgeExpiredAdminTokens = impl.purgeExpiredAdminTokens;
export const createAdminAccessRequest = impl.createAdminAccessRequest;
export const getAdminAccessRequest = impl.getAdminAccessRequest;
export const getAdminRequestStatusPayload = impl.getAdminRequestStatusPayload;
export const findAdminRequestByApproveToken = impl.findAdminRequestByApproveToken;
export const findAdminRequestByRejectToken = impl.findAdminRequestByRejectToken;
export const approveAdminAccessRequest = impl.approveAdminAccessRequest;
export const rejectAdminAccessRequest = impl.rejectAdminAccessRequest;
export const consumeAdminAccessCode = impl.consumeAdminAccessCode;
