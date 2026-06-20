import crypto from "crypto";
import { queryOne, queryAll, runSql } from "../database/database.js";
import { hashPassword } from "./auth.js";

/** Cria o primeiro SUPER_ADMIN do Core se nenhum existir ainda. Idempotente. */
export async function bootstrapSuperAdmin(): Promise<void> {
  const email = process.env.CORE_SUPERADMIN_EMAIL;
  const password = process.env.CORE_SUPERADMIN_PASSWORD;
  if (!email || !password) {
    console.log("ℹ️  CORE_SUPERADMIN_EMAIL/CORE_SUPERADMIN_PASSWORD não definidos — pulando bootstrap do Core.");
    return;
  }

  const existing = await queryOne("SELECT id FROM core_users WHERE role = 'SUPER_ADMIN' LIMIT 1");
  if (existing) return;

  const passwordHash = await hashPassword(password);
  await runSql(
    "INSERT INTO core_users (id, empresa_id, name, email, password_hash, role) VALUES (?, NULL, ?, ?, ?, 'SUPER_ADMIN')",
    [crypto.randomUUID(), "Super Admin", email, passwordHash]
  );
  console.log(`✅ SUPER_ADMIN do Core criado (${email})`);
}

const SEED_MODULES = [
  { name: "Membros", slug: "membros", category: "gestao", description: "Cadastro e gestão de membros da igreja", icon: "Users", tier: "free" },
  { name: "Agenda", slug: "agenda", category: "ferramentas", description: "Agendamento de eventos e compromissos", icon: "Calendar", tier: "free" },
  { name: "Eventos", slug: "eventos", category: "comunicacao", description: "Criação e gestão de eventos", icon: "CalendarCheck", tier: "free" },
  { name: "Finanças", slug: "financas", category: "gestao", description: "Controle financeiro e de dízimos/ofertas", icon: "DollarSign", tier: "lite" },
  { name: "Secretaria", slug: "secretaria", category: "gestao", description: "Gestão de atas, documentos e ofícios", icon: "ScrollText", tier: "lite" },
  { name: "Ensino", slug: "ensino", category: "comunicacao", description: "Escola bíblica, classes e material didático", icon: "BookOpen", tier: "lite" },
  { name: "Comunicação", slug: "comunicacao", category: "comunicacao", description: "Redes sociais, site e comunicação institucional", icon: "Megaphone", tier: "pro" },
  { name: "Site", slug: "site", category: "comunicacao", description: "Gerenciamento do site da igreja", icon: "Globe", tier: "pro" },
  { name: "Missões", slug: "missoes", category: "gestao", description: "Acompanhamento de missionários e projetos missionários", icon: "Heart", tier: "pro" },
  { name: "CRM", slug: "crm", category: "gestao", description: "Gestão de relacionamento com visitantes e membros", icon: "Contact", tier: "pro" },
  { name: "Relatórios", slug: "relatorios", category: "ferramentas", description: "Relatórios e dashboards personalizados", icon: "BarChart3", tier: "lite" },
  { name: "Músicas & Ministérios", slug: "musicas", category: "comunicacao", description: "Repertório, escalas e gestão de ministérios", icon: "Music", tier: "lite" },
  { name: "Dízimos & Ofertas", slug: "dizimos", category: "gestao", description: "Registro e relatórios de contribuições financeiras", icon: "HandCoins", tier: "lite" },
  { name: "IA & Automação", slug: "ia", category: "ferramentas", description: "Assistente inteligente e automação de tarefas", icon: "Brain", tier: "pro" },
  { name: "Atendimento IA", slug: "atendimento", category: "comunicacao", description: "Chat inteligente com IA para captura de leads e atendimento automatizado", icon: "MessageSquare", tier: "pro" },
];

/** Popula o catálogo de módulos se vazio. Idempotente. */
export async function bootstrapModules(): Promise<void> {
  const count = await queryOne("SELECT COUNT(*) AS total FROM modules");
  if (count && Number(count.total) > 0) {
    console.log(`ℹ️  Catálogo de módulos já possui ${count.total} módulos — pulando seed.`);
    return;
  }

  for (const mod of SEED_MODULES) {
    await runSql(
      "INSERT INTO modules (id, name, slug, category, description, icon, tier) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), mod.name, mod.slug, mod.category, mod.description, mod.icon, mod.tier]
    );
  }
  console.log(`✅ ${SEED_MODULES.length} módulos seedados no catálogo.`);
}

