import express from "express";
import cors from "cors";
import { getDb } from "./database/database.js";
import { runMigrations } from "./database/migrations.js";
import { bootstrapSuperAdmin } from "./core/bootstrap.js";
import { rateLimit } from "./core/rateLimit.js";

import usersRouter from "./users/users.js";
import empresasRouter from "./empresas/empresas.js";
import funcionariosRouter from "./funcionarios/funcionarios.js";
import escalasRouter from "./escalas/escalas.js";
import registrosRouter from "./ponto/registros.js";
import solicitacoesRouter from "./solicitacoes/solicitacoes.js";
import bancoHorasRouter from "./bancohoras/bancohoras.js";
import relatoriosRouter from "./relatorios/relatorios.js";
import dashboardRouter from "./dashboard/dashboard.js";
import iaRouter from "./ia/ia.js";
import notificacoesRouter from "./notificacoes/notificacoes.js";
import auditoriaRouter from "./auditoria/auditoria.js";
import feriadosRouter from "./feriados/feriados.js";
import licenseRouter from "./core/license.js";

const app = express();
const PORT = Number(process.env.PORT) || 8040;

app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "20mb" })); // selfies em base64

// Rate limit global moderado (PRD seção 19).
app.use("/api", rateLimit({ windowMs: 60_000, max: 300, keyPrefix: "global" }));

app.use("/api/users", usersRouter); // login em /api/users/auth/login, perfil em /api/users/me
app.use("/api/empresas", empresasRouter);
app.use("/api/funcionarios", funcionariosRouter);
app.use("/api/escalas", escalasRouter);
app.use("/api/ponto/registros", registrosRouter);
app.use("/api/solicitacoes", solicitacoesRouter);
app.use("/api/banco-horas", bancoHorasRouter);
app.use("/api/relatorios", relatoriosRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/ia", iaRouter);
app.use("/api/notificacoes", notificacoesRouter);
app.use("/api/auditoria", auditoriaRouter);
app.use("/api/feriados", feriadosRouter);
app.use("/api/license", licenseRouter);

app.get("/api/health", async (_req, res) => {
  await getDb();
  res.json({ status: "ok", name: "Kairos Ponto", version: "1.0.0" });
});

app.get("/api", (_req, res) => {
  res.json({ status: "ok", name: "Kairos Ponto API", version: "1.0.0" });
});

app.use((_req, res) => res.status(404).json({ error: "Rota não encontrada" }));

async function start() {
  try {
    await runMigrations();
    console.log("Migrations executadas com sucesso");
    await bootstrapSuperAdmin();
    console.log("Bootstrap do SUPER_ADMIN concluído");

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Kairos Ponto API rodando na porta ${PORT}`);
    });
  } catch (err) {
    console.error("Erro ao iniciar servidor:", err);
    process.exit(1);
  }
}

start();
