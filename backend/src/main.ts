import express from "express";
import cors from "cors";
import chatRouter from "./chat/chat.js";
import agendaRouter from "./agenda/agenda.js";
import memoryRouter from "./memory/memory.js";
import settingsRouter from "./settings/settings.js";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors({ origin: "*" }));
app.use(express.json());

app.use("/api/chat", chatRouter);
app.use("/api/agenda", agendaRouter);
app.use("/api/memory", memoryRouter);
app.use("/api/settings", settingsRouter);

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", version: "1.0.0", name: "Kairos Core" });
});

app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

app.listen(PORT, () => {
  console.log(`Kairos Core API rodando em http://localhost:${PORT}`);
});

export default app;
