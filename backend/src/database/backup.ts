import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { queryAll } from "./database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "..", "data");
const BACKUP_DIR = path.join(DATA_DIR, "backups");
const MAX_BACKUPS = 30;

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const TABLES = [
  "conversations",
  "messages",
  "agenda_items",
  "memory_items",
  "settings",
  "clients",
  "apps",
  "licenses",
  "logs",
  "payments",
];

export async function createBackup(): Promise<string> {
  ensureDir(BACKUP_DIR);

  const now = new Date();
  const filename = `kairos-backup-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}.json`;
  const backupPath = path.join(BACKUP_DIR, filename);

  const backup: Record<string, any[]> = {};
  for (const table of TABLES) {
    try {
      backup[table] = await queryAll(`SELECT * FROM ${table}`);
    } catch {
      backup[table] = [];
    }
  }

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  const stats = fs.statSync(backupPath);
  console.log(`Backup criado: ${filename} (${(stats.size / 1024).toFixed(1)} KB)`);

  cleanupOldBackups();
  return filename;
}

function cleanupOldBackups() {
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("kairos-backup-"))
    .sort()
    .reverse();

  if (files.length > MAX_BACKUPS) {
    for (const f of files.slice(MAX_BACKUPS)) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
    }
  }
}

export function listBackups(): { name: string; size: number; date: Date }[] {
  ensureDir(BACKUP_DIR);
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith("kairos-backup-"))
    .map((f) => {
      const stats = fs.statSync(path.join(BACKUP_DIR, f));
      return { name: f, size: stats.size, date: stats.mtime };
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function restoreBackup(_filename: string): boolean {
  // PostgreSQL restore via JSON would require re-inserting rows
  // Handled manually or via pg_restore
  return false;
}

export function saveDb(): void {}
