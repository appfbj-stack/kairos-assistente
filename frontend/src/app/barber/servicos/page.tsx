"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, Scissors } from "lucide-react";
import BarberShell from "@/components/BarberShell";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { barberApi } from "@/services/barberApi";
import { formatCurrency } from "@/lib/utils";

export default function BarberServicosPage() {
  const { user, ready, logout } = useBarberAuth();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", duration_minutes: 30, price: 0 });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      setServices(await barberApi.services.list(user.empresa_id));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await barberApi.services.update(editId, form);
      } else {
        await barberApi.services.create({ ...form, empresa_id: user.empresa_id });
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: "", duration_minutes: 30, price: 0 });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    try {
      await barberApi.services.delete(id);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function startEdit(s: any) {
    setForm({ name: s.name, duration_minutes: s.duration_minutes, price: s.price });
    setEditId(s.id);
    setShowForm(true);
  }

  if (!ready) return null;

  return (
    <BarberShell
      title="Serviços"
      onRefresh={load}
      onLogout={logout}
      actions={
        <button
          onClick={() => {
            setEditId(null);
            setForm({ name: "", duration_minutes: 30, price: 0 });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Novo
        </button>
      }
    >
      <div className="space-y-4">
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="card w-full max-w-md p-5">
              <h2 className="text-base font-semibold mb-4">{editId ? "Editar Serviço" : "Novo Serviço"}</h2>
              <div className="space-y-3">
                <input
                  className="input"
                  placeholder="Nome do serviço *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Duração (minutos)"
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
                />
                <input
                  className="input"
                  placeholder="Preço (R$)"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving || !form.name.trim()} className="btn-primary flex-1">
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum serviço cadastrado</div>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-kairos-50 text-kairos-600 dark:bg-kairos-900/30 dark:text-kairos-400">
                  <Scissors size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-gray-400">
                    {s.duration_minutes} min · {formatCurrency(s.price)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(s)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </BarberShell>
  );
}
