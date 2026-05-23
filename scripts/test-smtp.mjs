import "dotenv/config";
import nodemailer from "nodemailer";

const user = String(process.env.SMTP_USER || "").trim();
const pass = String(process.env.SMTP_PASS || "").trim().replace(/\s+/g, "");

if (!user || !pass) {
  console.error("Renseignez SMTP_USER et SMTP_PASS dans .env");
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user, pass },
});

console.log("Test SMTP pour:", user);
console.log("Longueur mot de passe:", pass.length, "(attendu: 16 pour Gmail)");

try {
  await transporter.verify();
  console.log("OK — Gmail accepte ces identifiants.");
} catch (err) {
  console.error("ÉCHEC —", err.message);
  console.error(
    "\n→ Créez un NOUVEAU mot de passe d'application pour",
    user,
    "sur https://myaccount.google.com/apppasswords\n→ Mettez-le dans SMTP_PASS puis relancez npm run server"
  );
  process.exit(1);
}
