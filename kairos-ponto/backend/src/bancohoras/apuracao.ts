import { queryAll, queryOne } from "../database/database.js";

/** Minutos entre dois instantes ISO. */
function diffMin(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 60000));
}

export interface DiaApurado {
  data: string;
  trabalhado_min: number;
  esperado_min: number;
  saldo_min: number; // positivo = crédito/extra, negativo = débito
  extra_min: number;
  completo: boolean;
}

/**
 * Apura os minutos trabalhados de um funcionário num dia a partir das marcações.
 * Considera o par entrada→saída e desconta o intervalo de almoço efetivo
 * (retorno_almoco − saida_almoco) quando ambos existem.
 */
export function apurarDia(
  data: string,
  registros: { tipo: string; registrado_em: string }[],
  escala: { carga_diaria_minutos: number; dias_trabalho: string; tipo: string } | null,
  ehFeriado: boolean
): DiaApurado {
  const byTipo: Record<string, string> = {};
  for (const r of registros) byTipo[r.tipo] = r.registrado_em;

  let trabalhado = 0;
  if (byTipo.entrada && byTipo.saida_final) {
    trabalhado = diffMin(byTipo.entrada, byTipo.saida_final);
    if (byTipo.saida_almoco && byTipo.retorno_almoco) {
      trabalhado -= diffMin(byTipo.saida_almoco, byTipo.retorno_almoco);
    }
    trabalhado = Math.max(0, trabalhado);
  }

  // Dia esperado: 0 em feriado ou dia fora da escala.
  const diaSemana = ((new Date(data + "T12:00:00").getDay() + 6) % 7) + 1; // 1=seg..7=dom
  const diasTrabalho = (escala?.dias_trabalho || "1,2,3,4,5").split(",").filter(Boolean).map(Number);
  const trabalhaHoje = escala?.tipo === "12x36" ? true : diasTrabalho.includes(diaSemana);
  const esperado = ehFeriado || !trabalhaHoje ? 0 : escala?.carga_diaria_minutos ?? 480;

  const completo = Boolean(byTipo.entrada && byTipo.saida_final);
  const saldo = trabalhado - esperado;
  const extra = esperado === 0 ? trabalhado : Math.max(0, saldo);

  return { data, trabalhado_min: trabalhado, esperado_min: esperado, saldo_min: saldo, extra_min: extra, completo };
}

/** Lista de datas (YYYY-MM-DD) entre from e to, inclusive. */
export function rangeDatas(from: string, to: string): string[] {
  const out: string[] = [];
  const d = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** Apura um período completo de um funcionário, dia a dia. */
export async function apurarPeriodo(empresaId: string, funcionarioId: string, from: string, to: string): Promise<DiaApurado[]> {
  const func = await queryOne(
    `SELECT f.id, e.carga_diaria_minutos, e.dias_trabalho, e.tipo
     FROM funcionarios f LEFT JOIN escalas e ON e.id = f.escala_id
     WHERE f.id = ?`,
    [funcionarioId]
  );
  const escala = func
    ? { carga_diaria_minutos: func.carga_diaria_minutos ?? 480, dias_trabalho: func.dias_trabalho ?? "1,2,3,4,5", tipo: func.tipo ?? "personalizada" }
    : null;

  const registros = await queryAll(
    "SELECT tipo, registrado_em, data FROM registros_ponto WHERE funcionario_id = ? AND data >= ? AND data <= ? ORDER BY registrado_em",
    [funcionarioId, from, to]
  );
  const feriados = await queryAll("SELECT data FROM feriados WHERE empresa_id = ? AND data >= ? AND data <= ?", [
    empresaId,
    from,
    to,
  ]);
  const feriadoSet = new Set(feriados.map((f: any) => f.data));

  const porDia: Record<string, { tipo: string; registrado_em: string }[]> = {};
  for (const r of registros) (porDia[r.data] = porDia[r.data] || []).push(r);

  return rangeDatas(from, to).map((data) => apurarDia(data, porDia[data] || [], escala, feriadoSet.has(data)));
}
