import { Router, Request, Response } from "express";
import crypto from "crypto";
import { queryAll, queryOne, runSql } from "../database/database.js";
import { requireAuth, requireRole, scopeEmpresaId } from "../core/auth.js";
import { audit } from "../core/audit.js";

const router = Router();

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// SUPER_ADMIN lista todas; ADMIN_EMPRESA/SUPERVISOR vê só a própria.
router.get("/", requireAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req);
  if (empresaId) {
    const row = await queryOne("SELECT * FROM empresas WHERE id = ? AND deleted_at IS NULL", [empresaId]);
    return res.json(row ? [row] : []);
  }
  const rows = await queryAll("SELECT * FROM empresas WHERE deleted_at IS NULL ORDER BY name");
  res.json(rows);
});

router.post("/", requireAuth, requireRole("SUPER_ADMIN"), async (req: Request, res: Response) => {
  const { name, document, kairos_client_id, plan } = req.body;
  if (!name) return res.status(400).json({ error: "name é obrigatório" });

  const id = crypto.randomUUID();
  let slug = slugify(name);
  const exists = await queryOne("SELECT 1 FROM empresas WHERE slug = ?", [slug]);
  if (exists) slug = `${slug}-${id.slice(0, 4)}`;

  await runSql(
    "INSERT INTO empresas (id, name, slug, document, kairos_client_id, plan) VALUES (?, ?, ?, ?, ?, ?)",
    [id, name, slug, document || "", kairos_client_id || "", plan || "TRIAL"]
  );
  await audit(req, "empresa.criar", { entity: "empresa", entityId: id, details: name, empresaId: id });
  res.status(201).json({ id, name, slug });
});

router.patch("/:id", requireAuth, requireRole("SUPER_ADMIN", "ADMIN_EMPRESA"), async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req);
  if (empresaId && empresaId !== req.params.id) {
    return res.status(403).json({ error: "Sem acesso a esta empresa" });
  }
  const {
    name,
    document,
    kairos_client_id,
    plan,
    geofence_lat,
    geofence_lng,
    geofence_raio_metros,
    geofence_obrigatorio,
    face_obrigatorio,
    active,
  } = req.body;

  await runSql(
    `UPDATE empresas SET
      name = COALESCE(?, name),
      document = COALESCE(?, document),
      kairos_client_id = COALESCE(?, kairos_client_id),
      plan = COALESCE(?, plan),
      geofence_lat = COALESCE(?, geofence_lat),
      geofence_lng = COALESCE(?, geofence_lng),
      geofence_raio_metros = COALESCE(?, geofence_raio_metros),
      geofence_obrigatorio = COALESCE(?, geofence_obrigatorio),
      face_obrigatorio = COALESCE(?, face_obrigatorio),
      active = COALESCE(?, active),
      updated_at = NOW()
     WHERE id = ?`,
    [
      name ?? null,
      document ?? null,
      kairos_client_id ?? null,
      plan ?? null,
      geofence_lat ?? null,
      geofence_lng ?? null,
      geofence_raio_metros ?? null,
      geofence_obrigatorio ?? null,
      face_obrigatorio ?? null,
      active ?? null,
      req.params.id,
    ]
  );
  await audit(req, "empresa.atualizar", { entity: "empresa", entityId: req.params.id, empresaId: String(req.params.id) });
  res.json({ ok: true });
});

export default router;
