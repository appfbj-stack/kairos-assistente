"use client";

import { useState, useEffect, useRef } from "react";
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, Trash2, MessageSquare, X } from "lucide-react";
import AdminShell from "@/components/AdminShell";
import { api } from "@/services/api";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { useTextToSpeech } from "@/hooks/use-text-to-speech";

type Message = { id: string; role: "user" | "assistant"; content: string };
type Conversation = { id: string; title: string; created_at: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isListening, transcript, startListening, stopListening, error: sttError } = useSpeechToText();
  const { isSpeaking, speak, stop } = useTextToSpeech();

  useEffect(() => { loadConversations(); }, []);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (transcript) { setInput(transcript); sendMessage(transcript); } }, [transcript]);

  async function loadConversations() {
    try { setConversations(await api.chat.list()); } catch {}
  }

  async function loadConversation(id: string) {
    try {
      const data = await api.chat.get(id);
      setConvId(data.id);
      setMessages(data.messages);
      setShowHistory(false);
    } catch {}
  }

  async function newConversation() {
    setConvId(null);
    setMessages([]);
    setInput("");
    setShowHistory(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  async function deleteConversation(id: string) {
    try {
      await api.chat.delete(id);
      if (convId === id) { setConvId(null); setMessages([]); }
      loadConversations();
    } catch {}
  }

  async function sendMessage(msg?: string) {
    const text = msg || input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: text }]);
    try {
      const data = await api.chat.send(convId, text);
      setConvId(data.conversation_id);
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: data.message }]);
      speak(data.message);
      loadConversations();
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: `Erro: ${err.message}` }]);
    } finally { setLoading(false); }
  }

  return (
    <AdminShell
      title="Chat IA"
      actions={
        <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary flex items-center gap-2 text-xs">
          <MessageSquare size={14} /> Histórico
        </button>
      }
    >
      <div className="flex gap-4 h-[calc(100vh-8rem)]">
        {/* History panel */}
        {showHistory && (
          <div className="w-64 card flex flex-col overflow-hidden flex-shrink-0">
            <div className="p-3 border-b dark:border-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium">Conversas</span>
              <button onClick={() => setShowHistory(false)} className="text-gray-400 hover:text-gray-600 p-0.5"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <button onClick={newConversation} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 text-sm mb-1">
                <Plus size={14} /> Nova conversa
              </button>
              {conversations.map((c) => (
                <div key={c.id} className="flex items-center group">
                  <button onClick={() => loadConversation(c.id)} className={`flex-1 text-left px-3 py-2 rounded-lg text-xs truncate ${convId === c.id ? "bg-kairos-50 text-kairos-600" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"}`}>
                    {c.title}
                  </button>
                  <button onClick={() => deleteConversation(c.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat */}
        <div className="flex-1 card flex flex-col overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <MessageSquare size={40} className="mb-3 opacity-30" />
                <p className="text-sm">Como posso ajudar?</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={msg.role === "user" ? "message-user" : "message-assistant"}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && (
                    <button onClick={() => isSpeaking ? stop() : speak(msg.content)} className="mt-1 text-gray-400 hover:text-kairos-500 transition-colors">
                      {isSpeaking ? <VolumeX size={13} /> : <Volume2 size={13} />}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="message-assistant">
                  <div className="flex gap-1">{[0, 150, 300].map((d) => <span key={d} className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />)}</div>
                </div>
              </div>
            )}
            {sttError && <p className="text-center text-red-400 text-xs">{sttError}</p>}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t dark:border-gray-700 flex items-center gap-2">
            <button onClick={() => isListening ? stopListening() : startListening()} className={`btn-icon flex-shrink-0 ${isListening ? "bg-red-500 text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"}`}>
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder={isListening ? "Ouvindo..." : "Digite sua mensagem..."}
              className="flex-1 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-full text-sm outline-none focus:ring-2 focus:ring-kairos-300"
            />
            <button onClick={() => sendMessage()} disabled={!input.trim() || loading} className="btn-icon bg-kairos-500 text-white hover:bg-kairos-600 disabled:opacity-40 flex-shrink-0">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
