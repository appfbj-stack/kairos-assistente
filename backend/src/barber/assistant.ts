import { queryAll, queryOne } from "../database/database.js";
import { chatCompletion } from "../llm/llm.js";

interface AssistantExtraction {
  reply: string;
  service_name: string | null;
  professional_name: string | null;
  date: string | null;
}

function buildSystemPrompt(
  empresaName: string,
  services: { name: string; duration_minutes: number; price: number }[],
  professionals: { name: string }[],
  todayIso: string
): string {
  const serviceList = services.map((s) => `${s.name} (${s.duration_minutes}min, R$ ${s.price})`).join(", ");
  const professionalList = professionals.map((p) => p.name).join(", ");

  return `Você é a assistente de agendamento da barbearia "${empresaName}", parte da Plataforma Kairos.
Sua função é APENAS conversar com o cliente para entender qual serviço, profissional e data ele quer — você NUNCA cria, confirma ou cancela agendamentos diretamente, isso é feito por um sistema separado depois que o cliente confirma na tela.

Hoje é ${todayIso}.

Serviços disponíveis: ${serviceList || "nenhum cadastrado"}
Profissionais disponíveis: ${professionalList || "nenhum cadastrado"}

Converse em português brasileiro, de forma curta e simpática. Pergunte uma coisa por vez se faltar informação.

Responda SEMPRE e SOMENTE com um JSON válido, sem markdown, no formato exato:
{"reply": "sua mensagem para o cliente", "service_name": "nome exato de um serviço da lista ou null", "professional_name": "nome exato de um profissional da lista ou null", "date": "YYYY-MM-DD ou null"}

Só preencha service_name/professional_name com um nome que esteja EXATAMENTE na lista acima. Só preencha date quando o cliente disser um dia (interprete "hoje", "amanhã", dias da semana etc. com base na data de hoje informada).`;
}

function parseAssistantJson(raw: string): AssistantExtraction {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    return {
      reply: typeof parsed.reply === "string" ? parsed.reply : raw,
      service_name: typeof parsed.service_name === "string" ? parsed.service_name : null,
      professional_name: typeof parsed.professional_name === "string" ? parsed.professional_name : null,
      date: typeof parsed.date === "string" ? parsed.date : null,
    };
  } catch {
    return { reply: raw, service_name: null, professional_name: null, date: null };
  }
}

export async function runBookingAssistant(
  empresaId: string,
  empresaName: string,
  messages: { role: string; content: string }[]
) {
  const services = await queryAll(
    "SELECT id, name, duration_minutes, price FROM barber_services WHERE empresa_id = ? AND active = TRUE ORDER BY name",
    [empresaId]
  );
  const professionals = await queryAll(
    "SELECT id, name FROM barber_professionals WHERE empresa_id = ? AND active = TRUE ORDER BY name",
    [empresaId]
  );

  const todayIso = new Date().toISOString().slice(0, 10);
  const systemPrompt = buildSystemPrompt(empresaName, services as any, professionals as any, todayIso);

  const raw = await chatCompletion([{ role: "system", content: systemPrompt }, ...messages]);
  const extracted = parseAssistantJson(raw);

  let service_id: string | null = null;
  let professional_id: string | null = null;
  if (extracted.service_name) {
    const row = await queryOne("SELECT id FROM barber_services WHERE empresa_id = ? AND name ILIKE ? AND active = TRUE", [
      empresaId,
      extracted.service_name,
    ]);
    service_id = row ? (row as any).id : null;
  }
  if (extracted.professional_name) {
    const row = await queryOne(
      "SELECT id FROM barber_professionals WHERE empresa_id = ? AND name ILIKE ? AND active = TRUE",
      [empresaId, extracted.professional_name]
    );
    professional_id = row ? (row as any).id : null;
  }

  return {
    reply: extracted.reply,
    service_id,
    professional_id,
    date: extracted.date,
  };
}
