import { useState, useMemo, useCallback, useEffect } from "react";
import {
  loadUser,
  isEmailRegisteredLocally,
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
  syncUserDemandesFromProfile,
  removeDemandesForUserEmail,
  PROFIL_LABELS,
  TYPE_LIEU_OPTIONS,
  PARTICULIER_LOGEMENT_OPTIONS,
  INTENSITE_OPTIONS,
  PRODUITS_NETTOYAGE_OPTIONS,
  SWISS_CANTONS,
  verifyAdminAccessCode,
  isAdminTokenValid,
  clearAdminToken,
  loadAdminRequestId,
  saveAdminRequestId,
  clearAdminRequestId,
  getAdminAuthHeaders,
  replaceDemandesCache,
  CRENEAU_SOIR_WEEKEND,
  loadSiteSettings,
  saveSiteSettings,
} from "./storage";
import {
  fetchPublicConfig,
  checkEmailOnServer,
  sendRegisterCode,
  registerComplete,
  sendLoginCode,
  loginComplete,
  submitDemandeToServer,
  deleteUserOnServer,
  fetchAdminDemandes,
  patchDemandeSeen,
  markAllDemandesSeenOnServer,
  requestAdminAccess,
  fetchAdminRequestStatus,
} from "./api.js";
import { toISODate, startOfWeekMonday } from "./dates";
import CookieConsent from "./CookieConsent.jsx";
import { CreneauxSoirWeekend } from "./WeekCalendar.jsx";
import { LegalModal, SiteFooter } from "./LegalModal.jsx";

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
    hasAny("nom", "entreprise", "societe", "nom de l'entreprise", "email", "telephone", "prenom")
  ) {
    return "Pour modifier vos informations (nom d'entreprise, e-mail, telephone...), deconnectez-vous puis refaites l'inscription avec les bonnes donnees sur cet appareil. Le site ne propose pas encore l'edition directe du profil apres inscription.";
  }
  if (hasAny("supprimer", "effacer", "retirer") && hasAny("compte", "inscription", "donnees")) {
    return "Connectez-vous puis ouvrez Reglages : section Compte, tout en bas « Supprimer mon compte ». Confirmez pour effacer votre profil et vos demandes sur cet appareil.";
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
  const [legalPage, setLegalPage] = useState(/** @type {"mentions"|"privacy"|null} */ (null));
  const [serviceArea, setServiceArea] = useState("");
  const shellAppearance = useMemo(() => appearanceClassNames(appearance), [appearance]);

  useEffect(() => {
    fetchPublicConfig().then((cfg) => {
      if (cfg.serviceArea) setServiceArea(cfg.serviceArea);
    });
  }, []);

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
          setDemandesVersion((v) => v + 1);
          setUser(normalizeUser(profile));
        }}
        serviceArea={serviceArea}
        legalPage={legalPage}
        onOpenLegal={setLegalPage}
        onCloseLegal={() => setLegalPage(null)}
        onLogin={(profile) => {
          saveSessionEmail(String(profile.email || "").trim().toLowerCase());
          setUser(normalizeUser(profile));
        }}
        onOpenAdminPanel={() => setAdminOpen(true)}
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
            onOpenAdminPanel={() => {
              if (isAdminTokenValid()) setAdminOpen(true);
            }}
            account={user}
            onSaveAccount={(profile) => {
              const normalized = normalizeUser(profile);
              saveUser(normalized);
              syncUserDemandesFromProfile(normalized);
              setDemandesVersion((v) => v + 1);
              setUser(normalized);
            }}
            onDeleteAccount={async () => {
              try {
                await deleteUserOnServer(user.email);
              } catch {
                /* serveur indisponible : suppression locale quand même */
              }
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
                  {user.profilType === "particulier" ? (
                    <>
                      Indiquez la surface en m², le type de logement (appartement, maison, Airbnb…)
                      et ce que vous souhaitez faire nettoyer. Puis choisissez vos créneaux.
                      UniFresh vous recontactera rapidement.
                    </>
                  ) : (
                    <>
                      Renseignez le formulaire ci-dessous : surface, type de locaux et niveau de
                      salissure. Ensuite, précisez les créneaux pour une visite ou une intervention
                      {user.profilType === "entreprise"
                        ? " (une semaine précise ou un besoin régulier qui se répète)."
                        : "."}{" "}
                      UniFresh vous recontactera rapidement.
                    </>
                  )}
                </p>
              </section>
            ) : null}
            <ClientServiceForm
              profilType={user.profilType}
              serviceArea={serviceArea}
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
              onSubmitted={async (data) => {
                const input = {
                  kind: "demande_service",
                  profilType: user.profilType,
                  nom: user.nom,
                  prenom: user.prenom,
                  email: user.email,
                  telephone: user.telephone,
                  payload: data,
                };
                try {
                  const record = await submitDemandeToServer(input);
                  addDemande({ ...input, id: record.id, createdAt: record.createdAt });
                } catch {
                  addDemande(input);
                }
                setDemandesVersion((v) => v + 1);
                setServiceRequestSubmitted(true);
              }}
            />
          </>
        )}
      </main>

      <SiteFooter onOpen={setLegalPage} />
      <LegalModal open={Boolean(legalPage)} page={legalPage} onClose={() => setLegalPage(null)} />
      <CookieConsent onOpenPrivacy={setLegalPage} />
      <AiAdvisorWidget />
    </div>
  );
}

