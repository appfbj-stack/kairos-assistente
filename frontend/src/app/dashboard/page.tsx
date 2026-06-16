"use client";

import { useEffect, useState } from "react";
import { Users, Key, AppWindow, DollarSign, TrendingUp, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import StatCard from "@/components/StatCard";
import { api } from "@/services/api";
import { formatCurrency, formatDate, statusBadgeClass, statusLabel } from "@/lib/utils";

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [s, l] = await Promise.all([api.admin.stats(), api.admin.logs({ limit: 10 })]);
      setStats(s);
      setLogs(l);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <AdminShell title="Dashboard" onRefresh={load}>
      {loading && !stats ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Clientes" value={stats?.total_clients ?? 0} icon={Users} color="blue" />
            <StatCard title="Apps" value={stats?.total_apps ?? 0} icon={AppWindow} color="purple" />
            <StatCard title="Licenças Ativas" value={stats?.active_licenses ?? 0} icon={CheckCircle} color="green" />
            <StatCard title="Em Trial" value={stats?.trial_licenses ?? 0} icon={Clock} color="yellow" />
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard title="Expiradas" value={stats?.expired_licenses ?? 0} icon={AlertTriangle} color="red" />
            <StatCard title="Bloqueadas" value={stats?.blocked_licenses ?? 0} icon={Key} color="gray" />
            <StatCard
              title="Total Licenças"
              value={stats?.total_licenses ?? 0}
              icon={TrendingUp}
              color="blue"
            />
            <StatCard
              title="Receita Total"
              value={formatCurrency(stats?.total_revenue ?? 0)}
              icon={DollarSign}
              color="green"
            />
          </div>

          {/* Recent activity */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Atividade Recente</h2>
            </div>
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">Nenhum log registrado</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {logs.map((log: any) => (
                  <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-kairos-400 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200">
                        <span className="font-medium">{log.client_name || "Sistema"}</span>
                        {" · "}
                        <span className="text-gray-500">{log.action}</span>
                      </p>
                      {log.details && (
                        <p className="text-xs text-gray-400 truncate">{log.details}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 flex-shrink-0">{formatDate(log.created_at)}</p>
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
