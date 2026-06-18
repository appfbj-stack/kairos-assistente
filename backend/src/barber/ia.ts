import { Router, Request, Response } from "express";
import { queryAll, queryOne } from "../database/database.js";
import { requireCoreAuth, scopeEmpresaId } from "../core/auth.js";
import { chatCompletion } from "../llm/llm.js";

const router = Router();

async function buildBarberSystemPrompt(empresaId: string): Promise<string> {
  const faturamentoMes = await queryOne(
    "SELECT COALESCE(SUM(price),0) as total FROM barber_appointments WHERE empresa_id = ? AND status = 'concluido' AND scheduled_at >= date_trunc('month', NOW())",
    [empresaId]
  );
  const agendamentosHoje = await queryOne(
    "SELECT COUNT(*) as total FROM barber_appointments WHERE empresa_id = ? AND scheduled_at::date = CURRENT_DATE AND status != 'cancelado'",
    [empresaId]
  );
  const topServicos = await queryAll(
    `SELECT s.name, COUNT(*) as total
     FROM barber_appointments a JOIN barber_services s ON s.id = a.service_id
     WHERE a.empresa_id = ? AND a.status = 'concluido'
     GROUP BY s.name ORDER BY total DESC LIMIT 5`,
    [empresaId]
  );
  const topProfissionais = await queryAll(
    `SELECT p.name, COUNT(*) as total
     FROM barber_appointments a JOIN barber_professionals p ON p.id = a.professional_id
     WHERE a.empresa_id = ? AND a.status = 'concluido'
     GROUP BY p.name ORDER BY total DESC LIMIT 5`,
    [empresaId]
  );

  return `Você é a IA do Gestor do Kairos Barber, assistente de um gestor de barbearia.
Responda em português brasileiro, de forma direta e prática, com base nos dados abaixo.

## DADOS DA BARBEARIA
Faturamento do mês (serviços concluídos): R$ ${Number((faturamentoMes as any)?.total || 0).toFixed(2)}
Agendamentos hoje: ${(agendamentosHoje as any)?.total || 0}
Serviços mais vendidos: ${topServicos.map((s: any) => `${s.name} (${s.total})`).join(", ") || "sem dados ainda"}
Profissionais com mais atendimentos: ${topProfissionais.map((p: any) => `${p.name} (${p.total})`).join(", ") || "sem dados ainda"}

Se o gestor perguntar algo fora desses dados, responda com base no que você sabe sobre gestão de barbearia, mas deixe claro quando for uma estimativa e não um dado real do sistema.`;
}

router.post("/", requireCoreAuth, async (req: Request, res: Response) => {
  const empresaId = scopeEmpresaId(req, req.body.empresa_id);
  if (!empresaId) return res.status(400).json({ error: "empresa_id é obrigatório" });

  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "message é obrigatório" });

  try {
    const systemPrompt = await buildBarberSystemPrompt(empresaId);
    const reply = await chatCompletion([
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ]);
    res.json({ message: reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
