import fs from "fs";
import path from "path";

const MAX_BACKUPS = Number(process.env.BACKUP_KEEP_COUNT || 14);

/**
 * @param {string} dbFile
 * @param {string} backupDir
 */
export function runBackup(dbFile, backupDir) {
  if (!fs.existsSync(dbFile)) return null;
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = path.join(backupDir, `unifresh-${stamp}.db`);
  fs.copyFileSync(dbFile, dest);

  const files = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("unifresh-") && f.endsWith(".db"))
    .map((f) => ({ name: f, mtime: fs.statSync(path.join(backupDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);

  for (const old of files.slice(MAX_BACKUPS)) {
    try {
      fs.unlinkSync(path.join(backupDir, old.name));
    } catch {
      /* ignore */
    }
  }
  return dest;
}

/**
 * @param {string} dbFile
 * @param {string} backupDir
 * @param {number} intervalMs
 */
export function scheduleBackups(dbFile, backupDir, intervalMs = 6 * 60 * 60 * 1000) {
  const tick = () => {
    try {
      const dest = runBackup(dbFile, backupDir);
      if (dest) console.log(`[BACKUP] ${dest}`);
    } catch (err) {
      console.error("[BACKUP] Échec:", err instanceof Error ? err.message : err);
    }
  };
  tick();
  return setInterval(tick, intervalMs);
}