const SEED_AGENTS = [
  {
    name: "Assistente Pastoral",
    slug: "assistente-pastoral",
    description: "Auxilia na redação de sermões, estudos bíblicos e aconselhamento pastoral",
    icon: "Heart",
    category: "pastoral",
    tier: "pro",
    tools: [
      { name: "gerar_sermao", description: "Gera esboço de sermão baseado em passagem bíblica", input_schema: JSON.stringify({ type: "object", properties: { passagem: { type: "string" }, tema: { type: "string" } } }) },
      { name: "estudo_biblico", description: "Cria estudo bíblico com perguntas para grupo pequeno", input_schema: JSON.stringify({ type: "object", properties: { tema: { type: "string" }, passagens: { type: "array", items: { type: "string" } } } }) },
    ],
    modules: ["membros", "eventos", "agenda"],
  },
  {
    name: "Assistente Financeiro",
    slug: "assistente-financeiro",
    description: "Auxilia na gestão financeira, relatórios e controle de dízimos",
    icon: "DollarSign",
    category: "gestao",
    tier: "lite",
    tools: [
      { name: "gerar_relatorio", description: "Gera relatório financeiro do período", input_schema: JSON.stringify({ type: "object", properties: { periodo: { type: "string" }, tipo: { type: "string", enum: ["dizimos", "ofertas", "geral"] } } }) },
      { name: "conciliacao", description: "Auxilia na conciliação bancária", input_schema: JSON.stringify({ type: "object", properties: { mes: { type: "string" }, ano: { type: "number" } } }) },
    ],
    modules: ["financas", "dizimos", "relatorios"],
  },
  {
    name: "Assistente de Comunicação",
    slug: "assistente-comunicacao",
    description: "Auxilia na criação de conteúdo para redes sociais e site",
    icon: "Megaphone",
    category: "comunicacao",
    tier: "pro",
    tools: [
      { name: "gerar_post", description: "Gera texto para post em rede social", input_schema: JSON.stringify({ type: "object", properties: { tema: { type: "string" }, plataforma: { type: "string", enum: ["instagram", "facebook", "whatsapp"] } } }) },
      { name: "gerar_noticia", description: "Gera notícia para o site da igreja", input_schema: JSON.stringify({ type: "object", properties: { titulo: { type: "string" }, resumo: { type: "string" } } }) },
    ],
    modules: ["comunicacao", "site", "eventos"],
  },
  {
    name: "Assistente Administrativo",
    slug: "assistente-administrativo",
    description: "Auxilia na gestão de membros, secretaria e tarefas administrativas",
    icon: "ClipboardList",
    category: "produtividade",
    tier: "free",
    tools: [
      { name: "buscar_membro", description: "Busca informações de um membro", input_schema: JSON.stringify({ type: "object", properties: { nome: { type: "string" }, email: { type: "string" } } }) },
      { name: "gerar_ata", description: "Gera ata de reunião", input_schema: JSON.stringify({ type: "object", properties: { pauta: { type: "string" }, participantes: { type: "array", items: { type: "string" } }, decisoes: { type: "string" } } }) },
    ],
    modules: ["membros", "secretaria", "agenda"],
  },
];

/** Popula o catálogo de agentes se vazio. Idempotente. */
export async function bootstrapAgents(): Promise<void> {
  const count = await queryOne("SELECT COUNT(*) AS total FROM agents");
  if (count && Number(count.total) > 0) {
    console.log(`ℹ️  Catálogo de agentes já possui ${count.total} agentes — pulando seed.`);
    return;
  }

  for (const ag of SEED_AGENTS) {
    const agentId = crypto.randomUUID();
    await runSql(
      "INSERT INTO agents (id, name, slug, description, icon, category, tier) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [agentId, ag.name, ag.slug, ag.description, ag.icon, ag.category, ag.tier]
    );

    for (const tool of ag.tools) {
      await runSql(
        "INSERT INTO agent_tools (id, agent_id, name, description, input_schema) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), agentId, tool.name, tool.description, tool.input_schema]
      );
    }

    for (const moduleSlug of ag.modules) {
      const mod = await queryOne("SELECT id FROM modules WHERE slug = ?", [moduleSlug]);
      if (mod) {
        await runSql(
          "INSERT INTO agent_modules (agent_id, module_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
          [agentId, mod.id]
        );
      }
    }
  }
  console.log(`✅ ${SEED_AGENTS.length} agentes seedados no catálogo.`);
}
