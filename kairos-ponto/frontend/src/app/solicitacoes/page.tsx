"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api, getUser } from "@/services/api";
import { fmtDateTime } from "@/lib/utils";

const TIPO_LABEL: Record<string, string> = {
  ajuste_ponto: "Ajuste de ponto",
  folga: "Folga",
  justificativa: "Justificativa",
  correcao_horario: "Correção de horário",
};
const STATUS_BADGE: Record<string, string> = {
  solicitado: "bg-amber-100 text-amber-700",
  em_analise: "bg-blue-100 text-blue-700",
  aprovado: "bg-green-100 text-green-700",
  rejeitado: "bg-red-100 text-red-700",
};

export default function SolicitacoesPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [error, setError] = useState("");
  const role = getUser()?.role || "";
  const podeDecidir = ["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"].includes(role);

  async function load() {
    setError("");
    try {
      setLista(await api.solicitacoes.list());
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function decidir(id: string, status: string) {
    const resposta = status === "rejeitado" ? prompt("Motivo da rejeição (opcional):") || "" : "";
    try {
      await api.solicitacoes.decidir(id, status, resposta);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <Shell title="Solicitações" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"]}>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}
      <div className="space-y-3">
        {lista.map((s) => (
          <div key={s.id} className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{s.funcionario_nome}</span>
                <span className="badge bg-primary/10 text-primary">{TIPO_LABEL[s.tipo]}</span>
                <span className={`badge ${STATUS_BADGE[s.status]}`}>{s.status}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{s.descricao || "—"}</p>
              <p className="text-xs text-slate-400">{fmtDateTime(s.created_at)}</p>
            </div>
            {podeDecidir && (s.status === "solicitado" || s.status === "em_analise") && (
              <div className="flex gap-2">
                <button className="btn-primary" onClick={() => decidir(s.id, "aprovado")}>
                  Aprovar
                </button>
                <button className="btn-ghost text-red-500" onClick={() => decidir(s.id, "rejeitado")}>
                  Rejeitar
                </button>
              </div>
            )}
          </div>
        ))}
        {!lista.length && <p className="text-slate-400">Nenhuma solicitação.</p>}
      </div>
    </Shell>
  );
}
