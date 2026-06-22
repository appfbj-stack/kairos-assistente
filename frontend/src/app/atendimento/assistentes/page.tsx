"use client";

import { useEffect, useState } from "react";
import { Bot, Plus, Edit2, Trash2, ExternalLink, Copy, Check } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";

const SEGMENTS = [
  "Igreja", "Clínica", "Barbearia", "Oficina Mecânica",
  "Advocacia", "Imobiliária", "Restaurante", "Loja", "Serviços", "Outro"
];

const TONES = ["Formal", "Informal", "Amigável", "Profissional", "Descontraído"];

export default function AssistentesPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [slug, setSlug] = useState("");
  const [assistants, setAssistants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name: "Assistente Virtual",
    personality: "Você é um assistente virtual amigável e prestativo.",
    goal: "Ajudar clientes com suas dúvidas e necessidades.",
    tone: "Amigável",
    segment: "Outro",
    welcome_message: "Olá! Como posso ajudá-lo hoje?",
    avatar_url: "",
  });

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    const s = localStorage.getItem("empresa_slug") || "";
    setEmpresaId(eid);
    setSlug(s);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      setAssistants(await api.atendimento.assistants.list(eid));
    } catch {}
    setLoading(false);
  }

  function resetForm() {
    setForm({
      name: "Assistente Virtual",
      personality: "Você é um assistente virtual amigável e prestativo.",
      goal: "Ajudar clientes com suas dúvidas e necessidades.",
      tone: "Amigável",
      segment: "Outro",
      welcome_message: "Olá! Como posso ajudá-lo hoje?",
      avatar_url: "",
    });
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        await api.atendimento.assistants.update(empresaId, editId, form);
      } else {
        await api.atendimento.assistants.create(empresaId, form);
      }
      setShowForm(false);
      setEditId(null);
      resetForm();
      load(empresaId);
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  function startEdit(a: any) {
    setForm({
      name: a.name || "",
      personality: a.personality || "",
      goal: a.goal || "",
      tone: a.tone || "Amigável",
      segment: a.segment || "Outro",
      welcome_message: a.welcome_message || "",
      avatar_url: a.avatar_url || "",
    });
    setEditId(a.id);
    setShowForm(true);
  }

  async function remove(id: string) {
    if (!confirm("Excluir este assistente?")) return;
    try { await api.atendimento.assistants.delete(empresaId, id); load(empresaId); } catch {}
  }

  const chatUrl = slug
    ? typeof window !== "undefined"
      ? window.location.origin + "/assistente/" + slug
      : ""
    : "";

  function copyUrl() {
    if (chatUrl) {
      navigator.clipboard.writeText(chatUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <AdminShell
      title="Assistentes IA"
      onRefresh={() => empresaId && load(empresaId)}
      actions={
        <button
          onClick={() => { setEditId(null); resetForm(); setShowForm(true); }}
          className="btn-primary text-sm"
        >
          <Plus size={14} className="mr-1" /> Novo Assistente
        </button>
      }
    >
      {!empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>
      ) : (
        <div className="space-y-4">
          {chatUrl && (
            <div className="card p-4 flex items-center justify-between gap-3 border border-kairos-500/30">
              <div>
                <p className="text-xs text-gray-400 mb-1">URL do Chat Público</p>
                <p className="text-sm font-mono text-kairos-400 break-all">{chatUrl}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button onClick={copyUrl} className="btn-icon" title="Copiar URL">
                  {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                </button>
                <a href={chatUrl} target="_blank" rel="noopener noreferrer" className="btn-icon" title="Abrir chat">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          )}

          {showForm && (
            <div className="card p-5 border border-kairos-500/30">
              <h3 className="text-sm font-semibold mb-4">{editId ? "Editar Assistente" : "Novo Assistente"}</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Nome</label>
                    <input className="input w-full" value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label className="label">Segmento</label>
                    <select className="input w-full" value={form.segment}
                      onChange={(e) => setForm({ ...form, segment: e.target.value })}>
                      {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="label">Tom de Voz</label>
                  <select className="input w-full" value={form.tone}
                    onChange={(e) => setForm({ ...form, tone: e.target.value })}>
                    {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Personalidade / Persona</label>
                  <textarea className="input w-full h-20 resize-none" value={form.personality}
                    onChange={(e) => setForm({ ...form, personality: e.target.value })} />
                </div>
                <div>
                  <label className="label">Objetivo</label>
                  <textarea className="input w-full h-16 resize-none" value={form.goal}
                    onChange={(e) => setForm({ ...form, goal: e.target.value })} />
                </div>
                <div>
                  <label className="label">Mensagem de Boas-vindas</label>
                  <textarea className="input w-full h-16 resize-none" value={form.welcome_message}
                    onChange={(e) => setForm({ ...form, welcome_message: e.target.value })} />
                </div>
                <div>
                  <label className="label">URL do Avatar (opcional)</label>
                  <input className="input w-full" placeholder="https://..." value={form.avatar_url}
                    onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} />
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={save} disabled={saving} className="btn-primary text-sm">
                    {saving ? "Salvando..." : editId ? "Atualizar" : "Criar Assistente"}
                  </button>
                  <button onClick={() => { setShowForm(false); setEditId(null); resetForm(); }}
                    className="btn-secondary text-sm">Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-6 h-6 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : assistants.length === 0 ? (
            <div className="card p-8 text-center space-y-3">
              <Bot size={32} className="mx-auto text-gray-400" />
              <p className="text-sm text-gray-400">Nenhum assistente criado ainda</p>
              <button onClick={() => setShowForm(true)} className="btn-primary text-sm">
                <Plus size={14} className="mr-1" /> Criar Primeiro Assistente
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {assistants.map((a: any) => (
                <div key={a.id} className="card p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-kairos-500/20 flex items-center justify-center">
                        <Bot size={16} className="text-kairos-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{a.name}</h3>
                        <p className="text-xs text-gray-400">{a.segment} · {a.tone || "Amigável"}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(a)} className="btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => remove(a.id)} className="btn-icon text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  {a.welcome_message && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic truncate">
                      "{a.welcome_message}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AdminShell>
  );
}
