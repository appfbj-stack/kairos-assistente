"use client";

import { useEffect, useState } from "react";
import { Brain, Key, Cpu, Trash2, Plus, Save } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";

const MODELS = [
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B (Grátis)" },
  { id: "openai/gpt-4o-mini", label: "GPT-4o Mini" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "anthropic/claude-3-5-haiku", label: "Claude 3.5 Haiku" },
  { id: "anthropic/claude-3-7-sonnet", label: "Claude 3.7 Sonnet" },
  { id: "google/gemini-flash-1.5", label: "Gemini Flash 1.5" },
  { id: "meta-llama/llama-3.1-8b-instruct:free", label: "Llama 3.1 8B (Grátis)" },
];

export default function IAPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [memory, setMemory] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("openai/gpt-oss-120b:free");
  const [saving, setSaving] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  async function load() {
    try {
      const [s, m] = await Promise.all([api.settings.get(), api.memory.list()]);
      setSettings(s);
      setMemory(m);
      setApiKey(s.OPENROUTER_API_KEY || "");
      setModel(s.LLM_MODEL || "openai/gpt-oss-120b:free");
    } catch {}
  }

  useEffect(() => { load(); }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      await Promise.all([
        api.settings.set("OPENROUTER_API_KEY", apiKey),
        api.settings.set("LLM_MODEL", model),
      ]);
      alert("Configurações salvas!");
    } catch (e: any) { alert(e.message); }
    setSaving(false);
  }

  async function addMemory() {
    if (!newKey.trim()) return;
    try {
      await api.memory.save(newKey.trim(), newValue.trim());
      setNewKey(""); setNewValue("");
      await load();
    } catch (e: any) { alert(e.message); }
  }

  async function deleteMemory(id: string) {
    try { await api.memory.delete(id); await load(); } catch {}
  }

  return (
    <AdminShell title="IA & Modelos" onRefresh={load}>
      <div className="space-y-6 max-w-2xl">
        {/* API Key */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-kairos-500" />
            <h2 className="text-sm font-semibold">Configuração do LLM</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">API Key (OpenRouter)</label>
              <input className="input" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-or-v1-..." />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Modelo</label>
              <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
                {MODELS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <button onClick={saveSettings} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={14} />
              {saving ? "Salvando..." : "Salvar Configurações"}
            </button>
          </div>
        </div>

        {/* Memory */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Brain size={16} className="text-kairos-500" />
            <h2 className="text-sm font-semibold">Memória do Assistente</h2>
          </div>

          <div className="flex gap-2 mb-4">
            <input className="input flex-1" placeholder="Chave" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <input className="input flex-1" placeholder="Valor" value={newValue} onChange={(e) => setNewValue(e.target.value)} />
            <button onClick={addMemory} className="btn-primary px-3">
              <Plus size={16} />
            </button>
          </div>

          {memory.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Nenhuma memória armazenada</p>
          ) : (
            <div className="space-y-2">
              {memory.map((item) => (
                <div key={item.id} className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-28 truncate">{item.key}</span>
                  <span className="text-xs text-gray-500 flex-1 truncate">{item.value}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">{item.category}</span>
                  <button onClick={() => deleteMemory(item.id)} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}
