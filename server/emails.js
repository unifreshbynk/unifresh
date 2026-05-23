export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatDemandeText(d) {
  const lines = [
    `Type: ${d.kind === "inscription" ? "Inscription" : "Demande de service"}`,
    `Profil: ${d.profilType}`,
    `Client: ${[d.prenom, d.nom].filter(Boolean).join(" ")}`,
    `E-mail: ${d.email}`,
    `Téléphone: ${d.telephone}`,
    `Date: ${new Date(d.createdAt).toLocaleString("fr-FR")}`,
  ];
  const p = d.payload || {};
  if (p.adresse) lines.push(`Adresse: ${p.adresse}`);
  if (p.surfaceM2) lines.push(`Surface: ${p.surfaceM2} m²`);
  if (p.zoneIntervention) lines.push(`Zone: ${p.zoneIntervention}`);
  if (p.intensite) lines.push(`Intensité: ${p.intensite}`);
  if (p.typeLogementLabel || p.typeLogement) lines.push(`Logement: ${p.typeLogementLabel || p.typeLogement}`);
  if (p.typeLieu) lines.push(`Type de lieu: ${p.typeLieu}`);
  if (p.produitsNettoyageLabel) lines.push(`Produits: ${p.produitsNettoyageLabel} (${p.tarifLabel || p.tarifIndication})`);
  if (p.detailsLavage) lines.push(`Détails: ${p.detailsLavage}`);
  if (p.notesComplementaires) lines.push(`Notes: ${p.notesComplementaires}`);
  const slots = [
    ...(Array.isArray(p.selectedWeekTags) ? p.selectedWeekTags : []),
    ...(Array.isArray(p.selectedRecurringTags) ? p.selectedRecurringTags : []),
  ];
  if (slots.length) lines.push(`Créneaux: ${slots.join(", ")}`);
  return lines.join("\n");
}

export function formatDemandeHtml(d) {
  const p = d.payload || {};
  const slots = [
    ...(Array.isArray(p.selectedWeekTags) ? p.selectedWeekTags : []),
    ...(Array.isArray(p.selectedRecurringTags) ? p.selectedRecurringTags : []),
  ];
  return `
    <p><strong>${escapeHtml(d.kind === "inscription" ? "Nouvelle inscription" : "Nouvelle demande de service")}</strong></p>
    <ul>
      <li><strong>Profil :</strong> ${escapeHtml(d.profilType)}</li>
      <li><strong>Client :</strong> ${escapeHtml([d.prenom, d.nom].filter(Boolean).join(" "))}</li>
      <li><strong>E-mail :</strong> ${escapeHtml(d.email)}</li>
      <li><strong>Téléphone :</strong> ${escapeHtml(d.telephone)}</li>
      ${p.adresse ? `<li><strong>Adresse :</strong> ${escapeHtml(p.adresse)}</li>` : ""}
      ${p.surfaceM2 ? `<li><strong>Surface :</strong> ${escapeHtml(p.surfaceM2)} m²</li>` : ""}
      ${p.zoneIntervention ? `<li><strong>Zone :</strong> ${escapeHtml(p.zoneIntervention)}</li>` : ""}
      ${p.produitsNettoyageLabel ? `<li><strong>Produits :</strong> ${escapeHtml(p.produitsNettoyageLabel)} (${escapeHtml(p.tarifLabel || "")})</li>` : ""}
      ${p.detailsLavage ? `<li><strong>Détails :</strong> ${escapeHtml(p.detailsLavage)}</li>` : ""}
      ${slots.length ? `<li><strong>Créneaux :</strong> ${escapeHtml(slots.join(", "))}</li>` : ""}
    </ul>
  `;
}

export function clientServiceConfirmationHtml(prenom, payload) {
  const p = payload || {};
  return `
    <p>Bonjour${prenom ? ` ${escapeHtml(prenom)}` : ""},</p>
    <p>Nous avons bien reçu votre demande de nettoyage sur <strong>UniFresh</strong>.</p>
    <p>Notre équipe étudie votre demande et vous recontactera rapidement avec un <strong>devis personnalisé</strong> (les tarifs affichés sur le site sont indicatifs : réduit si vous fournissez les produits, normal sinon).</p>
    ${p.surfaceM2 ? `<p>Surface indiquée : <strong>${escapeHtml(p.surfaceM2)} m²</strong></p>` : ""}
    ${p.zoneIntervention ? `<p>Zone : <strong>${escapeHtml(p.zoneIntervention)}</strong></p>` : ""}
    <p>Merci pour votre confiance.</p>
    <p><strong>L'équipe UniFresh</strong></p>
  `;
}
