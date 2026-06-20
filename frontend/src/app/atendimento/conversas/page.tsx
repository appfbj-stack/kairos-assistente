"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Search, Filter, MessageCircle, Clock, CheckCircle } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";

export default function ConversasPage() {
  const [empresaId, setEmpresaId] = useState("");
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const eid = localStorage.getItem("empresa_id") || "";
    setEmpresaId(eid);
    if (eid) load(eid);
    else setLoading(false);
  }, []);

  async function load(eid: string) {
    setLoading(true);
    try {
      const params: any = {};
      if (filter) params.status = filter;
      setConversations(await api.atendimento.conversations.list(eid, params));
    } catch {}
    setLoading(false);
  }

  async function openConversation(conv: any) {
    setSelected(conv);
    try {
      const data = await api.atendimento.conversations.get(empresaId, conv.id);
      setMessages(data.messages || []);
    } catch {}
  }

  async function closeConversation(convId: string) {
    try {
      await api.atendimento.conversations.update(empresaId, convId, { status: "closed" });
      setSelected(null);
      load(empresaId);
    } catch {}
  }

  return (
    <AdminShell title="Conversas" onRefresh={() => empresaId && load(empresaId)}>
      {!empresaId ? (
        <div className="p-8 text-center text-gray-400 text-sm">Selecione uma empresa</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1 card overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-2.5 top-2.5 text-gray-400" />
                  <input className="input pl-8 text-sm" placeholder="Buscar..." />
                </div>
              </div>
              <div className="flex gap-1">
                {["", "active", "waiting", "closed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => { setFilter(s); load(empresaId); }}
                    className={`px-2 py-1 text-xs rounded ${filter === s ? "bg-kairos-500 text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"}`}
                  >
                    {s || "Todas"}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[70vh] overflow-y-auto">
              {conversations.map((c: any) => (
                <div
                  key={c.id}
                  onClick={() => openConversation(c)}
                  className={`px-3 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${selected?.id === c.id ? "bg-kairos-50 dark:bg-kairos-900/20" : ""}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${c.status === "active" ? "bg-green-400" : c.status === "waiting" ? "bg-yellow-400" : "bg-gray-400"}`} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1 truncate">{c.visitor_name || "Visitante"}</span>
                    <span className="text-xs text-gray-400">{c.channel}</span>
                  </div>
                  <p className="text-xs text-gray-500 truncate pl-4">{c.last_message || "Sem mensagens"}</p>
                </div>
              ))}
              {conversations.length === 0 && (
                <div className="p-6 text-center text-gray-400 text-sm">Nenhuma conversa</div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 card flex flex-col">
            {!selected ? (
              <div className="flex items-center justify-center h-60 text-gray-400 text-sm">
                Selecione uma conversa
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {selected.visitor_name || "Visitante"}
                    </h3>
                    {selected.visitor_phone && (
                      <p className="text-xs text-gray-400">{selected.visitor_phone}</p>
                    )}
                  </div>
                  {selected.status !== "closed" && (
                    <button onClick={() => closeConversation(selected.id)} className="btn-secondary text-xs">
                      Encerrar
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[60vh]">
                  {messages.map((m: any) => (
                    <div key={m.id} className={`flex ${m.role === "visitor" ? "justify-start" : "justify-end"}`}>
                      <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        m.role === "visitor"
                          ? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                          : m.role === "assistant"
                          ? "bg-kairos-500 text-white"
                          : "bg-blue-100 dark:bg-blue-900/30 text-gray-800 dark:text-gray-200"
                      }`}>
                        <p className="text-xs opacity-60 mb-1">{m.role === "visitor" ? "Visitante" : m.role === "assistant" ? "Assistente" : "Agente"}</p>
                        <p>{m.content}</p>
                        <p className="text-xs opacity-40 mt-1">{m.created_at?.slice(11, 19)}</p>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-gray-400 text-sm">Nenhuma mensagem</div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </AdminShell>
  );
}
