"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, CheckCircle, Clock } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import StatCard from "@/components/StatCard";
import { api } from "@/services/api";
import { formatCurrency, formatDate } from "@/lib/utils";
import clsx from "clsx";

export default function FinanceiroPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { setData(await api.admin.financial()); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <AdminShell title="Financeiro" onRefresh={load}>
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatCard title="Receita do Mês" value={formatCurrency(data?.monthly_revenue ?? 0)} icon={TrendingUp} color="green" />
            <StatCard title="Receita Total" value={formatCurrency(data?.total_revenue ?? 0)} icon={DollarSign} color="blue" />
            <StatCard title="Pagamentos" value={data?.payments?.length ?? 0} icon={CheckCircle} color="purple" subtitle="Últimos 50" />
          </div>

          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold">Pagamentos Recentes</h2>
            </div>
            {!data?.payments?.length ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum pagamento registrado</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {data.payments.map((p: any) => (
                  <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                    <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0", p.status === "confirmed" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500")}>
                      {p.status === "confirmed" ? <CheckCircle size={14} /> : <Clock size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.client_name}</p>
                      <p className="text-xs text-gray-400">{p.app_name} · {p.method || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">{formatCurrency(p.amount)}</p>
                      <p className="text-xs text-gray-400">{formatDate(p.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
