"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Users, MessageCircle, UserPlus, TrendingUp, Clock, CheckCircle, CircleAlert } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import StatCard from "@/components/StatCard";
import { api } from "@/services/api";

export default function AtendimentoDashboard() {
  const [empresaId, setEmpresaId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    setEmpresaId(eid);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      const d = await api.atendimento.dashboard(eid);
      setData(d);
    } catch {}
    setLoading(false);
  }

  return (
    <AdminShell title="Atendimento IA" onRefresh={() => empresaId && load(empresaId)}>
      {loading && !data ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">
          Selecione uma empresa para visualizar o dashboard
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Conversas" value={data?.stats?.total_conversations ?? 0} icon={MessageSquare} color="blue" />
            <StatCard title="Ativas" value={data?.stats?.active_conversations ?? 0} icon={MessageCircle} color="green" />
            <StatCard title="Leads" value={data?.stats?.total_leads ?? 0} icon={Users} color="purple" />
            <StatCard title="Novos Leads" value={data?.stats?.new_leads ?? 0} icon={UserPlus} color="yellow" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Total Mensagens" value={data?.stats?.total_messages ?? 0} icon={TrendingUp} color="blue" />
          </div>

          {data?.recent_conversations?.length > 0 && (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Conversas Recentes</h2>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {data.recent_conversations.map((c: any) => (
                  <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${c.status === "active" ? "bg-green-400" : c.status === "waiting" ? "bg-yellow-400" : "bg-gray-400"}`} />
                    <span className="text-sm text-gray-700 dark:text-gray-200 flex-1">{c.visitor_name || "Visitante"}</span>
                    <span className="text-xs text-gray-400">{c.channel}</span>
                    <span className="text-xs text-gray-400">{c.started_at?.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