function buildProduitsNettoyagePayload(produitsNettoyage) {
  const opt = PRODUITS_NETTOYAGE_OPTIONS.find((o) => o.id === produitsNettoyage);
  return {
    produitsNettoyage,
    tarifIndication: opt?.tarif ?? "",
    tarifLabel: opt?.tarifLabel ?? "",
    produitsNettoyageLabel: opt?.label ?? "",
  };
}

function formatProduitsNettoyageAdmin(payload) {
  if (!payload?.produitsNettoyage) return null;
  const opt = PRODUITS_NETTOYAGE_OPTIONS.find((o) => o.id === payload.produitsNettoyage);
  if (!opt) return String(payload.produitsNettoyageLabel || payload.produitsNettoyage);
  return `${opt.label} — ${opt.tarifLabel}`;
}

function formatParticulierLogement(payload) {
  if (!payload?.typeLogement) return null;
  const opt = PARTICULIER_LOGEMENT_OPTIONS.find((o) => o.id === payload.typeLogement);
  let label = opt?.label || String(payload.typeLogement);
  if (payload.typeLogement === "autre" && payload.typeLogementAutre) {
    label += ` (${payload.typeLogementAutre})`;
  }
  return label;
}

function ClientServiceForm({
  profilType,
  serviceArea = "",
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
  const isParticulier = profilType === "particulier";
  const [detailInit] = useState(() => loadServiceDetail());
  const [surfaceM2, setSurfaceM2] = useState(detailInit.surfaceM2);
  const [intensite, setIntensite] = useState(detailInit.intensite);
  const [typeLieu, setTypeLieu] = useState(detailInit.typeLieu);
  const [typeLieuAutre, setTypeLieuAutre] = useState(detailInit.typeLieuAutre);
  const [typeLogement, setTypeLogement] = useState(detailInit.typeLogement || "");
  const [typeLogementAutre, setTypeLogementAutre] = useState(detailInit.typeLogementAutre || "");
  const [nbPieces, setNbPieces] = useState(detailInit.nbPieces || "");
  const [detailsLavage, setDetailsLavage] = useState(detailInit.detailsLavage);
  const [notesComplementaires, setNotesComplementaires] = useState(detailInit.notesComplementaires);
  const [adresse, setAdresse] = useState(detailInit.adresse);
  const [produitsNettoyage, setProduitsNettoyage] = useState(detailInit.produitsNettoyage || "");
  const [zoneIntervention, setZoneIntervention] = useState(detailInit.zoneIntervention || "");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function persistPartial() {
    saveServiceDetail({
      surfaceM2,
      intensite,
      typeLieu,
      typeLieuAutre,
      typeLogement,
      typeLogementAutre,
      nbPieces,
      produitsNettoyage,
      zoneIntervention,
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
    if (!zoneIntervention) {
      setError("Choisissez le canton ou la zone d'intervention.");
      return;
    }
    if (adresse.trim().length < 12) {
      setError(
        isParticulier
          ? "Indiquez l’adresse complète du logement (rue, numéro, code postal et ville)."
          : "Indiquez l’adresse complète des locaux (rue, numéro, code postal et ville — au moins une ligne claire)."
      );
      return;
    }
    if (isParticulier) {
      if (!typeLogement) {
        setError("Indiquez le type de logement : appartement, maison, Airbnb…");
        return;
      }
      if (typeLogement === "autre" && !typeLogementAutre.trim()) {
        setError("Précisez le type de logement dans le champ « Autre ».");
        return;
      }
    } else {
      if (!typeLieu) {
        setError("Indiquez le type de locaux à nettoyer.");
        return;
      }
      if (typeLieu === "autre" && !typeLieuAutre.trim()) {
        setError("Précisez le type de lieu dans le champ « Autre ».");
        return;
      }
    }
    if (!intensite) {
      setError("Choisissez le niveau de nettoyage : léger, moyen ou gros travail.");
      return;
    }
    if (!produitsNettoyage) {
      setError("Indiquez si vous avez déjà les produits de nettoyage sur place.");
      return;
    }
    const produitsFields = buildProduitsNettoyagePayload(produitsNettoyage);
    const zoneLabel =
      SWISS_CANTONS.find((c) => c.value === zoneIntervention)?.label || zoneIntervention;
    if (detailsLavage.trim().length < 10) {
      setError(
        isParticulier
          ? "Décrivez ce que vous souhaitez faire nettoyer (au moins quelques mots)."
          : "Décrivez ce que nous devons laver (au moins quelques mots)."
      );
      return;
    }
    setError("");
    const payload = isParticulier
      ? {
          surfaceM2: String(m2),
          intensite,
          ...produitsFields,
          typeLogement,
          typeLogementAutre: typeLogement === "autre" ? typeLogementAutre.trim() : "",
          typeLogementLabel: formatParticulierLogement({
            typeLogement,
            typeLogementAutre: typeLogement === "autre" ? typeLogementAutre.trim() : "",
          }),
          nbPieces: nbPieces.trim(),
          zoneIntervention,
          zoneInterventionLabel: zoneLabel,
          detailsLavage: detailsLavage.trim(),
          notesComplementaires: notesComplementaires.trim(),
          adresse: adresse.trim(),
          profilFormulaire: "particulier",
        }
      : {
          surfaceM2: String(m2),
          intensite,
          ...produitsFields,
          typeLieu,
          typeLieuAutre: typeLieu === "autre" ? typeLieuAutre.trim() : "",
          zoneIntervention,
          zoneInterventionLabel: zoneLabel,
          detailsLavage: detailsLavage.trim(),
          notesComplementaires: notesComplementaires.trim(),
          adresse: adresse.trim(),
          profilFormulaire: "entreprise",
        };
    saveServiceDetail({
      ...payload,
      typeLieu: isParticulier ? "" : typeLieu,
      typeLieuAutre: isParticulier ? "" : typeLieu === "autre" ? typeLieuAutre.trim() : "",
      typeLogement: isParticulier ? typeLogement : "",
      typeLogementAutre: isParticulier && typeLogement === "autre" ? typeLogementAutre.trim() : "",
      nbPieces: isParticulier ? nbPieces.trim() : "",
    });
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
        {isParticulier
          ? "Surface en m², type de logement et détails du nettoyage : nous préparons un devis adapté à votre maison, appartement ou location."
          : "Ces informations nous permettent d’estimer la charge de travail et de vous proposer un devis adapté."}
      </p>
      {serviceArea ? <p className="hint">Zone couverte par UniFresh : {serviceArea}</p> : null}
      <p className="hint pricing-disclaimer">
        Les mentions « tarif réduit » et « tarif normal » sont indicatives ; le prix définitif figure
        uniquement sur le devis que nous vous enverrons.
      </p>

      <form className="form client-service-form" onSubmit={submit} noValidate>
        {error ? (
          <div className="alert" role="alert">
            {error}
          </div>
        ) : null}
        <div className="form-section">
          <h3 className="form-section-title">Canton / zone d&apos;intervention</h3>
          <label>
            <span>Où se situe le nettoyage ?</span>
            <select
              value={zoneIntervention}
              onChange={(e) => {
                setZoneIntervention(e.target.value);
              }}
              onBlur={persistPartial}
            >
              <option value="">— Choisir —</option>
              {SWISS_CANTONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">
            {isParticulier ? "Adresse du logement" : "Adresse d’intervention"}
          </h3>
          <label className="service-textarea-label">
            <span>
              {isParticulier
                ? "Adresse complète du logement à nettoyer"
                : "Adresse complète des locaux à nettoyer"}
            </span>
            <textarea
              className="service-textarea"
              rows={3}
              value={adresse}
              onChange={(e) => {
                setAdresse(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder={
                isParticulier
                  ? "Rue et numéro, code postal, ville (étage, digicode, parking si utile…)"
                  : "Rue et numéro, code postal, ville (et complément d’accès si utile : étage, digicode…)"
              }
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
              placeholder={isParticulier ? "Ex. : 65, 95 ou 120,5" : "Ex. : 250 ou 120,5"}
            />
          </label>
        </div>

        {isParticulier ? (
          <>
            <div className="form-section">
              <h3 className="form-section-title">Type de logement</h3>
              <p className="hint">Appartement, maison, location Airbnb ou autre.</p>
              <div className="type-lieu-list">
                {PARTICULIER_LOGEMENT_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`type-lieu-row ${typeLogement === opt.id ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="typeLogement"
                      value={opt.id}
                      checked={typeLogement === opt.id}
                      onChange={() => {
                        setTypeLogement(opt.id);
                      }}
                    />
                    <span className="type-lieu-body">
                      <span className="type-lieu-label">{opt.label}</span>
                      <span className="type-lieu-desc">{opt.desc}</span>
                    </span>
                  </label>
                ))}
              </div>
              {typeLogement === "autre" ? (
                <label className="type-lieu-autre">
                  <span>Précisez le type de logement</span>
                  <input
                    type="text"
                    value={typeLogementAutre}
                    onChange={(e) => {
                      setTypeLogementAutre(e.target.value);
                    }}
                    onBlur={persistPartial}
                    placeholder="Ex. : studio meublé, résidence secondaire…"
                  />
                </label>
              ) : null}
            </div>

            <div className="form-section">
              <h3 className="form-section-title">Nombre de pièces (optionnel)</h3>
              <label>
                <span>Pièces principales (hors cuisine / SdB si vous préférez)</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={nbPieces}
                  onChange={(e) => {
                    setNbPieces(e.target.value);
                  }}
                  onBlur={persistPartial}
                  placeholder="Ex. : 3 ou 4,5"
                />
              </label>
            </div>
          </>
        ) : (
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
        )}

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
          <h3 className="form-section-title">Produits de nettoyage</h3>
          <p className="hint">
            Si vous avez déjà les produits sur place, le devis est au <strong>tarif réduit</strong>.
            Sinon, UniFresh les fournit : <strong>tarif normal</strong>.
          </p>
          <div className="intensite-grid produits-grid">
            {PRODUITS_NETTOYAGE_OPTIONS.map((opt) => (
              <label
                key={opt.id}
                className={`intensite-option produits-option ${produitsNettoyage === opt.id ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="produitsNettoyage"
                  value={opt.id}
                  checked={produitsNettoyage === opt.id}
                  onChange={() => {
                    setProduitsNettoyage(opt.id);
                  }}
                  onBlur={persistPartial}
                />
                <span className="intensite-option-title">{opt.label}</span>
                <span className="intensite-option-desc">{opt.desc}</span>
                <span className={`produits-tarif-badge ${opt.tarif}`}>{opt.tarifLabel}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">
            {isParticulier ? "Ce que vous souhaitez faire nettoyer" : "Ce que nous devons laver"}
          </h3>
          <label className="service-textarea-label">
            <span>{isParticulier ? "Détail des pièces et tâches" : "Détail des zones et tâches"}</span>
            <textarea
              className="service-textarea"
              rows={6}
              value={detailsLavage}
              onChange={(e) => {
                setDetailsLavage(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder={
                isParticulier
                  ? "Ex. : salon et chambres (sols et dépoussiérage), cuisine (plans, hotte), 2 salles de bain, vitres salon, changement draps si Airbnb…"
                  : "Ex. : sols des open spaces et couloirs, vitres intérieures des bureaux, 4 sanitaires avec cabines, cuisine collective (plans de travail, frigo extérieur), poubelles des open spaces…"
              }
            />
          </label>
        </div>

        <div className="form-section">
          <h3 className="form-section-title">Informations complémentaires (optionnel)</h3>
          <label className="service-textarea-label">
            <span>
              {isParticulier
                ? "Animaux, clés, Airbnb (check-out), produits sur place…"
                : "Fréquence souhaitée, contraintes d’accès, matériel sur place…"}
            </span>
            <textarea
              className="service-textarea"
              rows={3}
              value={notesComplementaires}
              onChange={(e) => {
                setNotesComplementaires(e.target.value);
              }}
              onBlur={persistPartial}
              placeholder={
                isParticulier
                  ? "Ex. : logement Airbnb — ménage entre 11 h et 15 h ; chat sur place ; aspirateur fourni…"
                  : "Ex. : intervention possible uniquement après 19 h ; badge obligatoire à l’accueil…"
              }
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
  const [isAllowed, setIsAllowed] = useState(() => isAdminTokenValid());
  const [authError, setAuthError] = useState("");
  const [activeProfileTab, setActiveProfileTab] = useState("etudiant");
  const [adminFeedTab, setAdminFeedTab] = useState(/** @type {"all"|"inscription"|"service"} */ ("all"));
  const [demandes, setDemandes] = useState(() => loadDemandes().slice().reverse());
  const [adminLoadError, setAdminLoadError] = useState("");

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await fetchAdminDemandes(getAdminAuthHeaders());
        if (cancelled) return;
        replaceDemandesCache(list);
        setDemandes(list);
        setAdminLoadError("");
      } catch (err) {
        if (cancelled) return;
        setAdminLoadError(err instanceof Error ? err.message : "Chargement impossible.");
        setDemandes(loadDemandes().slice().reverse());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAllowed, demandesVersion]);
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
  const allDemandesByDay = useMemo(() => groupByDay(demandes), [demandes, groupByDay]);
  const currentServiceByDay = useMemo(() => groupByDay(currentServiceDemandes), [currentServiceDemandes, groupByDay]);
  const unseenCount = useMemo(() => demandes.filter((d) => !isDemandeSeen(d)).length, [demandes]);
  const serviceCountByProfile = useMemo(
    () => ({
      etudiant: demandes.filter((d) => d.profilType === "etudiant" && d.kind === "demande_service").length,
      entreprise: demandes.filter((d) => d.profilType === "entreprise" && d.kind === "demande_service").length,
      particulier: demandes.filter((d) => d.profilType === "particulier" && d.kind === "demande_service").length,
    }),
    [demandes]
  );
  const totalServiceDemandes = useMemo(
    () => demandes.filter((d) => d.kind === "demande_service").length,
    [demandes]
  );
  const canPersistSeen = useCallback((d) => !String(d.id || "").startsWith("fallback_"), []);

  async function toggleDemandeSeen(demandeId, seen) {
    if (String(demandeId).startsWith("fallback_")) return;
    try {
      await patchDemandeSeen(getAdminAuthHeaders(), demandeId, seen);
      setDemandeSeen(demandeId, seen);
      setDemandes((prev) =>
        prev.map((d) =>
          d.id === demandeId ? { ...d, adminSeenAt: seen ? new Date().toISOString() : null } : d
        )
      );
      onDemandesChange?.();
    } catch {
      if (setDemandeSeen(demandeId, seen)) {
        setDemandes(loadDemandes().slice().reverse());
        onDemandesChange?.();
      }
    }
  }

  async function markAllSeen() {
    try {
      await markAllDemandesSeenOnServer(getAdminAuthHeaders());
      markAllDemandesSeen();
      const list = await fetchAdminDemandes(getAdminAuthHeaders());
      replaceDemandesCache(list);
      setDemandes(list);
      onDemandesChange?.();
    } catch {
      if (markAllDemandesSeen() > 0) {
        setDemandes(loadDemandes().slice().reverse());
        onDemandesChange?.();
      }
    }
  }

  function profileTabLabel(profileKey, label) {
    const total = serviceCountByProfile[profileKey];
    return `${label} (${total})`;
  }

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

  useEffect(() => {
    if (!isAllowed) return;
    let cancelled = false;
    const refresh = async () => {
      try {
        const list = await fetchAdminDemandes(getAdminAuthHeaders());
        if (cancelled) return;
        replaceDemandesCache(list);
        setDemandes(list);
        setAdminLoadError("");
      } catch {
        /* garde la liste locale */
      }
    };
    const timer = setInterval(refresh, 30000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isAllowed, demandesVersion]);

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
  function logoutAdmin() {
    clearAdminToken();
    setIsAllowed(false);
    setAuthError("");
  }

  const adminShellClass = ["shell", "landing", shellAppearance].filter(Boolean).join(" ");

  if (!isAllowed) {
    return (
      <div className={adminShellClass}>
        <div className="landing-settings-row">
          <GlobalSettingsMenu
            appearance={appearance}
            onUpdateAppearance={onUpdateAppearance}
            onOpenAdminPanel={() => {
              if (isAdminTokenValid()) onClose();
            }}
          />
        </div>
        <section className="card form-card">
          <h2>Accès restreint</h2>
          <p className="hint">
            Utilisez <strong>Réglages → Administration</strong> pour demander l&apos;accès et saisir le code
            reçu par e-mail après validation.
          </p>
          <button type="button" className="btn ghost" onClick={onClose}>
            Retour
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className={adminShellClass}>
        <div className="landing-settings-row">
          <GlobalSettingsMenu
            appearance={appearance}
            onUpdateAppearance={onUpdateAppearance}
            onOpenAdminPanel={() => {}}
          />
        </div>
        <section className="card form-card admin-service-card">
        <header className="admin-header">
          <div className="admin-header-row">
            <button type="button" className="btn ghost btn-sm admin-logout-btn" onClick={logoutAdmin}>
              Quitter la session
            </button>
            {unseenCount > 0 ? (
              <span className="admin-unseen-pill">{unseenCount} nouvelle{unseenCount > 1 ? "s" : ""}</span>
            ) : null}
          </div>
          <h2 id="admin-panel-title">Inscriptions et demandes</h2>
          <p className="admin-summary" aria-live="polite">
            {demandes.length === 0
              ? "Chaque inscription et chaque formulaire envoyé apparaîtra ici automatiquement."
              : `${allInscriptions.length} inscription${allInscriptions.length !== 1 ? "s" : ""} · ${totalServiceDemandes} demande${totalServiceDemandes !== 1 ? "s" : ""} de service`}
            {unseenCount > 0 ? ` · ${unseenCount} à traiter` : ""}
          </p>
        </header>

        {adminLoadError ? (
          <p className="alert" role="alert">
            {adminLoadError}
          </p>
        ) : null}

        <div className="admin-toolbar">
          {unseenCount > 0 ? (
            <button type="button" className="btn ghost btn-sm" onClick={markAllSeen}>
              Tout marquer comme traité
            </button>
          ) : null}
          <button type="button" className="btn ghost btn-sm admin-toolbar-close" onClick={onClose}>
            Fermer l&apos;admin
          </button>
        </div>

        <div className="slot-mode-tabs admin-feed-tabs" role="tablist" aria-label="Type d'activité">
          <button
            type="button"
            role="tab"
            aria-selected={adminFeedTab === "all"}
            className={`slot-mode-tab ${adminFeedTab === "all" ? "active" : ""}`}
            onClick={() => setAdminFeedTab("all")}
          >
            Tout ({demandes.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminFeedTab === "inscription"}
            className={`slot-mode-tab ${adminFeedTab === "inscription" ? "active" : ""}`}
            onClick={() => setAdminFeedTab("inscription")}
          >
            Inscriptions ({allInscriptions.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={adminFeedTab === "service"}
            className={`slot-mode-tab ${adminFeedTab === "service" ? "active" : ""}`}
            onClick={() => setAdminFeedTab("service")}
          >
            Formulaires ({totalServiceDemandes})
          </button>
        </div>

        {demandes.length === 0 ? (
          <div className="admin-empty-state" role="status">
            <p className="admin-empty-title">Rien pour le moment</p>
            <p className="admin-empty-hint">
              Dès qu&apos;un visiteur s&apos;inscrit ou envoie une demande de nettoyage, le détail s&apos;affiche
              ici (rafraîchissement automatique toutes les 30 secondes).
            </p>
          </div>
        ) : null}

        {demandes.length > 0 && adminFeedTab === "all" ? (
          <section className="admin-group admin-group-primary">
            {renderDemandesByDay(allDemandesByDay, "all")}
          </section>
        ) : null}

        {demandes.length > 0 && adminFeedTab === "inscription" ? (
          <section className="admin-group admin-group-primary">
            {allInscriptions.length === 0 ? (
              <p className="hint">Aucune inscription pour le moment.</p>
            ) : (
              renderDemandesByDay(allInscriptionsByDay, "insc")
            )}
          </section>
        ) : null}

        {demandes.length > 0 && adminFeedTab === "service" ? (
          <>
            <div className="slot-mode-tabs admin-profile-tabs" role="tablist" aria-label="Profil">
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
              <p className="hint">Aucun formulaire de service pour ce profil.</p>
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
            {d.payload.zoneInterventionLabel || d.payload.zoneIntervention ? (
              <p className="admin-line">
                <strong>Zone:</strong>{" "}
                {String(d.payload.zoneInterventionLabel || d.payload.zoneIntervention)}
              </p>
            ) : null}
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
            {formatProduitsNettoyageAdmin(d.payload) ? (
              <p className="admin-line">
                <strong>Produits:</strong> {formatProduitsNettoyageAdmin(d.payload)}
              </p>
            ) : null}
            {formatParticulierLogement(d.payload) ? (
              <>
                <p className="admin-line">
                  <strong>Logement:</strong> {formatParticulierLogement(d.payload)}
                </p>
                {d.payload.nbPieces ? (
                  <p className="admin-line">
                    <strong>Pièces:</strong> {String(d.payload.nbPieces)}
                  </p>
                ) : null}
              </>
            ) : (
              <p className="admin-line">
                <strong>Type de lieu:</strong> {String(d.payload.typeLieu || "-")}
              </p>
            )}
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
              À traiter
            </button>
          ) : (
            <button type="button" className="btn ghost" onClick={() => onToggleSeen(d.id, true)}>
              Marquer traité
            </button>
          )}
        </div>
      ) : null}
    </article>
  );
}

function GlobalSettingsMenu({
  appearance,
  onUpdateAppearance,
  account,
  onSaveAccount,
  onDeleteAccount,
  onOpenAdminPanel,
}) {
  const [open, setOpen] = useState(false);
  const [accountDraft, setAccountDraft] = useState(null);
  const [accountError, setAccountError] = useState("");
  const [accountInfo, setAccountInfo] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [adminSession, setAdminSession] = useState(() => isAdminTokenValid());
  const [adminAccessCode, setAdminAccessCode] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [adminErr, setAdminErr] = useState("");
  const [adminRequesting, setAdminRequesting] = useState(false);
  const [adminVerifying, setAdminVerifying] = useState(false);
  const [adminRequestId, setAdminRequestId] = useState("");
  const [adminRequestStatus, setAdminRequestStatus] = useState(
    /** @type {"none" | "pending" | "approved" | "rejected"} */ ("none")
  );
  const [adminCanEnterCode, setAdminCanEnterCode] = useState(false);

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

  useEffect(() => {
    if (!open) return;
    setAdminSession(isAdminTokenValid());
    const storedId = loadAdminRequestId();
    if (storedId) {
      setAdminRequestId(storedId);
      refreshAdminRequestStatus(storedId);
    } else {
      setAdminRequestId("");
      setAdminRequestStatus("none");
      setAdminCanEnterCode(false);
    }
  }, [open]);

  async function refreshAdminRequestStatus(requestId) {
    if (!requestId) return;
    try {
      const data = await fetchAdminRequestStatus(requestId);
      const status = data.status === "approved" || data.status === "rejected" || data.status === "pending"
        ? data.status
        : "pending";
      setAdminRequestStatus(status);
      setAdminCanEnterCode(Boolean(data.canEnterCode));
      if (status === "approved" && data.canEnterCode) {
        setAdminMsg("Demande acceptée. Saisissez le code reçu à unifreshbynk@gmail.com.");
      } else if (status === "pending") {
        setAdminMsg("Demande en attente — acceptez ou refusez depuis l’e-mail envoyé à unifreshbynk@gmail.com.");
      } else if (status === "rejected") {
        setAdminMsg("Demande refusée. Vous pouvez envoyer une nouvelle demande.");
        clearAdminRequestId();
        setAdminRequestId("");
      }
    } catch {
      clearAdminRequestId();
      setAdminRequestId("");
      setAdminRequestStatus("none");
      setAdminCanEnterCode(false);
    }
  }

  useEffect(() => {
    if (!open || adminSession || adminRequestStatus !== "pending" || !adminRequestId) return;
    const interval = setInterval(() => {
      refreshAdminRequestStatus(adminRequestId);
    }, 4000);
    return () => clearInterval(interval);
  }, [open, adminSession, adminRequestStatus, adminRequestId]);

  async function handleRequestAdminAccess() {
    setAdminErr("");
    setAdminMsg("");
    setAdminRequesting(true);
    try {
      const data = await requestAdminAccess({
        email: account?.email || "",
        prenom: account?.prenom || "",
        nom: account?.nom || "",
        profilType: account?.profilType || "visiteur",
      });
      if (data.requestId) {
        saveAdminRequestId(data.requestId);
        setAdminRequestId(data.requestId);
        setAdminRequestStatus("pending");
        setAdminCanEnterCode(false);
      }
      setAdminMsg(
        "Demande envoyée. Consultez unifreshbynk@gmail.com pour accepter ou refuser. Le champ code apparaîtra après acceptation."
      );
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setAdminRequesting(false);
    }
  }

  async function handleVerifyAdminAccess(e) {
    e.preventDefault();
    const code = adminAccessCode.trim();
    if (!code) {
      setAdminErr("Saisissez le code reçu par e-mail.");
      return;
    }
    setAdminErr("");
    setAdminMsg("");
    setAdminVerifying(true);
    try {
      const ok = await verifyAdminAccessCode(code);
      if (ok) {
        setAdminSession(true);
        setAdminAccessCode("");
        clearAdminRequestId();
        setAdminRequestId("");
        setAdminRequestStatus("none");
        setAdminCanEnterCode(false);
        setAdminMsg("Accès autorisé. Vous pouvez ouvrir le tableau de bord.");
      } else {
        setAdminErr("Code invalide ou expiré.");
      }
    } catch (err) {
      setAdminErr(err instanceof Error ? err.message : "Vérification impossible.");
    } finally {
      setAdminVerifying(false);
    }
  }

  function handleEndAdminSession() {
    clearAdminToken();
    setAdminSession(false);
    setAdminMsg("");
    setAdminAccessCode("");
  }

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
                <span>{account.profilType === "entreprise" ? "Nom de l’entreprise" : "Nom"}</span>
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
            </form>
          ) : null}

          <div className="settings-section-divider settings-admin-zone">
            <h3 className="settings-admin-title">Administration</h3>
            <p className="hint">Accès réservé — demande validée par e-mail.</p>
            {adminErr ? (
              <div className="alert" role="alert">
                {adminErr}
              </div>
            ) : null}
            {adminMsg ? (
              <div className="success-banner" role="status">
                {adminMsg}
              </div>
            ) : null}
            {adminSession ? (
              <div className="settings-admin-actions">
                <button
                  type="button"
                  className="btn ghost"
                  onClick={() => {
                    setOpen(false);
                    onOpenAdminPanel?.();
                  }}
                >
                  Ouvrir le tableau de bord
                </button>
                <button type="button" className="btn ghost" onClick={handleEndAdminSession}>
                  Quitter l&apos;accès
                </button>
              </div>
            ) : (
              <div className="settings-admin-form">
                {adminRequestStatus === "none" || adminRequestStatus === "rejected" ? (
                  <button
                    type="button"
                    className="btn ghost"
                    disabled={adminRequesting}
                    onClick={handleRequestAdminAccess}
                  >
                    {adminRequesting ? "Envoi…" : "Demander l'accès"}
                  </button>
                ) : null}
                {adminRequestStatus === "pending" ? (
                  <p className="hint settings-admin-waiting">
                    En attente de votre validation par e-mail… Cette page se met à jour automatiquement
                    après acceptation.
                  </p>
                ) : null}
                {adminRequestStatus === "approved" && !adminCanEnterCode ? (
                  <p className="hint">
                    Demande acceptée. Si le code a expiré (15 min), envoyez une nouvelle demande.
                  </p>
                ) : null}
                {adminCanEnterCode ? (
                  <form onSubmit={handleVerifyAdminAccess} noValidate>
                    <label>
                      <span>Code reçu par e-mail (après acceptation)</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={adminAccessCode}
                        onChange={(e) => setAdminAccessCode(e.target.value)}
                        placeholder="Ex. : 123456"
                      />
                    </label>
                    <button type="submit" className="btn primary" disabled={adminVerifying}>
                      {adminVerifying ? "Vérification…" : "Valider le code"}
                    </button>
                  </form>
                ) : null}
              </div>
            )}
          </div>

          {account ? (
            <div className="settings-section-divider settings-delete-zone">
              <h3>Supprimer le compte</h3>
              <p className="hint">
                Supprime définitivement votre profil et vos demandes enregistrées sur cet appareil. Action
                irréversible.
              </p>
              {!showDeleteConfirm ? (
                <button type="button" className="btn ghost settings-danger-btn" onClick={() => setShowDeleteConfirm(true)}>
                  Supprimer mon compte
                </button>
              ) : (
                <div className="settings-danger-box" role="alert">
                  <p>Êtes-vous sûr de vouloir supprimer votre compte ?</p>
                  <div className="settings-danger-actions">
                    <button type="button" className="btn ghost" onClick={() => setShowDeleteConfirm(false)}>
                      Annuler
                    </button>
                    <button type="button" className="btn primary settings-danger-btn" onClick={confirmDeleteAccount}>
                      Oui, supprimer mon compte
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function RegistrationForm({
  onRegistered,
  onLogin,
  onOpenAdminPanel,
  appearance,
  onUpdateAppearance,
  shellAppearance,
  serviceArea = "",
  legalPage,
  onOpenLegal,
  onCloseLegal,
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
  const [emailAlreadyUsed, setEmailAlreadyUsed] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);

  function goToLoginSection() {
    const reducedMotion = shellAppearance.includes("reduced-motion");
    scrollToLandingSection("landing-connexion", reducedMotion);
    setLoginEmail(email.trim().toLowerCase());
    setEmailAlreadyUsed(false);
    setError("");
  }

  async function blockIfEmailAlreadyUsed(em) {
    const clean = em.trim().toLowerCase();
    const localUsed = isEmailRegisteredLocally(clean);
    let serverUsed = false;
    try {
      serverUsed = await checkEmailOnServer(clean);
    } catch {
      /* serveur hors ligne : local seulement */
    }
    if (!localUsed && !serverUsed) {
      setEmailAlreadyUsed(false);
      return false;
    }
    setEmailAlreadyUsed(true);
    setError("");
    setReviewRegistration(null);
    return true;
  }

  async function sendRegistrationCode(registrationPayload) {
    if (await blockIfEmailAlreadyUsed(registrationPayload.email)) return;
    setError("");
    setConfirmError("");
    setConfirmInfo("");
    setIsSubmitting(true);
    try {
      const payload = {
        ...registrationPayload,
        email: String(registrationPayload.email || "").trim().toLowerCase(),
      };
      await sendRegisterCode(payload);
      setPendingRegistration(payload);
      setConfirmationCode("");
      setConfirmInfo("Un code de confirmation a été envoyé à votre e-mail.");
      setReviewRegistration(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("déjà inscrit") || msg.includes("deja inscrit")) {
        setEmailAlreadyUsed(true);
        setError("");
        return;
      }
      setError(
        msg || "Serveur e-mail indisponible. Lancez `npm run server` puis réessayez."
      );
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
    setLoginError("");
    setLoginInfo("");
    setIsLoginSubmitting(true);
    try {
      const localUser = normalizeUser(loadUser());
      const hasLocalAccount =
        Boolean(localUser) && String(localUser.email || "").trim().toLowerCase() === em;
      await sendLoginCode(em, hasLocalAccount);
      setPendingLoginEmail(em);
      setLoginCode("");
      setLoginInfo("Un code de connexion a été envoyé à votre e-mail.");
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Serveur e-mail indisponible. Lancez `npm run server` puis réessayez.";
      setLoginError(msg);
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

    setLoginError("");
    setLoginInfo("");
    setIsLoginSubmitting(true);
    try {
      const localProfile = normalizeUser(loadUser());
      const profileForServer =
        localProfile && String(localProfile.email || "").trim().toLowerCase() === em
          ? localProfile
          : null;
      const data = await loginComplete(em, code, profileForServer);
      const profile = normalizeUser(data.user);
      if (!profile) {
        setLoginError("Compte introuvable.");
        return;
      }
      saveUser(profile);
      setLoginCode("");
      setPendingLoginEmail("");
      onLogin(profile);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Impossible de vérifier le code pour le moment.";
      setLoginError(msg);
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
    if (!acceptPrivacy) {
      setError("Vous devez accepter la politique de confidentialité.");
      return;
    }
    if (await blockIfEmailAlreadyUsed(em)) {
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
    setConfirmInfo("");
    setIsSubmitting(true);
    try {
      const data = await registerComplete(pendingRegistration, code);
      onRegistered(normalizeUser(data.user) || pendingRegistration);
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : "Impossible de vérifier le code pour le moment.";
      setConfirmError(msg);
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
          <GlobalSettingsMenu
            appearance={appearance}
            onUpdateAppearance={onUpdateAppearance}
            onOpenAdminPanel={onOpenAdminPanel}
          />
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
        {serviceArea ? <p className="hint">Zone d&apos;intervention : {serviceArea}</p> : null}
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
            {emailAlreadyUsed ? (
              <div className="alert alert-email-used" role="alert">
                <p>
                  <strong>E-mail déjà utilisé.</strong> Un compte existe déjà avec cette adresse sur cet
                  appareil. Connectez-vous pour y accéder.
                </p>
                <button type="button" className="btn primary" onClick={goToLoginSection}>
                  Connectez-vous
                </button>
              </div>
            ) : null}
            {error && !emailAlreadyUsed ? (
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
                  <span className="profil-option-desc">Maison, appartement ou Airbnb</span>
                </label>
              </div>
            </fieldset>

            <label>
              <span>E-mail</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailAlreadyUsed) setEmailAlreadyUsed(false);
                }}
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
                {profilType === "entreprise" ? "Nom de l’entreprise" : "Nom"}
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
            <label className="consent-row">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
              />
              <span>
                J&apos;accepte la{" "}
                <button type="button" className="link-btn" onClick={() => onOpenLegal("privacy")}>
                  politique de confidentialité
                </button>{" "}
                et les{" "}
                <button type="button" className="link-btn" onClick={() => onOpenLegal("mentions")}>
                  mentions légales
                </button>
                .
              </span>
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
          </div>
        </section>
      </div>

      <SiteFooter onOpen={onOpenLegal} />
      <LegalModal open={Boolean(legalPage)} page={legalPage} onClose={onCloseLegal} />
      <AiAdvisorWidget />
    </div>
  );
}
