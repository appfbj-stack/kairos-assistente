"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, Edit2, UserCog } from "lucide-react";
import BarberShell from "@/components/BarberShell";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { barberApi } from "@/services/barberApi";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const emptyForm = {
  name: "",
  phone: "",
  working_days: "1,2,3,4,5,6",
  working_start: "09:00",
  working_end: "19:00",
};

export default function BarberProfissionaisPage() {
  const { user, ready, logout } = useBarberAuth();
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      setProfessionals(await barberApi.professionals.list(user.empresa_id));
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready]);

  function toggleDay(day: number) {
    const days = form.working_days.split(",").filter(Boolean).map(Number);
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setForm({ ...form, working_days: next.sort().join(",") });
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await barberApi.professionals.update(editId, form);
      } else {
        await barberApi.professionals.create({ ...form, empresa_id: user.empresa_id });
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este profissional?")) return;
    try {
      await barberApi.professionals.delete(id);
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function startEdit(p: any) {
    setForm({
      name: p.name,
      phone: p.phone || "",
      working_days: p.working_days,
      working_start: p.working_start,
      working_end: p.working_end,
    });
    setEditId(p.id);
    setShowForm(true);
  }

  if (!ready) return null;

  return (
    <BarberShell
      title="Profissionais"
      onRefresh={load}
      onLogout={logout}
      actions={
        <button
          onClick={() => {
            setEditId(null);
            setForm(emptyForm);
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
              <h2 className="text-base font-semibold mb-4">{editId ? "Editar Profissional" : "Novo Profissional"}</h2>
              <div className="space-y-3">
                <input
                  className="input"
                  placeholder="Nome *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Telefone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
                <div>
                  <p className="text-xs text-gray-400 mb-1.5">Dias de trabalho</p>
                  <div className="flex gap-1.5">
                    {WEEKDAY_LABELS.map((label, idx) => {
                      const active = form.working_days.split(",").map(Number).includes(idx);
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => toggleDay(idx)}
                          className={`w-9 h-9 rounded-lg text-xs font-medium transition-colors ${
                            active
                              ? "bg-kairos-500 text-white"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex gap-3">
                  <input
                    className="input"
                    placeholder="Início"
                    type="time"
                    value={form.working_start}
                    onChange={(e) => setForm({ ...form, working_start: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Fim"
                    type="time"
                    value={form.working_end}
                    onChange={(e) => setForm({ ...form, working_end: e.target.value })}
                  />
                </div>
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
        ) : professionals.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum profissional cadastrado</div>
        ) : (
          <div className="space-y-2">
            {professionals.map((p) => (
              <div key={p.id} className="card p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 bg-kairos-50 text-kairos-600 dark:bg-kairos-900/30 dark:text-kairos-400">
                  <UserCog size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white">{p.name}</p>
                  <p className="text-xs text-gray-400">
                    {p.working_days
                      .split(",")
                      .map((d: string) => WEEKDAY_LABELS[Number(d)])
                      .join(", ")}{" "}
                    · {p.working_start}–{p.working_end}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(p)} className="p-1.5 text-gray-400 hover:text-kairos-500 rounded">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => remove(p.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
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
