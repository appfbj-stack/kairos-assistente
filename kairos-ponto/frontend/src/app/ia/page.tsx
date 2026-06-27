"use client";

import { useState } from "react";
import Shell from "@/components/Shell";
import { api } from "@/services/api";
import { Bot, Send, Sparkles } from "lucide-react";

export default function IaPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState("");

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;
    const userMsg = input;
    setMessages((m) => [...m, { role: "user", content: userMsg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.ia.chat(userMsg);
      setMessages((m) => [...m, { role: "assistant", content: res.message }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Erro: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  async function gerarInsights() {
    setLoading(true);
    try {
      const res = await api.ia.insights();
      setInsights(res.insights);
    } catch (err: any) {
      setInsights(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Shell title="IA Kairos" allowedRoles={["SUPER_ADMIN", "ADMIN_EMPRESA", "SUPERVISOR"]}>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card lg:col-span-2 flex h-[70vh] flex-col">
          <div className="flex-1 space-y-3 overflow-auto">
            {!messages.length && (
              <div className="flex h-full flex-col items-center justify-center text-center text-slate-400">
                <Bot size={40} className="mb-2" />
                <p>Pergunte sobre atrasos, faltas, horas extras, escalas…</p>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm ${
                    m.role === "user" ? "bg-primary text-white" : "bg-slate-100 dark:bg-slate-800"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <p className="text-sm text-slate-400">Pensando…</p>}
          </div>
          <form onSubmit={enviar} className="mt-3 flex gap-2">
            <input className="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Digite sua pergunta…" />
            <button className="btn-primary" disabled={loading}>
              <Send size={16} />
            </button>
          </form>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles size={16} className="text-primary" /> Insights automáticos
            </h2>
            <button className="btn-ghost text-xs" onClick={gerarInsights} disabled={loading}>
              Gerar
            </button>
          </div>
          {insights ? (
            <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{insights}</p>
          ) : (
            <p className="text-sm text-slate-400">Clique em "Gerar" para análise automática dos dados.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}
