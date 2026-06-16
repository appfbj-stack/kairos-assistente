import express from "express";
import cors from "cors";
import { getDb } from "./database/database.js";
import { runMigrations } from "./database/migrations.js";
import chatRouter from "./chat/chat.js";
import agendaRouter from "./agenda/agenda.js";
import memoryRouter from "./memory/memory.js";
import settingsRouter from "./settings/settings.js";
import { createBackup } from "./database/backup.js";
import { startBot } from "./telegram/bot.js";
import adminRouter from "./admin/admin.js";
import licenseRouter from "./admin/license.js";
import backupRouter from "./admin/backup.js";
import vpsRouter from "./vps/vps.js";

const app = express();
const PORT = Number(process.env.PORT) || 3010;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

app.use("/api/chat", chatRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/license", licenseRouter);
app.use("/api/backup", backupRouter);
app.use("/api/vps", vpsRouter);

app.get("/api/health", async (_req: any, res: any) => {
  await getDb();
  res.json({ status: "ok", version: "2.0.0", name: "Kairos Admin" });
});

app.get("/api", (_req: any, res: any) => {
  res.json({ status: "ok", name: "Kairos Admin API", version: "2.0.0" });
});

app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

async function start() {
  let retries = 10;
  while (retries > 0) {
    try {
      await getDb();
      console.log("✅ PostgreSQL conectado");
      break;
    } catch (err: any) {
      retries--;
      console.log(`⏳ Aguardando PostgreSQL... (${retries} tentativas restantes)`);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  await runMigrations();
  console.log("✅ Migrações aplicadas");

  // Backup automático a cada 6 horas
  createBackup().catch(() => {});
  setInterval(() => createBackup().catch(() => {}), 6 * 60 * 60 * 1000);

  startBot();

  app.listen(PORT, () => {
    console.log(`🚀 Kairos Admin 2.0 rodando em http://localhost:${PORT}`);
  });
}

start();
