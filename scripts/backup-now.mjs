import path from "path";
import { fileURLToPath } from "url";
import { runBackup } from "../server/backup.js";
import { DB_FILE, DATA_DIR } from "../server/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backupDir = path.join(DATA_DIR, "backups");

const dest = runBackup(DB_FILE, backupDir);
console.log(dest ? `Sauvegarde : ${dest}` : "Aucune base à sauvegarder.");
