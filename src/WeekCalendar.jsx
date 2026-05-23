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
