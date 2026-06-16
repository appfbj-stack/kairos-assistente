"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Check, Clock } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import clsx from "clsx";

type AgendaItem = { id: string; title: string; description: string; date_time: string; status: string };

export default function AgendaPage() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");

  async function load() {
    setLoading(true);
    try { setItems(await api.agenda.list()); } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function add() {
    if (!title.trim()) return;
    try {
      await api.agenda.create(title.trim(), "", date || undefined);
      setTitle(""); setDate("");
      load();
    } catch {}
  }

  async function toggle(item: AgendaItem) {
    const newStatus = item.status === "done" ? "pending" : "done";
    try { await api.agenda.update(item.id, { status: newStatus }); load(); } catch {}
  }

  async function remove(id: string) {
    try { await api.agenda.delete(id); load(); } catch {}
  }

  const pending = items.filter((i) => i.status !== "done");
  const done = items.filter((i) => i.status === "done");

  return (
    <AdminShell title="Agenda" onRefresh={load}>
      <div className="space-y-4 max-w-2xl">
        {/* Add form */}
        <div className="card p-4 flex gap-2">
          <input
            className="input flex-1"
            placeholder="Novo compromisso..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <input type="datetime-local" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
          <button onClick={add} disabled={!title.trim()} className="btn-primary px-3 flex-shrink-0">
            <Plus size={16} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {pending.length === 0 && done.length === 0 && (
              <div className="text-center text-gray-400 py-10">Nenhum compromisso</div>
            )}

            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pendentes</p>
                {pending.map((item) => (
                  <div key={item.id} className="card p-3 flex items-center gap-3">
                    <button onClick={() => toggle(item)} className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 flex items-center justify-center hover:border-kairos-400 transition-colors" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-200">{item.title}</p>
                      {item.date_time && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={11} />{new Date(item.date_time).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}

            {done.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Concluídos</p>
                {done.map((item) => (
                  <div key={item.id} className="card p-3 flex items-center gap-3 opacity-60">
                    <button onClick={() => toggle(item)} className="w-5 h-5 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </button>
                    <p className="text-sm text-gray-500 line-through flex-1 truncate">{item.title}</p>
                    <button onClick={() => remove(item.id)} className="text-gray-300 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AdminShell>
  );
}
