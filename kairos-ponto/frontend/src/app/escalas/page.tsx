"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { Plus } from "lucide-react";

const EMPTY = {
  nome: "",
  tipo: "5x2",
  horario_entrada: "08:00",
  horario_saida: "17:00",
  intervalo_minutos: 60,
  tolerancia_minutos: 10,
  carga_diaria_minutos: 480,
  dias_trabalho: "1,2,3,4,5",
};

export default function EscalasPage() {
  const [lista, setLista] = useState<any[]>([]);
  const [form, setForm] = useState<any>(EMPTY);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      setLista(await api.escalas.list());
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api.escalas.create(form);
      setOpen(false);
      setForm(EMPTY);
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Shell title="Escalas" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA"]}>
      <div className="mb-4 flex justify-end">
        <button className="btn-primary" onClick={() => setOpen(!open)}>
          <Plus size={16} /> Nova escala
        </button>
      </div>
      {error && <p className="mb-3 text-sm text-red-500">{error}</p>}

      {open && (
        <form onSubmit={salvar} className="card mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="col-span-2">
            <label className="label">Nome *</label>
            <input className="input" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required />
          </div>
          <div>
            <label className="label">Tipo</label>
            <select className="input" value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              <option value="5x2">5x2</option>
              <option value="6x1">6x1</option>
              <option value="12x36">12x36</option>
              <option value="personalizada">Personalizada</option>
            </select>
          </div>
          <div>
            <label className="label">Dias (1=seg…7=dom)</label>
            <input className="input" value={form.dias_trabalho} onChange={(e) => setForm({ ...form, dias_trabalho: e.target.value })} />
          </div>
          <div>
            <label className="label">Entrada</label>
            <input type="time" className="input" value={form.horario_entrada} onChange={(e) => setForm({ ...form, horario_entrada: e.target.value })} />
          </div>
          <div>
            <label className="label">Saída</label>
            <input type="time" className="input" value={form.horario_saida} onChange={(e) => setForm({ ...form, horario_saida: e.target.value })} />
          </div>
          <div>
            <label className="label">Intervalo (min)</label>
            <input type="number" className="input" value={form.intervalo_minutos} onChange={(e) => setForm({ ...form, intervalo_minutos: +e.target.value })} />
          </div>
          <div>
            <label className="label">Tolerância (min)</label>
            <input type="number" className="input" value={form.tolerancia_minutos} onChange={(e) => setForm({ ...form, tolerancia_minutos: +e.target.value })} />
          </div>
          <div>
            <label className="label">Carga diária (min)</label>
            <input type="number" className="input" value={form.carga_diaria_minutos} onChange={(e) => setForm({ ...form, carga_diaria_minutos: +e.target.value })} />
          </div>
          <div className="col-span-full flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button className="btn-primary">Salvar</button>
          </div>
        </form>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {lista.map((e) => (
          <div key={e.id} className="card">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">{e.nome}</h3>
              <span className="badge bg-primary/10 text-primary">{e.tipo}</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              {e.horario_entrada} – {e.horario_saida} · intervalo {e.intervalo_minutos}min
            </p>
            <p className="text-xs text-slate-400">
              Tolerância {e.tolerancia_minutos}min · carga {Math.round(e.carga_diaria_minutos / 60)}h/dia · dias {e.dias_trabalho || "—"}
            </p>
          </div>
        ))}
        {!lista.length && <p className="text-slate-400">Nenhuma escala cadastrada.</p>}
      </div>
    </Shell>
  );
}
