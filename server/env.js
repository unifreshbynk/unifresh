/**
 * Validation de la configuration au démarrage (production).
 */
export function validateEnv() {
  const isProd = process.env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  const smtpUser = String(process.env.SMTP_USER || "").trim();
  const smtpPass = String(process.env.SMTP_PASS || "").trim();
  const smtpHost = String(process.env.SMTP_HOST || "").trim();

  if (!smtpHost || !smtpUser || !smtpPass) {
    errors.push("SMTP_HOST, SMTP_USER et SMTP_PASS sont obligatoires.");
  }
  if (smtpPass === "your-gmail-app-password" || smtpPass.length < 8) {
    warnings.push("SMTP_PASS semble être un placeholder — configurez un mot de passe d'application.");
  }

  const adminEmail = String(process.env.ADMIN_REVIEW_EMAIL || "").trim();
  if (!adminEmail) {
    warnings.push("ADMIN_REVIEW_EMAIL non défini — les notifications admin iront vers SMTP_USER.");
  }

  const appBase = String(process.env.APP_BASE_URL || "").trim().replace(/\/$/, "");
  if (isProd) {
    if (!appBase) {
      errors.push("APP_BASE_URL est obligatoire en production (ex. https://www.unifresh.ch).");
    } else if (!appBase.startsWith("https://")) {
      errors.push("APP_BASE_URL doit commencer par https:// en production.");
    } else if (/localhost|127\.0\.0\.1/i.test(appBase)) {
      errors.push("APP_BASE_URL ne doit pas pointer vers localhost en production.");
    }
  } else if (appBase && !appBase.startsWith("http")) {
    warnings.push("APP_BASE_URL devrait être une URL complète (https://…).");
  }

  if (isProd && !String(process.env.TRUST_PROXY || "").trim()) {
    warnings.push(
      "TRUST_PROXY=1 recommandé derrière Nginx/Caddy pour le rate limiting et les logs IP."
    );
  }

  return { isProd, errors, warnings };
}

export function assertEnvValid() {
  const { errors, warnings } = validateEnv();
  for (const w of warnings) console.warn(`[CONFIG] ${w}`);
  if (errors.length > 0) {
    console.error("[CONFIG] Configuration invalide :");
    for (const e of errors) console.error(`  - ${e}`);
    process.exit(1);
  }
}
