import { useEffect } from "react";
import { LEGAL_MENTIONS, LEGAL_PRIVACY } from "./legalContent.js";

/**
 * @param {{ open: boolean, page: "mentions" | "privacy" | null, onClose: () => void }} props
 */
export function LegalModal({ open, page, onClose }) {
  const doc = page === "privacy" ? LEGAL_PRIVACY : LEGAL_MENTIONS;

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !page) return null;

  return (
    <div className="legal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="legal-panel card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="legal-panel-head">
          <h2 id="legal-title">{doc.title}</h2>
          <button type="button" className="btn ghost" onClick={onClose} aria-label="Fermer">
            Fermer
          </button>
        </div>
        <div className="legal-panel-body">
          {doc.lastUpdated ? (
            <p className="legal-updated">Dernière mise à jour : {doc.lastUpdated}</p>
          ) : null}
          {doc.preamble
            ? doc.preamble.split(/\n\n+/).map((para, i) => (
                <p key={`pre-${i}`} className="legal-preamble">
                  {para.trim()}
                </p>
              ))
            : null}
          {doc.sections.map((s) => (
            <section key={s.heading} className="legal-section">
              <h3>{s.heading}</h3>
              {s.body.split(/\n\n+/).map((para, i) => (
                <p key={`${s.heading}-${i}`}>{para.trim()}</p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {{ onOpen: (page: "mentions" | "privacy") => void, serviceArea?: string }} props
 */
export function SiteFooter({ onOpen }) {
  return (
    <footer className="foot">
      <p>UniFresh · étudiants, entreprises & particuliers</p>
      <p>
        Site sécurisé · Contact :{" "}
        <a href="mailto:unifreshbynk@gmail.com">unifreshbynk@gmail.com</a>
      </p>
      <p className="legal-links">
        <button type="button" className="link-btn" onClick={() => onOpen("privacy")}>
          Confidentialité
        </button>
        <span aria-hidden="true"> · </span>
        <button type="button" className="link-btn" onClick={() => onOpen("mentions")}>
          Mentions légales
        </button>
      </p>
    </footer>
  );
}
