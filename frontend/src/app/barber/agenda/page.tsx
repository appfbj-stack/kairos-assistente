"use client";

import { useEffect, useState } from "react";
import { Plus, Clock, User, Scissors } from "lucide-react";
import BarberShell from "@/components/BarberShell";
import { useBarberAuth } from "@/hooks/use-barber-auth";
import { barberApi } from "@/services/barberApi";
import { formatCurrency } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
  faltou: "Faltou",
};

const STATUS_CLASSES: Record<string, string> = {
  agendado: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
  confirmado: "bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400",
  concluido: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
  cancelado: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
  faltou: "bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400",
};

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function BarberAgendaPage() {
  const { user, ready, logout } = useBarberAuth();
  const [date, setDate] = useState(todayStr());
  const [appointments, setAppointments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [form, setForm] = useState({ client_id: "", professional_id: "", service_id: "", time: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!user?.empresa_id) return;
    setLoading(true);
    try {
      const [appts, clis, profs, servs] = await Promise.all([
        barberApi.appointments.list(user.empresa_id, { from: `${date}T00:00:00`, to: `${date}T23:59:59` }),
        barberApi.clients.list(user.empresa_id),
        barberApi.professionals.list(user.empresa_id),
        barberApi.services.list(user.empresa_id),
      ]);
      setAppointments(appts);
      setClients(clis);
      setProfessionals(profs);
      setServices(servs);
    } catch {}
    setLoading(false);
  }

  useEffect(() => {
    if (ready) load();
  }, [ready, date]);

  useEffect(() => {
    async function loadSlots() {
      if (!user?.empresa_id || !form.professional_id || !form.service_id) {
        setSlots([]);
        return;
      }
      try {
        const res = await barberApi.appointments.disponibilidade(user.empresa_id, form.professional_id, date, form.service_id);
        setSlots(res.slots || []);
      } catch {
        setSlots([]);
      }
    }
    if (showForm) loadSlots();
  }, [form.professional_id, form.service_id, date, showForm]);

  async function save() {
    if (!form.client_id || !form.professional_id || !form.service_id || !form.time) return;
    setSaving(true);
    try {
      await barberApi.appointments.create({
        empresa_id: user.empresa_id,
        client_id: form.client_id,
        professional_id: form.professional_id,
        service_id: form.service_id,
        scheduled_at: `${date}T${form.time}:00`,
      });
      setShowForm(false);
      setForm({ client_id: "", professional_id: "", service_id: "", time: "" });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
    setSaving(false);
  }

  async function setStatus(id: string, status: string) {
    try {
      await barberApi.appointments.update(id, { status });
      await load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (!ready) return null;

  return (
    <BarberShell
      title="Agenda"
      onRefresh={load}
      onLogout={logout}
      actions={
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Novo
        </button>
      }
    >
      <div className="space-y-4">
        <input type="date" className="input max-w-[180px]" value={date} onChange={(e) => setDate(e.target.value)} />

        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="card w-full max-w-md p-5">
              <h2 className="text-base font-semibold mb-4">Novo Agendamento — {date}</h2>
              <div className="space-y-3">
                <select className="input" value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                  <option value="">Cliente *</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={form.professional_id}
                  onChange={(e) => setForm({ ...form, professional_id: e.target.value, time: "" })}
                >
                  <option value="">Profissional *</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={form.service_id}
                  onChange={(e) => setForm({ ...form, service_id: e.target.value, time: "" })}
                >
                  <option value="">Serviço *</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.duration_minutes}min)
                    </option>
                  ))}
                </select>
                {form.professional_id && form.service_id && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1.5">Horário disponível</p>
                    {slots.length === 0 ? (
                      <p className="text-xs text-gray-400">Nenhum horário livre nesta data</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                        {slots.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => setForm({ ...form, time: s })}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              form.time === s ? "bg-kairos-500 text-white" : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  onClick={save}
                  disabled={saving || !form.client_id || !form.professional_id || !form.service_id || !form.time}
                  className="btn-primary flex-1"
                >
                  {saving ? "Salvando..." : "Agendar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center text-gray-400 py-10">Nenhum agendamento nesta data</div>
        ) : (
          <div className="space-y-2">
            {appointments.map((a: any) => (
              <div key={a.id} className="card p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 text-center flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{String(a.scheduled_at).slice(11, 16)}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-gray-900 dark:text-white">{a.client_name}</p>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <User size={11} /> {a.professional_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Scissors size={11} /> {a.service_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {a.duration_minutes}min · {formatCurrency(a.price)}
                      </span>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASSES[a.status]}`}>
                    {STATUS_LABELS[a.status]}
                  </span>
                </div>
                {!["concluido", "cancelado"].includes(a.status) && (
                  <div className="flex gap-2 mt-3 pl-[60px]">
                    {a.status === "agendado" && (
                      <button onClick={() => setStatus(a.id, "confirmado")} className="btn-secondary text-xs px-2 py-1">
                        Confirmar
                      </button>
                    )}
                    <button onClick={() => setStatus(a.id, "concluido")} className="btn-secondary text-xs px-2 py-1">
                      Concluir
                    </button>
                    <button onClick={() => setStatus(a.id, "faltou")} className="btn-secondary text-xs px-2 py-1">
                      Faltou
                    </button>
                    <button onClick={() => setStatus(a.id, "cancelado")} className="btn-danger text-xs px-2 py-1">
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BarberShell>
  );
}
