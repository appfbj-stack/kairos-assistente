import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import type { AuthUser } from "../core/types.js";
import { TIPOS_REGISTRO } from "../core/types.js";
import { audit, getIp } from "../core/audit.js";
import { checkGeofence } from "./geo.js";
import { compareFace } from "./face.js";

const router = Router();

const ORDEM_TIPOS = ["entrada", "saida_almoco", "retorno_almoco", "saida_final"] as const;

async function notificarAdmins(empresaId: string, titulo: string, mensagem: string, tipo = "alerta") {
  const admins = await queryAll(
    "SELECT id FROM ponto_users WHERE empresa_id = ? AND role IN ('ADMIN_EMPRESA','SUPERVISOR') AND active = TRUE",
    [empresaId]
  );
  for (const a of admins) {
    await runSql(
      "INSERT INTO notificacoes (id, empresa_id, user_id, tipo, titulo, mensagem) VALUES (?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), empresaId, a.id, tipo, titulo, mensagem]
    );
  }
}

/**
 * Registro de ponto (PRD seção 7). Captura tipo, GPS, selfie e dispositivo;
 * valida geofence (seção 9) e dispara o reconhecimento facial (seção 8).
 */
router.post("/", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  let { funcionario_id, tipo, gps_lat, gps_lng, selfie, dispositivo, empresa_id } = req.body;

  // FUNCIONARIO sempre registra para si mesmo.
  if (actor.role === "FUNCIONARIO") {
    if (!actor.funcionario_id) return res.status(403).json({ error: "Usuário não vinculado a um funcionário" });
    funcionario_id = actor.funcionario_id;
  }
  if (!funcionario_id || !tipo) return res.status(400).json({ error: "funcionario_id e tipo são obrigatórios" });
  if (!TIPOS_REGISTRO.includes(tipo)) return res.status(400).json({ error: "tipo inválido" });

  const funcionario = await queryOne(
    "SELECT * FROM funcionarios WHERE id = ? AND deleted_at IS NULL AND active = TRUE",
    [funcionario_id]
  );
  if (!funcionario) return res.status(404).json({ error: "Funcionário não encontrado ou inativo" });

  const empresaId = actor.role === "SUPER_ADMIN" ? empresa_id || funcionario.empresa_id : actor.empresa_id;
  if (funcionario.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso a este funcionário" });

  const empresa = await queryOne("SELECT * FROM empresas WHERE id = ?", [empresaId]);
  if (!empresa) return res.status(404).json({ error: "Empresa não encontrada" });

  const ip = getIp(req);
  const origem = actor.role === "FUNCIONARIO" ? "app" : "web";

  // --- Geofence (PRD seção 9) ---
  const geo = checkGeofence(empresa, gps_lat, gps_lng);
  if (empresa.geofence_obrigatorio && !geo.dentro) {
    await audit(req, "ponto.bloqueado_geofence", {
      entity: "funcionario",
      entityId: funcionario_id,
      details: `distancia=${geo.distancia_metros}m raio=${empresa.geofence_raio_metros}m`,
      empresaId,
    });
    await notificarAdmins(
      empresaId,
      "Registro bloqueado por localização",
      `${funcionario.nome} tentou registrar ${tipo} fora da área permitida (${geo.distancia_metros ?? "?"}m).`
    );
    return res.status(422).json({
      error: "Você está fora da área permitida para registrar o ponto.",
      distancia_metros: geo.distancia_metros,
      raio_metros: empresa.geofence_raio_metros,
    });
  }

  // --- Reconhecimento facial (PRD seção 8) ---
  let faceVerificada = false;
  let faceScore: number | null = null;
  let suspeito = false;
  if (empresa.face_obrigatorio) {
    const face = await compareFace(funcionario.foto_facial, selfie || "");
    faceVerificada = face.verificada;
    faceScore = face.score;
    suspeito = face.suspeito;

    await runSql(
      "INSERT INTO face_tentativas (id, empresa_id, funcionario_id, score, aprovada, motivo, ip, dispositivo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), empresaId, funcionario_id, faceScore, faceVerificada, face.motivo, ip, dispositivo || ""]
    );

    if (suspeito) {
      await notificarAdmins(
        empresaId,
        "Tentativa de registro suspeita",
        `Verificação facial falhou para ${funcionario.nome}: ${face.motivo}.`
      );
      return res.status(422).json({ error: `Verificação facial falhou: ${face.motivo}` });
    }
  }

  const now = new Date().toISOString();
  const data = now.slice(0, 10);
  const id = crypto.randomUUID();
  await runSql(
    `INSERT INTO registros_ponto
      (id, empresa_id, funcionario_id, tipo, registrado_em, data, gps_lat, gps_lng, dentro_geofence, distancia_metros, selfie, face_verificada, face_score, suspeito, dispositivo, ip, origem)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      empresaId,
      funcionario_id,
      tipo,
      now,
      data,
      gps_lat ?? null,
      gps_lng ?? null,
      geo.dentro,
      geo.distancia_metros,
      selfie || "",
      faceVerificada,
      faceScore,
      suspeito,
      dispositivo || "",
      ip,
      origem,
    ]
  );
  await audit(req, "ponto.registrar", { entity: "registro", entityId: id, details: tipo, empresaId });
  res.status(201).json({
    id,
    tipo,
    registrado_em: now,
    dentro_geofence: geo.dentro,
    face_verificada: faceVerificada,
    pendente_revisao: empresa.face_obrigatorio && !faceVerificada,
  });
});

// Marcações do funcionário no dia + qual o próximo tipo esperado.
router.get("/hoje", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const funcionarioId = actor.role === "FUNCIONARIO" ? actor.funcionario_id : (req.query.funcionario_id as string);
  if (!funcionarioId) return res.status(400).json({ error: "funcionario_id é obrigatório" });

  const hoje = new Date().toISOString().slice(0, 10);
  const rows = await queryAll(
    "SELECT id, tipo, registrado_em, dentro_geofence, face_verificada FROM registros_ponto WHERE funcionario_id = ? AND data = ? ORDER BY registrado_em",
    [funcionarioId, hoje]
  );
  const registrados = new Set(rows.map((r: any) => r.tipo));
  const proximo = ORDEM_TIPOS.find((t) => !registrados.has(t)) || null;
  res.json({ data: hoje, registros: rows, proximo_tipo: proximo });
});

// Histórico / espelho bruto com filtros.
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const actor = (req as any).user as AuthUser;
  const empresaId = scopeEmpresaId(req, req.query.empresa_id as string | undefined);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const conditions = ["r.empresa_id = ?"];
  const params: any[] = [empresaId];

  // FUNCIONARIO vê apenas o próprio histórico.
  if (actor.role === "FUNCIONARIO") {
    conditions.push("r.funcionario_id = ?");
    params.push(actor.funcionario_id);
  } else if (req.query.funcionario_id) {
    conditions.push("r.funcionario_id = ?");
    params.push(req.query.funcionario_id);
  }
  if (req.query.from) {
    conditions.push("r.data >= ?");
    params.push(req.query.from);
  }
  if (req.query.to) {
    conditions.push("r.data <= ?");
    params.push(req.query.to);
  }

  const rows = await queryAll(
    `SELECT r.id, r.funcionario_id, f.nome as funcionario_nome, r.tipo, r.registrado_em, r.data,
            r.dentro_geofence, r.distancia_metros, r.face_verificada, r.suspeito, r.origem, r.dispositivo
     FROM registros_ponto r
     JOIN funcionarios f ON f.id = r.funcionario_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY r.registrado_em DESC
     LIMIT 1000`,
    params
  );
  res.json(rows);
});

// Ajuste/lançamento manual por gestor (PRD seção 13 — usado também na aprovação).
router.post(
  "/ajuste",
  requireAuth,
  requireRole("SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"),
  async (req: Request, res: Response) => {
    const empresaId = scopeEmpresaId(req, req.body.empresa_id);
    const { funcionario_id, tipo, registrado_em, observacao } = req.body;
    if (!funcionario_id || !tipo || !registrado_em) {
      return res.status(400).json({ error: "funcionario_id, tipo e registrado_em são obrigatórios" });
    }
    if (!TIPOS_REGISTRO.includes(tipo)) return res.status(400).json({ error: "tipo inválido" });

    const funcionario = await queryOne("SELECT empresa_id FROM funcionarios WHERE id = ?", [funcionario_id]);
    if (!funcionario) return res.status(404).json({ error: "Funcionário não encontrado" });
    if (empresaId && funcionario.empresa_id !== empresaId) return res.status(403).json({ error: "Sem acesso" });

    const id = crypto.randomUUID();
    await runSql(
      `INSERT INTO registros_ponto (id, empresa_id, funcionario_id, tipo, registrado_em, data, origem, observacao, face_verificada)
       VALUES (?, ?, ?, ?, ?, ?, 'ajuste', ?, TRUE)`,
      [id, funcionario.empresa_id, funcionario_id, tipo, registrado_em, String(registrado_em).slice(0, 10), observacao || ""]
    );
    await audit(req, "ponto.ajuste_manual", { entity: "registro", entityId: id, details: tipo, empresaId: funcionario.empresa_id });
    res.status(201).json({ id, tipo, registrado_em });
  }
);

export default router;
export { notificarAdmins };
