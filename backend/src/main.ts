import express from "express";
import cors from "cors";
import { getDb } from "./database/database.js";
import { runMigrations } from "./database/migrations.js";
import chatRouter from "./chat/chat.js";
import agendaRouter from "./agenda/agenda.js";
import memoryRouter from "./memory/memory.js";
import settingsRouter from "./settings/settings.js";
import { createBackup } from "./database/backup.js";
import adminRouter from "./admin/admin.js";
import licenseRouter from "./admin/license.js";
import backupRouter from "./admin/backup.js";
import coreRouter, { expireOverdueTrials, bootstrapSuperAdmin } from "./core/index.js";
import barberRouter from "./barber/index.js";

const app = express();
const PORT = Number(process.env.PORT) || 3010;

const BASIC_AUTH_USER = process.env.BASIC_AUTH_USER || "kairos";
const BASIC_AUTH_PASSWORD = process.env.BASIC_AUTH_PASSWORD || "kairos123";

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "50mb" }));

// Basic Auth para todas as rotas EXCETO /api/core e /api/barber (usam JWT
// proprio do Core, e /api/barber/public e' o link de agendamento sem login)
app.use((req: any, res: any, next: any) => {
    if (req.path.startsWith("/api/core")) return next();
    if (req.path.startsWith("/api/barber")) return next();
    if (req.path === "/api/health" || req.path === "/api") return next();

          const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Basic ")) {
          res.set("WWW-Authenticate", 'Basic realm="Kairos Admin"');
          return res.status(401).json({ error: "Autenticacao necessaria" });
    }

          const expected = "Basic " + Buffer.from(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`).toString("base64");
    if (req.headers.authorization === expected) {
          return next();
    }

          res.set("WWW-Authenticate", 'Basic realm="Kairos Admin"');
    return res.status(401).json({ error: "Autenticacao necessaria" });
});

app.use("/api/chat", chatRouter);
                                                  app.use("/api/agenda", agendaRouter);
app.use("/api/memory", memoryRouter);
            app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/license", licenseRouter);
app.use("/api/backup", backupRouter);
app.use("/api/core", coreRouter);
app.use("/api/barber", barberRouter);

app.get("/api/health", async (_req: any, res: any) => {
    await getDb();
    res.json({ status: "ok", version: "2.0.0", name: "Kairos Core" });
});

app.get("/api", (_req: any, res: any) => {
    res.json({ status: "ok", name: "Kairos Core API", version: "2.0.0" });
});

app.use((_req: any, res: any) => {
    res.status(404).json({ error: "Rota nao encontrada" });
});

async function start() {
    try {
          await runMigrations();
          console.log("Migrations executadas com sucesso");

      await bootstrapSuperAdmin();
          console.log("Bootstrap do SUPER_ADMIN concluido");

      app.listen(PORT, "0.0.0.0", () => {
              console.log(`Kairos Core API rodando na porta ${PORT}`);
      });

      // Backup automatico a cada 6 horas
      setInterval(async () => {
              try {
                        await createBackup();
                        console.log("Backup automatico criado");
              } catch (err) {
                        console.error("Erro no backup automatico:", err);
              }
      }, 6 * 60 * 60 * 1000);

      // Expirar trials vencidos a cada hora
      setInterval(async () => {
              try {
                        await expireOverdueTrials();
              } catch (err) {
                        console.error("Erro ao expirar trials:", err);
              }
      }, 60 * 60 * 1000);

    } catch (err) {
          console.error("Erro ao iniciar servidor:", err);
          process.exit(1);
    }
}

start();
