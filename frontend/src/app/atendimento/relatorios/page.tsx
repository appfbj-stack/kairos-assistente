"use client";

import { useEffect, useState } from "react";
import { BarChart3, TrendingUp, MessageSquare, Users, BookOpen } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import StatCard from "@/components/StatCard";
import { api } from "@/services/api";

export default function RelatoriosPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    setEmpresaId(eid);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      const params: any = {};
      if (dateRange.start) params.start_date = dateRange.start;
      if (dateRange.end) params.end_date = dateRange.end;
      const d = await api.atendimento.reports.get(eid, params);
      setData(d);
    } catch {}
    setLoading(false);
  }

  function getTotal(arr: any[]) {
    return arr?.reduce((sum: number, item: any) => sum + Number(item.total), 0) || 0;
  }

  return (
    <AdminShell title="Relatórios" onRefresh={() => empresaId && load(empresaId)}>
      {!empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>
      ) : (
        <div className="space-y-6">
          <div className="flex gap-3 items-center flex-wrap">
            <input type="date" className="input text-sm w-auto" value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} />
            <input type="date" className="input text-sm w-auto" value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} />
            <button onClick={() => load(empresaId)} className="btn-primary text-sm">Filtrar</button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <div className="card p-8 text-center text-gray-400 text-sm">Nenhum dado disponível</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard title="Conversas" value={getTotal(data.conversation_trend)} icon={MessageSquare} color="blue" />
                <StatCard title="Leads" value={getTotal(data.leads_by_status)} icon={Users} color="green" />
                <StatCard title="Itens de Conhecimento" value={getTotal(data.knowledge_by_type)} icon={BookOpen} color="purple" />
                <StatCard title="Taxa de Conversão" value={data.leads_by_status?.find((l: any) => l.status === "converted")?.total || 0} icon={TrendingUp} color="yellow" />
              </div>

              {data.conversation_trend?.length > 0 && (
                <div className="card p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">Tendência de Conversas</h3>
                  <div className="space-y-2">
                    {data.conversation_trend.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-24">{item.date}</span>
                        <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                          <div className="bg-kairos-500 h-full rounded-full" style={{ width: `${Math.min(100, (item.total / Math.max(...data.conversation_trend.map((t: any) => t.total))) * 100)}%` }} />
                        </div>
                        <span className="text-xs text-gray-600 dark:text-gray-300 w-8 text-right">{item.total}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.conversations_by_status?.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Conversas por Status</h3>
                    {data.conversations_by_status.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{item.status}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.total}</span>
                      </div>
                    ))}
                  </div>
                )}

                {data.top_interests?.length > 0 && (
                  <div className="card p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Principais Interesses</h3>
                    {data.top_interests.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between py-1.5">
                        <span className="text-sm text-gray-600 dark:text-gray-300">{item.interest}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item.total}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </AdminShell>
  );
}
