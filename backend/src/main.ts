import express from "express";
import cors from "cors";
import { getDb } from "./database/database.js";
import { runMigrations } from "./database/migrations.js";
import chatRouter from "./chat/chat.js";
import agendaRouter from "./agenda/agenda.js";
import memoryRouter from "./memory/memory.js";
import settingsRouter from "./settings/settings.js";
import adminRouter from "./admin/admin.js";
import licenseRouter from "./admin/license.js";

const app = express();
const PORT = Number(process.env.PORT) || 3010;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/chat", chatRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/admin", adminRouter);
app.use("/api/license", licenseRouter);

app.get("/api/health", async (_req: any, res: any) => {
  await getDb();
  res.json({ status: "ok", version: "1.0.0", name: "Kairos Core" });
});

app.get("/api", (_req: any, res: any) => {
  res.json({ status: "ok", name: "Kairos Core API", version: "1.0.0" });
});

app.use((_req: any, res: any) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

async function start() {
  await getDb();
  await runMigrations();
  app.listen(PORT, () => {
    console.log(`Kairos Core API rodando em http://localhost:${PORT}`);
  });
}

start();
