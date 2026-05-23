const API_BASE = String(import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export function apiUrl(path) {
  return `${API_BASE}${path}`;
}

async function readResponsePayload(response) {
  const text = await response.text();
  if (!text) return { data: {}, text: "" };
  try {
    return { data: JSON.parse(text), text };
  } catch {
    return { data: {}, text };
  }
}

async function ensureOk(response) {
  const { data, text } = await readResponsePayload(response);
  if (response.ok) return data;
  if (response.status === 404 && (/Cannot POST/i.test(text) || /NOT_FOUND/i.test(text))) {
    throw new Error(
      "Le service d'inscription est indisponible (API non configurée). Réessayez plus tard ou contactez UniFresh."
    );
  }
  if (response.status === 502 || response.status === 503) {
    throw new Error(
      "Serveur API injoignable. Lancez « npm run server » dans uniclean (port 8787), puis réessayez."
    );
  }
  const detail = data.error || data.message;
  if (detail) throw new Error(detail);
  if (text && text.length < 200 && !text.includes("<html")) throw new Error(text);
  throw new Error(`Erreur serveur (${response.status}).`);
}

/** @deprecated use readResponsePayload via ensureOk */
async function parseJsonResponse(response) {
  const { data } = await readResponsePayload(response);
  return data;
}

export async function fetchPublicConfig() {
  try {
    const res = await fetch(apiUrl("/api/config/public"));
    if (!res.ok) return { serviceArea: "" };
    return parseJsonResponse(res);
  } catch {
    return { serviceArea: "" };
  }
}

export async function checkEmailOnServer(email) {
  try {
    const res = await fetch(apiUrl(`/api/users/check-email?email=${encodeURIComponent(email)}`));
    const data = await parseJsonResponse(res);
    return Boolean(data.exists);
  } catch {
    return false;
  }
}

export async function sendRegisterCode(profile) {
  const res = await fetch(apiUrl("/api/register/send-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });
  return ensureOk(res);
}

export async function registerComplete(profile, code) {
  const email = String(profile?.email || "").trim().toLowerCase();
  const res = await fetch(apiUrl("/api/register/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...profile,
      email,
      code: String(code || "").trim(),
      privacyAcceptedAt: new Date().toISOString(),
    }),
  });
  const data = await ensureOk(res);
  if (!data.user) throw new Error("Réponse serveur invalide.");
  return data;
}

export async function sendLoginCode(email, hasLocalAccount = false) {
  const res = await fetch(apiUrl("/api/login/send-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, hasLocalAccount }),
  });
  return ensureOk(res);
}

export async function loginComplete(email, code, profile = null) {
  const res = await fetch(apiUrl("/api/login/complete"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code, profile: profile || undefined }),
  });
  const data = await ensureOk(res);
  if (!data.user) throw new Error("Réponse serveur invalide.");
  return data;
}

export async function submitDemandeToServer(input) {
  const res = await fetch(apiUrl("/api/demandes"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "Envoi de la demande impossible.");
  return data.demande;
}

export async function deleteUserOnServer(email) {
  await fetch(apiUrl("/api/users"), {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
}

export async function fetchAdminDemandes(authHeaders) {
  const res = await fetch(apiUrl("/api/admin/demandes"), { headers: { ...authHeaders } });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "Chargement admin impossible.");
  return data.demandes || [];
}

export async function patchDemandeSeen(authHeaders, id, seen) {
  const res = await fetch(apiUrl(`/api/admin/demandes/${encodeURIComponent(id)}/seen`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders },
    body: JSON.stringify({ seen }),
  });
  if (!res.ok) {
    const data = await parseJsonResponse(res);
    throw new Error(data.error || "Mise à jour impossible.");
  }
}

export async function markAllDemandesSeenOnServer(authHeaders) {
  const res = await fetch(apiUrl("/api/admin/demandes/mark-all-seen"), {
    method: "POST",
    headers: { ...authHeaders },
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "Erreur serveur.");
  return data.count || 0;
}

export async function requestAdminAccess(payload) {
  const res = await fetch(apiUrl("/api/admin/request-access"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "Impossible d'envoyer la demande.");
  return data;
}

export async function fetchAdminRequestStatus(requestId) {
  const res = await fetch(apiUrl(`/api/admin/request-status/${encodeURIComponent(requestId)}`));
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.error || "Statut indisponible.");
  return data;
}

export async function verifyAdminAccessCode(code) {
  const res = await fetch(apiUrl("/api/admin/verify-access-code"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: String(code || "").trim() }),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data.message || data.error || "Code invalide.");
  return data;
}

export async function downloadAdminCsv(authHeaders) {
  const res = await fetch(apiUrl("/api/admin/demandes/export.csv"), { headers: { ...authHeaders } });
  if (!res.ok) throw new Error("Export CSV impossible.");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `unifresh-demandes-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
