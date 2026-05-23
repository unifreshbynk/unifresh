import { useState, useEffect } from "react";

const STORAGE_KEY = "unifresh_cookie_consent_v1";

export default function CookieConsent({ onOpenPrivacy }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: new Date().toISOString() }));
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-live="polite">
      <div className="cookie-banner-inner">
        <p id="cookie-title">
          Nous utilisons des cookies techniques (session locale) pour faire fonctionner le site et
          mémoriser vos préférences. Aucun cookie publicitaire tiers.
        </p>
        <div className="cookie-banner-actions">
          {onOpenPrivacy ? (
            <button type="button" className="btn ghost" onClick={() => onOpenPrivacy("privacy")}>
              En savoir plus
            </button>
          ) : null}
          <button type="button" className="btn primary" onClick={accept}>
            J&apos;accepte
          </button>
        </div>
      </div>
    </div>
  );
}
