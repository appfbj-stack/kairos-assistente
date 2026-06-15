import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { saveDb, getDb } from "./database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");

const MAX_BACKUPS = 30;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export async function createBackup(): Promise<string> {
  await getDb();
  ensureDir(BACKUP_DIR);

  const now = new Date();
  const filename = `kairos-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.db`;
  const backupPath = path.join(BACKUP_DIR, filename);

  saveDb();

  const dbPath = path.join(DATA_DIR, "kairos.db");
  if (fs.existsSync(dbPath)) {
    fs.copyFileSync(dbPath, backupPath);

    // Compactar
    const stats = fs.statSync(backupPath);
    console.log(`Backup criado: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

    // Limpar backups antigos
    cleanupOldBackups();

    return filename;
  }
  throw new Error("Banco de dados não encontrado");
}

function cleanupOldBackups() {
  const files = fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("kairos-backup-"))
    .sort()
    .reverse();

  if (files.length > MAX_BACKUPS) {
    for (const f of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    }
    console.log(`Backups antigos limpos: ${files.length - MAX_BACKUPS} removidos`);
  }
}

export function listBackups(): { name: string; size: number; date: Date }[] {
  ensureDir(BACKUP_DIR);
  return fs.readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("kairos-backup-"))
    .map((f) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stats.size, date: stats.mtime };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function restoreBackup(filename: string): boolean {
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) return false;

  const dbPath = path.join(DATA_DIR, "kairos.db");

  // Fechar conexão atual copiando primeiro
  const tempPath = path.join(DATA_DIR, "kairos.db.restore");
  fs.copyFileSync(backupPath, tempPath);
  fs.copyFileSync(tempPath, dbPath);
  fs.unlinkSync(tempPath);

  console.log(`Backup restaurado: ${filename}`);

  // Recarregar banco
  const { getDb: reloadDb } = require("./database.js");

  return true;
}
