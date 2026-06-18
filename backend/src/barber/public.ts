import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { getAvailableSlots } from "./availability.js";
import { runBookingAssistant } from "./assistant.js";

const router = Router();

async function resolveEmpresa(slug: string) {
  return queryOne("SELECT id, name, slug FROM empresas WHERE slug = ? AND active = TRUE AND deleted_at IS NULL", [
    slug,
  ]);
}

// Página pública de agendamento: dados da empresa + serviços + profissionais ativos
router.get("/:slug", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Barbearia não encontrada" });

  const services = await queryAll(
    "SELECT id, name, duration_minutes, price FROM barber_services WHERE empresa_id = ? AND active = TRUE ORDER BY name",
    [(empresa as any).id]
  );
  const professionals = await queryAll(
    "SELECT id, name FROM barber_professionals WHERE empresa_id = ? AND active = TRUE ORDER BY name",
    [(empresa as any).id]
  );
  res.json({ empresa: { name: (empresa as any).name, slug: (empresa as any).slug }, services, professionals });
});

router.get("/:slug/disponibilidade", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Barbearia não encontrada" });

  const { professional_id, date, service_id } = req.query;
  if (!professional_id || !date || !service_id) {
    return res.status(400).json({ error: "professional_id, date e service_id são obrigatórios" });
  }

  const professional = await queryOne(
    "SELECT working_days, working_start, working_end FROM barber_professionals WHERE id = ? AND empresa_id = ? AND active = TRUE",
    [professional_id, (empresa as any).id]
  );
  const service = await queryOne(
    "SELECT duration_minutes FROM barber_services WHERE id = ? AND empresa_id = ? AND active = TRUE",
    [service_id, (empresa as any).id]
  );
  if (!professional || !service) return res.status(404).json({ error: "Profissional ou serviço não encontrado" });

  const slots = await getAvailableSlots(
    (empresa as any).id,
    String(professional_id),
    String(date),
    Number((service as any).duration_minutes),
    professional as any
  );
  res.json({ date, slots });
});

// Chat de apoio ao agendamento: só extrai intenção (serviço/profissional/data)
// via IA. Não cria nem confirma agendamento — isso continua sendo feito pelas
// rotas determinísticas /disponibilidade e /agendar acima, chamadas pela UI.
router.post("/:slug/assistente", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Barbearia não encontrada" });

  const { messages } = req.body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages é obrigatório" });
  }

  try {
    const result = await runBookingAssistant((empresa as any).id, (empresa as any).name, messages);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:slug/agendar", async (req: Request, res: Response) => {
  const empresa = await resolveEmpresa(String(req.params.slug));
  if (!empresa) return res.status(404).json({ error: "Barbearia não encontrada" });
  const empresaId = (empresa as any).id;

  const { client_name, client_phone, professional_id, service_id, scheduled_at } = req.body;
  if (!client_name || !client_phone || !professional_id || !service_id || !scheduled_at) {
    return res
      .status(400)
      .json({ error: "client_name, client_phone, professional_id, service_id e scheduled_at são obrigatórios" });
  }

  const service = await queryOne(
    "SELECT duration_minutes, price FROM barber_services WHERE id = ? AND empresa_id = ? AND active = TRUE",
    [service_id, empresaId]
  );
  const professional = await queryOne(
    "SELECT working_days, working_start, working_end FROM barber_professionals WHERE id = ? AND empresa_id = ? AND active = TRUE",
    [professional_id, empresaId]
  );
  if (!service || !professional) return res.status(404).json({ error: "Profissional ou serviço não encontrado" });

  const date = String(scheduled_at).slice(0, 10);
  const freeSlots = await getAvailableSlots(
    empresaId,
    String(professional_id),
    date,
    Number((service as any).duration_minutes),
    professional as any
  );
  const requestedTime = String(scheduled_at).slice(11, 16);
  if (!freeSlots.includes(requestedTime)) {
    return res.status(409).json({ error: "Horário indisponível", slots_disponiveis: freeSlots });
  }

  let client = await queryOne("SELECT id FROM barber_clients WHERE empresa_id = ? AND phone = ?", [
    empresaId,
    client_phone,
  ]);
  let clientId: string;
  if (client) {
    clientId = (client as any).id;
  } else {
    clientId = crypto.randomUUID();
    await runSql("INSERT INTO barber_clients (id, empresa_id, name, phone) VALUES (?, ?, ?, ?)", [
      clientId,
      empresaId,
      client_name,
      client_phone,
    ]);
  }

  const id = crypto.randomUUID();
  try {
    await runSql(
      `INSERT INTO barber_appointments
        (id, empresa_id, client_id, professional_id, service_id, scheduled_at, duration_minutes, price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, empresaId, clientId, professional_id, service_id, scheduled_at, (service as any).duration_minutes, (service as any).price]
    );
  } catch (err: any) {
    if (err.code === "23505") {
      const freshSlots = await getAvailableSlots(
        empresaId,
        String(professional_id),
        date,
        Number((service as any).duration_minutes),
        professional as any
      );
      return res.status(409).json({ error: "Horário indisponível", slots_disponiveis: freshSlots });
    }
    throw err;
  }

  res.status(201).json({ id, scheduled_at, status: "agendado" });
});

export default router;
