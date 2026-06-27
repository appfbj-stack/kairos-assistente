import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { audit } from "../core/audit.js";

const router = Router();

const TIPOS = ["5x2", "6x1", "12x36", "personalizada"];

// Presets de dias de trabalho por tipo (1=segunda ... 7=domingo).
const PRESET_DIAS: Record<string, string> = {
  "5x2": "1,2,3,4,5",
  "6x1": "1,2,3,4,5,6",
  "12x36": "", // alternância dia sim/dia não — tratada na apuração
  personalizada: "1,2,3,4,5",
};

router.get("/", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });
  const rows = await queryAll("SELECT * FROM escalas WHERE empresa_id = ? ORDER BY nome", [empresaId]);
  res.json(rows);
});

router.post(
  "/",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const actor = (req as any).user as AuthUser;
    const {
      nome,
      tipo,
      horario_entrada,
      horario_saida,
      intervalo_minutos,
      tolerancia_minutos,
      carga_diaria_minutos,
      dias_trabalho,
      empresa_id,
    } = req.body;
    if (!nome) return res.status(400).json({ error: "nome é obrigatório" });
    const t = tipo && TIPOS.includes(tipo) ? tipo : "personalizada";

    const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id : actor.empresa_id;
    if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

    const id = crypto.randomUUID();
    await runSql(
      `INSERT INTO escalas
        (id, empresa_id, nome, tipo, horario_entrada, horario_saida, intervalo_minutos, tolerancia_minutos, carga_diaria_minutos, dias_trabalho)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        empresaId,
        nome,
        t,
        horario_entrada || "08:00",
        horario_saida || "17:00",
        intervalo_minutos ?? 60,
        tolerancia_minutos ?? 10,
        carga_diaria_minutos ?? 480,
        dias_trabalho || PRESET_DIAS[t],
      ]
    );
    await audit(req, "escala.criar", { entity: "escala", entityId: id, details: nome, empresaId });
    res.status(201).json({ id, nome, tipo: t });
  }
);

router.patch(
  "/:id",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req);
    const existing = await queryOne("SELECT empresa_id FROM escalas WHERE id = ?", [req.params.id]);
    if (!existing) return res.status(404).json({ error: "Escala não encontrada" });
    if (empresaId && existing.empresa_id !== empresaId) {
      return res.status(403).json({ error: "Sem acesso a esta escala" });
    }

    const {
      nome,
      tipo,
      horario_entrada,
      horario_saida,
      intervalo_minutos,
      tolerancia_minutos,
      carga_diaria_minutos,
      dias_trabalho,
      active,
    } = req.body;
    await runSql(
      `UPDATE escalas SET
        nome = COALESCE(?, nome),
        tipo = COALESCE(?, tipo),
        horario_entrada = COALESCE(?, horario_entrada),
        horario_saida = COALESCE(?, horario_saida),
        intervalo_minutos = COALESCE(?, intervalo_minutos),
        tolerancia_minutos = COALESCE(?, tolerancia_minutos),
        carga_diaria_minutos = COALESCE(?, carga_diaria_minutos),
        dias_trabalho = COALESCE(?, dias_trabalho),
        active = COALESCE(?, active),
        updated_at = NOW()
       WHERE id = ?`,
      [
        nome ?? null,
        tipo ?? null,
        horario_entrada ?? null,
        horario_saida ?? null,
        intervalo_minutos ?? null,
        tolerancia_minutos ?? null,
        carga_diaria_minutos ?? null,
        dias_trabalho ?? null,
        active ?? null,
        req.params.id,
      ]
    );
    await audit(req, "escala.atualizar", { entity: "escala", entityId: req.params.id });
    res.json({ ok: true });
  }
);

export default router;
