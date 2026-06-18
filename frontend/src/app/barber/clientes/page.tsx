"use client";

import { useEffect, useState } from "react";
import { Plus, Edit2, Search, Phone, Mail } from "lucide-react";
import BarberShell from "@/components/BarberShell";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { barberApi } from "@/services/barberApi";

export default function BarberClientesPage() {
  const { user, ready, logout } = useBarberAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      setClients(await barberApi.clients.list(user.empresa_id));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  async function save() {
    if (!form.name.trim() || !form.phone.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await barberApi.clients.update(editId, form);
      } else {
        await barberApi.clients.create({ ...form, empresa_id: user.empresa_id });
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: "", phone: "", email: "", notes: "" });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  }

  function startEdit(c: any) {
    setForm({ name: c.name, phone: c.phone, email: c.email || "", notes: c.notes || "" });
    setEditId(c.id);
    setShowForm(true);
  }

  const filtered = clients.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  if (!ready) return null;

  return (
    <BarberShell
      title="Clientes"
      onRefresh={load}
      onLogout={logout}
      actions={
        <button
          onClick={() => {
            setEditId(null);
            setForm({ name: "", phone: "", email: "", notes: "" });
            setShowForm(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={16} /> Novo
        </button>
      }
    >
      <div className="space-y-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nome ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="card w-full max-w-md p-5">
              <h2 className="text-base font-semibold mb-4">{editId ? "Editar Cliente" : "Novo Cliente"}</h2>
              <div className="space-y-3">
                <input
                  className="input"
                  placeholder="Nome *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Telefone *"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Observações"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button onClick={save} disabled={saving || !form.name.trim() || !form.phone.trim()} className="btn-primary flex-1">
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
        ) : filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            {search ? "Nenhum resultado encontrado" : "Nenhum cliente cadastrado"}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((c) => (
              <div key={c.id} className="card p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{c.name}</p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Phone size={11} />
                      {c.phone}
                    </span>
                    {c.email && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Mail size={11} />
                        {c.email}
                      </span>
                    )}
                  </div>
                  {c.notes && <p className="text-xs text-gray-400 mt-1">{c.notes}</p>}
                </div>
                <button onClick={() => startEdit(c)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded">
                  <Edit2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </BarberShell>
  );
}
