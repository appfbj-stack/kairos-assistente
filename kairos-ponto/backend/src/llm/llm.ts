import OpenAI from "openai";

const API_KEY = process.env.LLM_API_KEY || "";
const BASE_URL = process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1";
const MODEL = process.env.LLM_MODEL || "openai/gpt-4o-mini";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) _client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL });
  return _client;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Wrapper da IA Kairos (OpenRouter / API compatível com OpenAI). */
export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  if (!API_KEY) {
    throw new Error("IA não configurada: defina LLM_API_KEY no ambiente.");
  }
  const res = await client().chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.3,
  });
  return res.choices[0]?.message?.content?.trim() || "";
}
