"use client";

import { useEffect, useState } from "react";
import { Plus, Filter } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import { formatDate, statusBadgeClass, statusLabel } from "@/lib/utils";
import clsx from "clsx";

const STATUS_OPTS = ["all", "active", "trial", "expired", "blocked"];

export default function LicencasPage() {
  const [licenses, setLicenses] = useState<any[]>([]);
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [showTrial, setShowTrial] = useState(false);
  const [trialForm, setTrialForm] = useState({ client_name: "", app_slug: "", email: "", phone: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        api.admin.licenses.list(filter !== "all" ? { status: filter } : {}),
        api.admin.apps.list(),
      ]);
      setLicenses(l);
      setApps(a);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, [filter]);

  async function updateStatus(id: string, status: string) {
    try { await api.admin.licenses.updateStatus(id, status); await load(); } catch (e: any) { alert(e.message); }
  }

  async function createTrial() {
    if (!trialForm.client_name || !trialForm.app_slug) return;
    setSaving(true);
    try {
      await api.admin.licenses.createTrial(trialForm);
      setShowTrial(false);
      setTrialForm({ client_name: "", app_slug: "", email: "", phone: "" });
      await load();
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  return (
    <AdminShell
      title="Licenças"
      onRefresh={load}
      actions={
        <button onClick={() => setShowTrial(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Trial Rápido
        </button>
      }
    >
      <div className="space-y-4">
        {/* Filter tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
                filter === s
                  ? "bg-kairos-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
              )}
            >
              {s === "all" ? "Todas" : statusLabel(s)}
            </button>
          ))}
        </div>

        {/* Trial modal */}
        {showTrial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="card w-full max-w-sm p-5">
              <h2 className="text-base font-semibold mb-4">⚡ Trial Rápido (10 dias)</h2>
              <div className="space-y-3">
                <input className="input" placeholder="Nome do cliente *" value={trialForm.client_name} onChange={(e) => setTrialForm({ ...trialForm, client_name: e.target.value })} />
                <select className="input" value={trialForm.app_slug} onChange={(e) => setTrialForm({ ...trialForm, app_slug: e.target.value })}>
                  <option value="">Selecionar app *</option>
                  {apps.map((a) => <option key={a.id} value={a.slug}>{a.name}</option>)}
                </select>
                <input className="input" placeholder="Email" value={trialForm.email} onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })} />
                <input className="input" placeholder="Telefone" value={trialForm.phone} onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })} />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowTrial(false)} className="btn-secondary flex-1">Cancelar</button>
                <button onClick={createTrial} disabled={saving || !trialForm.client_name || !trialForm.app_slug} className="btn-primary flex-1">
                  {saving ? "Criando..." : "Criar Trial"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : licenses.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhuma licença encontrada</div>
        ) : (
          <div className="space-y-2">
            {licenses.map((l) => (
              <div key={l.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">{l.client_name}</p>
                      <span className={statusBadgeClass(l.status)}>{statusLabel(l.status)}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{l.app_name} · {l.type === "permanent" ? "Permanente" : "Temporário"}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(l.start_date)} → {l.end_date ? formatDate(l.end_date) : "Sem expiração"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1.5 mt-3">
                  {(["trial", "active", "blocked"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateStatus(l.id, s)}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        l.status === s
                          ? s === "active" ? "bg-green-500 text-white" : s === "trial" ? "bg-yellow-400 text-white" : "bg-red-400 text-white"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                      )}
                    >
                      {s === "active" ? "✅ Ativo" : s === "trial" ? "🧪 Trial" : "🚫 Bloquear"}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
