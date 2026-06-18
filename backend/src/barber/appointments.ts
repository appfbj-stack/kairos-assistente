import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireCoreAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { getAvailableSlots } from "./availability.js";

const router = Router();

router.get("/", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const { from, to, professional_id, status } = req.query;
  const conditions = ["a.empresa_id = ?"];
  const params: any[] = [empresaId];
  if (from) {
    conditions.push("a.scheduled_at >= ?");
    params.push(from);
  }
  if (to) {
    conditions.push("a.scheduled_at <= ?");
    params.push(to);
  }
  if (professional_id) {
    conditions.push("a.professional_id = ?");
    params.push(professional_id);
  }
  if (status) {
    conditions.push("a.status = ?");
    params.push(status);
  }

  const rows = await queryAll(
    `SELECT a.*, c.name as client_name, c.phone as client_phone, p.name as professional_name, s.name as service_name
     FROM barber_appointments a
     JOIN barber_clients c ON c.id = a.client_id
     JOIN barber_professionals p ON p.id = a.professional_id
     JOIN barber_services s ON s.id = a.service_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY a.scheduled_at`,
    params
  );
  res.json(rows);
});

router.get("/disponibilidade", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  const { professional_id, date, service_id } = req.query;
  if (!empresaId || !professional_id || !date || !service_id) {
    return res.status(400).json({ error: "empresa_id, professional_id, date e service_id são obrigatórios" });
  }

  const professional = await queryOne(
    "SELECT working_days, working_start, working_end FROM barber_professionals WHERE id = ? AND empresa_id = ?",
    [professional_id, empresaId]
  );
  const service = await queryOne("SELECT duration_minutes FROM barber_services WHERE id = ? AND empresa_id = ?", [
    service_id,
    empresaId,
  ]);
  if (!professional || !service) return res.status(404).json({ error: "Profissional ou serviço não encontrado" });

  const slots = await getAvailableSlots(
    empresaId,
    String(professional_id),
    String(date),
    Number((service as any).duration_minutes),
    professional as any
  );
  res.json({ date, slots });
});

router.get("/dashboard", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const hoje = await queryOne(
    "SELECT COUNT(*) as total FROM barber_appointments WHERE empresa_id = ? AND scheduled_at::date = CURRENT_DATE AND status != 'cancelado'",
    [empresaId]
  );
  const semana = await queryOne(
    "SELECT COUNT(*) as total FROM barber_appointments WHERE empresa_id = ? AND scheduled_at::timestamp >= date_trunc('week', NOW()) AND status != 'cancelado'",
    [empresaId]
  );
  const faturamentoMes = await queryOne(
    "SELECT COALESCE(SUM(price),0) as total FROM barber_appointments WHERE empresa_id = ? AND status = 'concluido' AND scheduled_at::timestamp >= date_trunc('month', NOW())",
    [empresaId]
  );
  const porStatus = await queryAll(
    "SELECT status, COUNT(*) as total FROM barber_appointments WHERE empresa_id = ? GROUP BY status",
    [empresaId]
  );
  const topServicos = await queryAll(
    `SELECT s.name, COUNT(*) as total
     FROM barber_appointments a JOIN barber_services s ON s.id = a.service_id
     WHERE a.empresa_id = ? AND a.status = 'concluido'
     GROUP BY s.name ORDER BY total DESC LIMIT 5`,
    [empresaId]
  );

  res.json({
    agendamentos_hoje: Number((hoje as any)?.total || 0),
    agendamentos_semana: Number((semana as any)?.total || 0),
    faturamento_mes: Number((faturamentoMes as any)?.total || 0),
    por_status: porStatus,
    top_servicos: topServicos,
  });
});

router.post(
  "/",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE", "ATENDENTE", "PROFISSIONAL"),
  async (req: Request, res: Response) => {
    const actor = (req as any).user as AuthUser;
    const { client_id, professional_id, service_id, scheduled_at, notes, empresa_id } = req.body;
    if (!client_id || !professional_id || !service_id || !scheduled_at) {
      return res.status(400).json({ error: "client_id, professional_id, service_id e scheduled_at são obrigatórios" });
    }

    const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id : actor.empresa_id;
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

    const service = await queryOne("SELECT duration_minutes, price FROM barber_services WHERE id = ? AND empresa_id = ?", [
      service_id,
      empresaId,
    ]);
    if (!service) return res.status(404).json({ error: "Serviço não encontrado" });

    const id = crypto.randomUUID();
    try {
      await runSql(
        `INSERT INTO barber_appointments
          (id, empresa_id, client_id, professional_id, service_id, scheduled_at, duration_minutes, price, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          empresaId,
          client_id,
          professional_id,
          service_id,
          scheduled_at,
          (service as any).duration_minutes,
          (service as any).price,
          notes || "",
        ]
      );
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Este profissional já tem um agendamento ativo nesse horário" });
      }
      throw err;
    }
    res.status(201).json({ id, empresa_id: empresaId, scheduled_at, status: "agendado" });
  }
);

router.patch(
  "/:id",
  requireCoreAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "GERENTE", "ATENDENTE", "PROFISSIONAL"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM barber_appointments WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Agendamento não encontrado" });
    if (empresaId && (existing as any).empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a este agendamento" });
    }

    const { scheduled_at, status, notes } = req.body;
    if (status && !["agendado", "confirmado", "concluido", "cancelado", "faltou"].includes(status)) {
      return res.status(400).json({ error: "status inválido" });
    }

    try {
      await runSql(
        `UPDATE barber_appointments SET
          scheduled_at = COALESCE(?, scheduled_at),
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          updated_at = NOW()
         WHERE id = ?`,
        [scheduled_at ?? null, status ?? null, notes ?? null, req.params.id]
      );
    } catch (err: any) {
      if (err.code === "23505") {
        return res.status(409).json({ error: "Este profissional já tem um agendamento ativo nesse horário" });
      }
      throw err;
    }
    res.json({ ok: true });
  }
);

export default router;
