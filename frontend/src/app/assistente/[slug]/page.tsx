"use client";

import { useEffect, useState, useRef } from "react";
import { Send, Loader2, MessageSquare, User, Bot } from "lucide-react";

interface AssistantConfig {
    widget_title?: string;
    widget_subtitle?: string;
    widget_color?: string;
    welcome_message?: string;
    name?: string;
}

interface Message {
    id: string;
    role: "visitor" | "assistant";
    content: string;
    created_at?: string;
}

export default function AssistentePage({
    params: paramsPromise,
}: {
    params: Promise<{ slug: string }>;
}) {
    const [slug, setSlug] = useState("");
    const [step, setStep] = useState<"loading" | "form" | "chat" | "error">("loading");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [conversationId, setConversationId] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [config, setConfig] = useState<AssistantConfig>({});
    const [assistantName, setAssistantName] = useState("Assistente Virtual");
    const [empresaName, setEmpresaName] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

  // baseUrl sem /api/ duplicado - proxy ja esta em /api/proxy
  const getBaseUrl = () =>
        typeof window !== "undefined" ? window.location.origin + "/api/proxy" : "";

  useEffect(() => {
        paramsPromise.then((p) => setSlug(p.slug));
  }, []);

  useEffect(() => {
        if (!slug) return;
        async function init() {
                try {
                          const baseUrl = getBaseUrl();
                          const res = await fetch(`${baseUrl}/atendimento/public/${slug}`);
                          if (!res.ok) throw new Error("Assistente nao encontrado");
                          const data = await res.json();
                          setEmpresaName(data.empresa?.name || "");
                          setAssistantName(data.assistant?.name || "Assistente Virtual");
                          setConfig({
                                      ...(data.configs || {}),
                                      welcome_message: data.assistant?.welcome_message,
                                      name: data.assistant?.name,
                          });
                          if (data.assistant?.welcome_message) {
                                      setMessages([
                                        {
                                                        id: "welcome",
                                                        role: "assistant",
                                                        content: data.assistant.welcome_message,
                                        },
                                                  ]);
                          }
                          setStep("form");
                } catch (e: any) {
                          setErrorMsg(e.message || "Assistente nao encontrado");
                          setStep("error");
                }
        }
        init();
  }, [slug]);

  useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const primaryColor = config.widget_color || "#8B5CF6";

  async function startConversation() {
        if (!name.trim()) return;
        try {
                const baseUrl = getBaseUrl();
                const res = await fetch(`${baseUrl}/atendimento/public/${slug}/visit`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ name, phone, email }),
                });
                if (!res.ok) throw new Error("Erro ao iniciar conversa");
                const data = await res.json();
                setConversationId(data.conversation_id);
                setStep("chat");
        } catch (e: any) {
                alert(e.message);
        }
  }

  async function sendMessage() {
        if (!input.trim() || !conversationId || sending) return;
        const text = input.trim();
        setInput("");
        setSending(true);
        setMessages((prev) => [
                ...prev,
          { id: Date.now().toString(), role: "visitor", content: text },
              ]);
        try {
                const baseUrl = getBaseUrl();
                const res = await fetch(
                          `${baseUrl}/atendimento/public/${slug}/message`,
                  {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ conversation_id: conversationId, content: text }),
                  }
                        );
                if (!res.ok) throw new Error("Erro ao enviar");
                const data = await res.json();
                setMessages((prev) => [
                          ...prev,
                  {
                              id: (Date.now() + 1).toString(),
                              role: "assistant",
                              content: data.reply,
                  },
                        ]);
        } catch {
                setMessages((prev) => [
                          ...prev,
                  {
                              id: (Date.now() + 1).toString(),
                              role: "assistant",
                              content: "Desculpe, ocorreu um erro. Tente novamente.",
                  },
                        ]);
        }
        setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
        }
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (step === "loading") {
        return (
                <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                                  <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                                  <p className="text-gray-500 text-sm">Carregando...</p>p>
                        </div>div>
                </div>div>
              );
  }
  
    // ── Error ─────────────────────────────────────────────────────────────────
    if (step === "error") {
          return (
                  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
                          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
                                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <MessageSquare className="w-8 h-8 text-red-500" />
                                    </div>div>
                                    <h2 className="text-xl font-bold text-gray-800 mb-2">Assistente nao encontrado</h2>h2>
                                    <p className="text-gray-500 text-sm">{errorMsg}</p>p>
                          </div>div>
                  </div>div>
                );
    }
  
    // ── Form (registro do visitante) ─────────────────────────────────────────
    if (step === "form") {
          return (
                  <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center p-4">
                          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                            {/* Header */}
                                    <div
                                                  className="px-6 py-8 text-white text-center"
                                                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc)` }}
                                                >
                                                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                                              <Bot className="w-8 h-8 text-white" />
                                                </div>div>
                                                <h1 className="text-2xl font-bold">{assistantName}</h1>h1>
                                      {empresaName && (
                                                                <p className="text-white/80 text-sm mt-1">{empresaName}</p>p>
                                                )}
                                      {config.widget_subtitle && (
                                                                <p className="text-white/70 text-xs mt-2">{config.widget_subtitle}</p>p>
                                                )}
                                    </div>div>
                          
                            {/* Welcome message */}
                            {config.welcome_message && (
                                <div className="px-6 pt-6">
                                              <div className="bg-gray-50 rounded-xl p-4 text-gray-700 text-sm leading-relaxed border-l-4" style={{ borderColor: primaryColor }}>
                                                {config.welcome_message}
                                              </div>div>
                                </div>div>
                                    )}
                          
                            {/* Form */}
                                    <div className="px-6 py-6 space-y-4">
                                                <div>
                                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                              Seu nome <span className="text-red-500">*</span>span>
                                                              </label>label>
                                                              <input
                                                                                type="text"
                                                                                value={name}
                                                                                onChange={(e) => setName(e.target.value)}
                                                                                onKeyDown={(e) => e.key === "Enter" && startConversation()}
                                                                                placeholder="Como posso te chamar?"
                                                                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                                                                                style={{ "--tw-ring-color": primaryColor } as React.CSSProperties}
                                                                                autoFocus
                                                                              />
                                                </div>div>
                                                <div>
                                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                              WhatsApp / Telefone
                                                              </label>label>
                                                              <input
                                                                                type="tel"
                                                                                value={phone}
                                                                                onChange={(e) => setPhone(e.target.value)}
                                                                                placeholder="(11) 99999-9999"
                                                                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                                                                              />
                                                </div>div>
                                                <div>
                                                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                                                              E-mail
                                                              </label>label>
                                                              <input
                                                                                type="email"
                                                                                value={email}
                                                                                onChange={(e) => setEmail(e.target.value)}
                                                                                placeholder="seu@email.com"
                                                                                className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition"
                                                                              />
                                                </div>div>
                                                <button
                                                                onClick={startConversation}
                                                                disabled={!name.trim()}
                                                                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 active:scale-95"
                                                                style={{ background: primaryColor }}
                                                              >
                                                              Iniciar Conversa
                                                </button>button>
                                                <p className="text-center text-xs text-gray-400">
                                                              Powered by Kairos Assistente
                                                </p>p>
                                    </div>div>
                          </div>div>
                  </div>div>
                );
    }
  
    // ── Chat ─────────────────────────────────────────────────────────────────
    return (
          <div className="min-h-screen bg-gray-100 flex flex-col" style={{ maxHeight: "100dvh" }}>
            {/* Header fixo */}
                <header
                          className="flex items-center gap-3 px-4 py-3 text-white shadow-md flex-shrink-0"
                          style={{ background: primaryColor }}
                        >
                        <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                  <Bot className="w-5 h-5 text-white" />
                        </div>div>
                        <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm truncate">{assistantName}</p>p>
                          {empresaName && (
                                      <p className="text-white/70 text-xs truncate">{empresaName}</p>p>
                                  )}
                        </div>div>
                        <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                  <span className="text-white/80 text-xs">Online</span>span>
                        </div>div>
                </header>header>
          
            {/* Mensagens */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ overscrollBehavior: "contain" }}>
                  {messages.map((msg) => (
                      <div
                                    key={msg.id}
                                    className={`flex items-end gap-2 ${msg.role === "visitor" ? "flex-row-reverse" : "flex-row"}`}
                                  >
                        {/* Avatar */}
                                  <div
                                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                                  style={{
                                                                    background: msg.role === "visitor" ? "#e5e7eb" : primaryColor,
                                                  }}
                                                >
                                    {msg.role === "visitor" ? (
                                                                  <User className="w-3.5 h-3.5 text-gray-600" />
                                                                ) : (
                                                                  <Bot className="w-3.5 h-3.5 text-white" />
                                                                )}
                                  </div>div>
                      
                        {/* Bubble */}
                                  <div
                                                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                                                                    msg.role === "visitor"
                                                                      ? "text-white rounded-br-sm"
                                                                      : "bg-white text-gray-800 rounded-bl-sm"
                                                  }`}
                                                  style={msg.role === "visitor" ? { background: primaryColor } : {}}
                                                >
                                    {msg.content.split("\n").map((line, i) => (
                                                                  <span key={i}>
                                                                    {line}
                                                                    {i < msg.content.split("\n").length - 1 && <br />}
                                                                  </span>span>
                                                                ))}
                                  </div>div>
                      </div>div>
                    ))}
                
                  {/* Indicador de digitacao */}
                  {sending && (
                      <div className="flex items-end gap-2">
                                  <div
                                                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                                                  style={{ background: primaryColor }}
                                                >
                                                <Bot className="w-3.5 h-3.5 text-white" />
                                  </div>div>
                                  <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm">
                                                <div className="flex gap-1 items-center">
                                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                                                                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                                </div>div>
                                  </div>div>
                      </div>div>
                        )}
                        <div ref={messagesEndRef} />
                </div>div>
          
            {/* Input fixo no rodape */}
                <div className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
                        <div className="flex items-end gap-2 bg-gray-50 rounded-2xl px-4 py-2 border border-gray-200 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 transition">
                                  <textarea
                                                value={input}
                                                onChange={(e) => setInput(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Digite sua mensagem..."
                                                rows={1}
                                                className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 resize-none focus:outline-none min-h-[24px] max-h-[120px] leading-6"
                                                style={{ height: "auto" }}
                                                onInput={(e) => {
                                                                const el = e.currentTarget;
                                                                el.style.height = "auto";
                                                                el.style.height = Math.min(el.scrollHeight, 120) + "px";
                                                }}
                                              />
                                  <button
                                                onClick={sendMessage}
                                                disabled={!input.trim() || sending}
                                                className="w-9 h-9 rounded-xl flex items-center justify-center text-white transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 flex-shrink-0"
                                                style={{ background: primaryColor }}
                                              >
                                    {sending ? (
                                                              <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                              <Send className="w-4 h-4" />
                                                            )}
                                  </button>button>
                        </div>div>
                        <p className="text-center text-xs text-gray-300 mt-2">Powered by Kairos Assistente</p>p>
                </div>div>
          </div>div>
        );
}</div>
