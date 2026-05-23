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

import { verifyAdminAccessCode as verifyAdminAccessCodeApi } from "./api.js";

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
 *   adresse: string,
 *   typeLogement?: string,
 *   typeLogementAutre?: string,
 *   nbPieces?: string,
 *   produitsNettoyage?: string,
 *   zoneIntervention?: string
 * }} ServiceDetailForm
 */

/** Options formulaire demande — profil particulier uniquement. */
export const PARTICULIER_LOGEMENT_OPTIONS = [
  { id: "appartement", label: "Appartement", desc: "Studio, T2, T3, duplex…" },
  { id: "maison", label: "Maison", desc: "Maison, villa, chalet, mitoyenne…" },
  { id: "airbnb", label: "Airbnb / location courte durée", desc: "Entre deux séjours, remise en état locative" },
  { id: "autre", label: "Autre", desc: "Précisez le type de logement" },
];

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

/** Produits sur place — particulier et entreprise (impact tarif devis). */
export const PRODUITS_NETTOYAGE_OPTIONS = [
  {
    id: "deja",
    label: "J’ai déjà les produits de nettoyage",
    desc: "Détergents, serpillière, seau, etc. disponibles sur place.",
    tarif: "reduit",
    tarifLabel: "Tarif réduit",
  },
  {
    id: "pas",
    label: "Je n’ai pas les produits de nettoyage",
    desc: "UniFresh fournit les produits nécessaires à l’intervention.",
    tarif: "normal",
    tarifLabel: "Tarif normal",
  },
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

/** @param {string} email */
export function isEmailRegisteredLocally(email) {
  const stored = loadUser();
  if (!stored) return false;
  const a = String(email || "").trim().toLowerCase();
  const b = String(stored.email || "").trim().toLowerCase();
  return Boolean(a && b && a === b);
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
        typeLogement: String(o.typeLogement ?? ""),
        typeLogementAutre: String(o.typeLogementAutre ?? ""),
        nbPieces: String(o.nbPieces ?? ""),
        produitsNettoyage: String(o.produitsNettoyage ?? ""),
        zoneIntervention: String(o.zoneIntervention ?? ""),
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
    typeLogement: "",
    typeLogementAutre: "",
    nbPieces: "",
    produitsNettoyage: "",
    zoneIntervention: "",
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
const ADMIN_REQUEST_ID_KEY = "unifresh_admin_request_id";

export function loadAdminRequestId() {
  try {
    return localStorage.getItem(ADMIN_REQUEST_ID_KEY) || "";
  } catch {
    return "";
  }
}

export function saveAdminRequestId(requestId) {
  if (requestId) localStorage.setItem(ADMIN_REQUEST_ID_KEY, requestId);
}

export function clearAdminRequestId() {
  localStorage.removeItem(ADMIN_REQUEST_ID_KEY);
}

/** @param {{ token: string, expiresAt: number }} session */
export function saveAdminSession(session) {
  localStorage.setItem(ADMIN_TOKEN_KEY, JSON.stringify(session));
}

/** @param {string} code */
export async function verifyAdminAccessCode(code) {
  try {
    const data = await verifyAdminAccessCodeApi(code);
    if (data.success && data.token) {
      saveAdminSession({ token: data.token, expiresAt: data.expiresAt });
      return true;
    }
    return false;
  } catch {
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

/** @returns {Record<string, string>} */
export function getAdminAuthHeaders() {
  try {
    const raw = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!raw) return {};
    const stored = JSON.parse(raw);
    if (!stored?.token || !stored?.expiresAt || stored.expiresAt <= Date.now()) return {};
    return { Authorization: `Bearer ${stored.token}` };
  } catch {
    return {};
  }
}

/** @param {import("./storage").DemandeRecord[]} records */
export function replaceDemandesCache(records) {
  saveDemandes(records);
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
