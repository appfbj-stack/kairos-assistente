"use client";

import { useEffect, useState, useRef } from "react";
import { MessageSquare, Send, X, Zap } from "lucide-react";
import clsx from "clsx";

interface Config {
  widget_title?: string;
  widget_subtitle?: string;
  widget_color?: string;
  widget_position?: string;
}

interface Message {
  id: string;
  role: "visitor" | "assistant";
  content: string;
  created_at?: string;
}

export default function AssistentePage({ params: paramsPromise }: { params: Promise<{ slug: string }> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [registered, setRegistered] = useState(false);
  const [conversationId, setConversationId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState<Config>({});
  const [assistantName, setAssistantName] = useState("Assistente Virtual");
  const [empresaName, setEmpresaName] = useState("");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";

  useEffect(() => {
    paramsPromise.then((p) => setSlug(p.slug));
  }, []);

  useEffect(() => {
    if (!slug) return;
    async function init() {
      try {
        const res = await fetch(`${baseUrl}/api/atendimento/public/${slug}`);
        if (!res.ok) throw new Error("Não encontrado");
        const data = await res.json();
        setEmpresaName(data.empresa?.name || "");
        setAssistantName(data.assistant?.name || "Assistente Virtual");
        setConfig(data.configs || {});
        if (data.assistant?.welcome_message) {
          setMessages([{ id: "welcome", role: "assistant", content: data.assistant.welcome_message }]);
        }
      } catch {
        setError("Assistente não encontrado");
      }
      setLoading(false);
    }
    init();
  }, [slug]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const color = config.widget_color || "#8B5CF6";

  async function startConversation() {
    if (!name.trim()) return;
    try {
      const res = await fetch(`${baseUrl}/api/atendimento/public/${slug}/visit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email }),
      });
      if (!res.ok) throw new Error("Erro ao iniciar conversa");
      const data = await res.json();
      setConversationId(data.conversation_id);
      setRegistered(true);
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !conversationId || sending) return;
    const text = input;
    setInput("");
    setSending(true);

    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "visitor", content: text }]);

    try {
      const res = await fetch(`${baseUrl}/api/atendimento/public/${slug}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: conversationId, content: text }),
      });
      if (!res.ok) throw new Error("Erro ao enviar");
      const data = await res.json();
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: "Desculpe, ocorreu um erro. Tente novamente." }]);
    }
    setSending(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-kairos-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h1 className="text-lg font-semibold text-gray-500">{error}</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color }}>
          <Zap size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white">{empresaName}</h1>
          <p className="text-[10px] text-gray-400">Atendimento via IA</p>
        </div>
      </header>

      {/* Chat */}
      <div className="max-w-lg mx-auto p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Chat header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: color }}>
              {assistantName.charAt(0)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{assistantName}</p>
              <p className="text-xs text-gray-400">{config.widget_subtitle || "Online"}</p>
            </div>
          </div>

          {!registered ? (
            <div className="p-4 space-y-3">
              <div>
                <label className="label">Seu nome *</label>
                <input className="input w-full" placeholder="Digite seu nome" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">Telefone / WhatsApp</label>
                <input className="input w-full" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input w-full" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <button onClick={startConversation} disabled={!name.trim()} className="btn-primary w-full" style={{ backgroundColor: color }}>
                Iniciar Conversa
              </button>
            </div>
          ) : (
            <>
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={clsx("flex", msg.role === "visitor" ? "justify-end" : "justify-start")}>
                    <div
                      className={clsx(
                        "max-w-[85%] px-3 py-2 rounded-xl text-sm",
                        msg.role === "visitor"
                          ? "text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      )}
                      style={msg.role === "visitor" ? { backgroundColor: color } : {}}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Digite sua mensagem..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                />
                <button onClick={sendMessage} disabled={!input.trim() || sending} className="btn-primary px-3" style={{ backgroundColor: color }}>
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4">
          Powered by <span className="font-medium text-gray-500">Kairos Assistente IA</span>
        </p>
      </div>
    </div>
  );
}
