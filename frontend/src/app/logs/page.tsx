"use client";

import { useEffect, useState } from "react";
import { ScrollText, Search, Filter } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import { formatDate } from "@/lib/utils";
import clsx from "clsx";

const ACTION_COLORS: Record<string, string> = {
  trial_created: "bg-yellow-100 text-yellow-700",
  license_activated: "bg-green-100 text-green-700",
  license_verified: "bg-blue-100 text-blue-700",
  license_expired: "bg-red-100 text-red-700",
  status_changed: "bg-purple-100 text-purple-700",
};

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(100);

  async function load() {
    setLoading(true);
    try { setLogs(await api.admin.logs({ limit })); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [limit]);

  const filtered = logs.filter(
    (l) =>
      (l.client_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.action || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.details || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminShell title="Logs do Sistema" onRefresh={load}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input pl-9" placeholder="Filtrar logs..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input w-auto" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
          </select>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum log encontrado</div>
        ) : (
          <div className="card overflow-hidden">
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {filtered.map((log) => (
                <div key={log.id} className="px-4 py-3 flex items-start gap-3">
                  <span className={clsx("text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5", ACTION_COLORS[log.action] || "bg-gray-100 text-gray-600")}>
                    {log.action?.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    {log.client_name && <p className="text-xs font-medium text-gray-700 dark:text-gray-200">{log.client_name}</p>}
                    {log.details && <p className="text-xs text-gray-400 truncate">{log.details}</p>}
                    {log.app_name && <p className="text-xs text-gray-400">{log.app_name}</p>}
                  </div>
                  <p className="text-[10px] text-gray-400 flex-shrink-0">{formatDate(log.created_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
