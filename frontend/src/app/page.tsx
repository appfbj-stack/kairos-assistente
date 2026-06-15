"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api } from "@/services/api";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";
import { Mic, MicOff, Send, Calendar, Settings, Trash2, MessageSquare, Volume2, VolumeX, Plus, X, Check, Clock, Shield } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
};

type AgendaItem = {
  id: string;
  title: string;
  description: string;
  date_time: string;
  status: string;
};

type MemoryItem = {
  id: string;
  key: string;
  value: string;
  category: string;
};

type PageTab = "chat" | "agenda" | "settings" | "admin";

export default function Home() {
  const [tab, setTab] = useState<PageTab>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, startListening, stopListening, error: sttError } = useSpeechToText();
  const { isSpeaking, speak, stop } = useTextToSpeech();

  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [memoryItems, setMemoryItems] = useState<MemoryItem[]>([]);
  const [settingsData, setSettingsData] = useState<Record<string, string>>({});

  const [newAgendaTitle, setNewAgendaTitle] = useState("");
  const [newAgendaDate, setNewAgendaDate] = useState("");

  const [newMemoryKey, setNewMemoryKey] = useState("");
  const [newMemoryValue, setNewMemoryValue] = useState("");

  const [llmKey, setLlmKey] = useState("");

  // Admin state
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminClients, setAdminClients] = useState<any[]>([]);
  const [adminApps, setAdminApps] = useState<any[]>([]);
  const [adminLicenses, setAdminLicenses] = useState<any[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [newClientName, setNewClientName] = useState("");
  const [newClientCategory, setNewClientCategory] = useState("Outros");
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  function adminApi() {
    const host = typeof window !== "undefined" ? window.location.hostname : "backend";
    const base = `http://${host}:3010/api`;
    return {
      get: (p: string) => fetch(`${base}${p}`).then((r) => r.json()),
      post: (p: string, d: any) => fetch(`${base}${p}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) }).then((r) => r.json()),
      del: (p: string) => fetch(`${base}${p}`, { method: "DELETE" }).then((r) => r.json()),
    };
  }

  async function loadAdmin() {
    const a = adminApi();
    try { setAdminStats(await a.get("/admin/stats")); } catch {}
    try { setAdminClients(await a.get("/admin/clients")); } catch {}
    try { setAdminApps(await a.get("/admin/apps")); } catch {}
    try { setAdminLicenses(await a.get("/license/list")); } catch {}
    try { setAdminLogs(await a.get("/admin/logs")); } catch {}
  }

  async function createAdminClient() {
    if (!newClientName) return;
    await adminApi().post("/admin/clients", { name: newClientName, company: newClientCompany, phone: newClientPhone, email: newClientEmail, category: newClientCategory });
    setNewClientName(""); setNewClientCompany(""); setNewClientPhone(""); setNewClientEmail("");
    loadAdmin();
  }

  async function deleteAdminClient(id: string) {
    await adminApi().del(`/admin/clients/${id}`);
    loadAdmin();
  }

  async function createAdminApp() {
    const name = window.prompt("Nome do app:"); if (!name) return;
    const slug = window.prompt("Slug (ex: oficina):"); if (!slug) return;
    await adminApi().post("/admin/apps", { name, slug });
    loadAdmin();
  }

  async function createAdminTrial() {
    const client_name = window.prompt("Nome do cliente:"); if (!client_name) return;
    const app_slug = window.prompt("Slug do app:"); if (!app_slug) return;
    await adminApi().post("/license/create-trial", { client_name, app_slug, company: "", email: "", phone: "" });
    loadAdmin();
  }

  async function activateAdminLicense() {
    const id = window.prompt("ID da licença:"); if (!id) return;
    await adminApi().post("/license/activate", { license_id: id, amount: 0 });
    loadAdmin();
  }

  async function updateLicenseStatus(id: string, status: string) {
    await adminApi().post(`/admin/licenses/${id}/status`, { status });
    loadAdmin();
  }

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => scrollToBottom(), [messages, scrollToBottom]);

  useEffect(() => {
    api.health().catch(() => {});
    loadConversations();
    loadAgenda();
    loadMemory();
    loadSettings();
  }, []);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
      sendMessage(transcript);
    }
  }, [transcript]);

  async function loadConversations() {
    try {
      const list = await api.chat.list();
      setConversations(list);
    } catch {}
  }

  async function loadConversation(id: string) {
    try {
      const data = await api.chat.get(id);
      setConvId(data.id);
      setMessages(data.messages);
      setShowSidebar(false);
    } catch {}
  }

  async function newConversation() {
    setConvId(null);
    setMessages([]);
    setInput("");
    setShowSidebar(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function deleteConversation(id: string) {
    try {
      await api.chat.delete(id);
      if (convId === id) {
        setConvId(null);
        setMessages([]);
      }
      loadConversations();
    } catch {}
  }

  async function sendMessage(msg?: string) {
    const text = msg || input.trim();
    if (!text || loading) return;

    setInput("");
    setLoading(true);

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const data = await api.chat.send(convId, text);
      setConvId(data.conversation_id);
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: data.message };
      setMessages((prev) => [...prev, aiMsg]);
      speak(data.message);
      loadConversations();
    } catch (err: any) {
      const errMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: `Erro: ${err.message}` };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleMicClick() {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }

  async function loadAgenda() {
    try {
      const items = await api.agenda.list();
      setAgendaItems(items);
    } catch {}
  }

  async function addAgenda() {
    if (!newAgendaTitle.trim()) return;
    try {
      await api.agenda.create(newAgendaTitle.trim(), "", newAgendaDate || undefined);
      setNewAgendaTitle("");
      setNewAgendaDate("");
      loadAgenda();
    } catch {}
  }

  async function toggleAgendaStatus(item: AgendaItem) {
    const newStatus = item.status === "done" ? "pending" : "done";
    try {
      await api.agenda.update(item.id, { status: newStatus });
      loadAgenda();
    } catch {}
  }

  async function deleteAgenda(id: string) {
    try {
      await api.agenda.delete(id);
      loadAgenda();
    } catch {}
  }

  async function loadMemory() {
    try {
      const items = await api.memory.list();
      setMemoryItems(items);
    } catch {}
  }

  async function addMemory() {
    if (!newMemoryKey.trim()) return;
    try {
      await api.memory.save(newMemoryKey.trim(), newMemoryValue.trim());
      setNewMemoryKey("");
      setNewMemoryValue("");
      loadMemory();
    } catch {}
  }

  async function deleteMemory(id: string) {
    try {
      await api.memory.delete(id);
      loadMemory();
    } catch {}
  }

  async function loadSettings() {
    try {
      const data = await api.settings.get();
      setSettingsData(data);
      setLlmKey(data.OPENROUTER_API_KEY || "");
    } catch {}
  }

  async function saveSetting(key: string, value: string) {
    try {
      await api.settings.set(key, value);
      setSettingsData((prev) => ({ ...prev, [key]: value }));
    } catch {}
  }

  const chatBubble = (msg: Message) => (
    <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-3`}>
      <div className={msg.role === "user" ? "message-user" : "message-assistant"}>
        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
        {msg.role === "assistant" && (
          <button
            onClick={() => (isSpeaking ? stop() : speak(msg.content))}
            className="mt-1 text-gray-400 hover:text-kairos-500 transition-colors"
          >
            {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-kairos-500 text-white px-4 py-3 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSidebar(!showSidebar)} className="btn-icon !w-8 !h-8">
            <MessageSquare size={20} />
          </button>
          <h1 className="text-lg font-semibold">Kairos</h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => { setTab("admin"); loadAdmin(); }} className={`btn-icon !w-10 !h-10 ${tab === "admin" ? "bg-white/20" : ""}`}><Shield size={18} /></button>
          <button onClick={() => setTab("agenda")} className={`btn-icon !w-10 !h-10 ${tab === "agenda" ? "bg-white/20" : ""}`}>
            <Calendar size={20} />
          </button>
          <button onClick={() => setTab("settings")} className={`btn-icon !w-10 !h-10 ${tab === "settings" ? "bg-white/20" : ""}`}>
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      {showSidebar && (
        <div className="absolute inset-0 z-20 flex">
          <div className="w-72 bg-white shadow-xl h-full flex flex-col">
            <div className="p-3 border-b flex items-center justify-between">
              <span className="font-semibold text-gray-700">Conversas</span>
              <button onClick={() => setShowSidebar(false)} className="btn-icon !w-8 !h-8">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button onClick={newConversation} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-600 mb-2">
                <Plus size={16} /> Nova conversa
              </button>
              {conversations.map((c) => (
                <div key={c.id} className="flex items-center group">
                  <button onClick={() => loadConversation(c.id)} className="flex-1 text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm truncate">
                    {c.title}
                  </button>
                  <button onClick={() => deleteConversation(c.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setShowSidebar(false)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === "chat" && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <MessageSquare size={48} className="mb-3 opacity-30" />
                  <p className="text-sm">Como posso ajudar?</p>
                </div>
              )}
              {messages.map(chatBubble)}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="message-assistant">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
              {sttError && (
                <div className="text-center text-red-400 text-xs py-1">{sttError}</div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t bg-white">
              <div className="flex items-center gap-2">
                <button onClick={handleMicClick} className={`btn-icon ${isListening ? "bg-red-500 text-white shadow-lg" : "text-gray-500 hover:bg-gray-100"}`}>
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                  placeholder={isListening ? "Ouvindo..." : "Digite sua mensagem..."}
                  className="flex-1 px-4 py-2.5 bg-gray-50 rounded-full text-sm outline-none focus:ring-2 focus:ring-kairos-300"
                />
                <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn-icon bg-kairos-500 text-white hover:bg-kairos-600 disabled:opacity-40 shadow-sm">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === "agenda" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={newAgendaTitle}
                  onChange={(e) => setNewAgendaTitle(e.target.value)}
                  placeholder="Novo compromisso..."
                  className="flex-1 px-3 py-2 rounded-lg border text-sm"
                />
                <input
                  type="datetime-local"
                  value={newAgendaDate}
                  onChange={(e) => setNewAgendaDate(e.target.value)}
                  className="px-2 py-2 rounded-lg border text-sm"
                />
                <button onClick={addAgenda} className="btn-icon bg-kairos-500 text-white !w-10 !h-10">
                  <Plus size={18} />
                </button>
              </div>

              {agendaItems.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-10">Nenhum compromisso</p>
              )}

              <div className="space-y-2">
                {agendaItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 bg-white p-3 rounded-xl shadow-sm border">
                    <button onClick={() => toggleAgendaStatus(item)} className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${item.status === "done" ? "bg-green-500 border-green-500" : "border-gray-300"}`}>
                      {item.status === "done" && <Check size={14} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${item.status === "done" ? "line-through text-gray-400" : "text-gray-700"}`}>{item.title}</p>
                      {item.date_time && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock size={12} /> {new Date(item.date_time).toLocaleString("pt-BR")}
                        </p>
                      )}
                    </div>
                    <button onClick={() => deleteAgenda(item.id)} className="text-red-300 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "admin" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {adminStats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-3 rounded-xl shadow-sm border"><p className="text-xl font-bold text-kairos-500">{adminStats.total_clients}</p><p className="text-xs text-gray-500">Clientes</p></div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border"><p className="text-xl font-bold text-kairos-500">{adminStats.total_licenses}</p><p className="text-xs text-gray-500">Licenças</p></div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border"><p className="text-xl font-bold text-green-500">{adminStats.active_licenses}</p><p className="text-xs text-gray-500">Ativas</p></div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border"><p className="text-xl font-bold text-yellow-500">{adminStats.trial_licenses}</p><p className="text-xs text-gray-500">Trial</p></div>
                  <div className="bg-white p-3 rounded-xl shadow-sm border col-span-2"><p className="text-xl font-bold text-red-400">{adminStats.expired_licenses}</p><p className="text-xs text-gray-500">Expiradas</p></div>
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={createAdminClient} className="flex-1 py-2 bg-kairos-500 text-white rounded-lg text-sm">+ Cliente</button>
                <button onClick={createAdminApp} className="flex-1 py-2 bg-kairos-500 text-white rounded-lg text-sm">+ App</button>
                <button onClick={createAdminTrial} className="flex-1 py-2 bg-yellow-500 text-white rounded-lg text-sm">Trial</button>
              </div>

              <div className="bg-white p-3 rounded-xl shadow-sm border">
                <h3 className="text-sm font-semibold mb-2">Novo Cliente</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input value={newClientName} onChange={(e) => setNewClientName(e.target.value)} placeholder="Nome*" className="col-span-2 px-3 py-2 rounded-lg border text-sm" />
                  <input value={newClientCompany} onChange={(e) => setNewClientCompany(e.target.value)} placeholder="Empresa" className="px-3 py-2 rounded-lg border text-sm" />
                  <input value={newClientPhone} onChange={(e) => setNewClientPhone(e.target.value)} placeholder="Telefone" className="px-3 py-2 rounded-lg border text-sm" />
                  <input value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} placeholder="Email" className="col-span-2 px-3 py-2 rounded-lg border text-sm" />
                  <select value={newClientCategory} onChange={(e) => setNewClientCategory(e.target.value)} className="col-span-2 px-3 py-2 rounded-lg border text-sm">
                    {["Oficina","Imobiliária","Vidraçaria","Igreja","Kairos Assistente","Clínica","Outros"].map((c) => <option key={c}>{c}</option>)}
                  </select>
                  <button onClick={createAdminClient} className="col-span-2 py-2 bg-kairos-500 text-white rounded-lg text-sm">Cadastrar</button>
                </div>
              </div>

              <div className="space-y-1">
                {adminClients.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border text-sm">
                    <div className="flex-1 min-w-0"><p className="font-medium">{c.name}</p><p className="text-xs text-gray-400">{c.company} · {c.category}</p></div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${c.status === "active" ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-500"}`}>{c.status}</span>
                    <button onClick={() => deleteAdminClient(c.id)} className="text-red-300"><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-semibold pt-2">Licenças</h3>
              <div className="space-y-2">
                {adminLicenses.map((l: any) => (
                  <div key={l.id} className="bg-white p-3 rounded-xl shadow-sm border">
                    <div className="flex items-center justify-between mb-2">
                      <div><p className="text-sm font-medium">{l.client_name}</p><p className="text-xs text-gray-400">{l.app_name}</p></div>
                      <div className="flex gap-1">
                        {["trial","active","blocked"].map((s) => (
                          <button key={s} onClick={() => updateLicenseStatus(l.id, s)}
                            className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${l.status === s ? (s === "active" ? "bg-green-500 text-white" : s === "trial" ? "bg-yellow-500 text-white" : "bg-red-400 text-white") : "bg-gray-100 text-gray-500"}`}>
                            {s === "trial" ? "Teste" : s === "active" ? "Ativo" : "Bloq"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{l.type} · {l.start_date?.slice(0,10)} até {l.end_date?.slice(0,10)}</p>
                  </div>
                ))}
              </div>

              <button onClick={loadAdmin} className="w-full py-2 bg-gray-100 rounded-lg text-sm text-gray-500">Atualizar</button>
            </div>
          </div>
        )}
        {tab === "settings" && (
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* LLM Key */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Chave da API (OpenRouter)</h3>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={llmKey}
                    onChange={(e) => setLlmKey(e.target.value)}
                    placeholder="sk-or-v1-..."
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  />
                  <button onClick={() => saveSetting("OPENROUTER_API_KEY", llmKey)} className="px-4 py-2 bg-kairos-500 text-white rounded-lg text-sm">
                    Salvar
                  </button>
                </div>
              </section>

              {/* Memory */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Memória</h3>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newMemoryKey}
                    onChange={(e) => setNewMemoryKey(e.target.value)}
                    placeholder="Chave..."
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  />
                  <input
                    type="text"
                    value={newMemoryValue}
                    onChange={(e) => setNewMemoryValue(e.target.value)}
                    placeholder="Valor..."
                    className="flex-1 px-3 py-2 rounded-lg border text-sm"
                  />
                  <button onClick={addMemory} className="btn-icon bg-kairos-500 text-white !w-10 !h-10">
                    <Plus size={18} />
                  </button>
                </div>
                <div className="space-y-1">
                  {memoryItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 bg-white p-2 rounded-lg border text-sm">
                      <span className="font-medium text-gray-600">{item.key}:</span>
                      <span className="text-gray-500 truncate flex-1">{item.value}</span>
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{item.category}</span>
                      <button onClick={() => deleteMemory(item.id)} className="text-red-300 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Sobre</h3>
                <p className="text-xs text-gray-400">Kairos Core 1.0 — PWA Assistente Pessoal</p>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
