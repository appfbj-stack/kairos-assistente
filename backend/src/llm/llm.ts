import OpenAI from "openai";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENROUTER_API_KEY || "";
    client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
      defaultHeaders: {
        "HTTP-Referer": "https://kairos.app",
        "X-Title": "Kairos Core",
      },
    });
  }
  return client;
}

export async function chatCompletion(
  messages: { role: string; content: string }[],
  model = "google/gemini-2.0-flash-exp:free"
): Promise<string> {
  try {
    const completion = await getClient().chat.completions.create({
      model,
      messages: messages as any,
      temperature: 0.7,
      max_tokens: 1024,
    });
    return completion.choices[0]?.message?.content || "Sem resposta.";
  } catch (error: any) {
    throw new Error(`LLM error: ${error.message}`);
  }
}
