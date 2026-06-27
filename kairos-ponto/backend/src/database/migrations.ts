import { queryAll, runSql, getDb } from "./database.js";

const MIGRATIONS_TABLE = "_migrations";
const TS = "TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS')";

async function ensureMigrationsTable() {
  await getDb();
  await runSql(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT ${TS}
    )
  `);
}

const migrations = [
  {
    // Plataforma multiempresa do Kairos Ponto. Banco PRÓPRIO, separado do
    // Kairos Admin — a integração com o hub é apenas via API de licenciamento.
    name: "001_ponto_core",
    sql: `
      CREATE TABLE IF NOT EXISTS empresas (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        document TEXT DEFAULT '',
        -- Integração com o licenciamento centralizado do Kairos Admin
        kairos_client_id TEXT DEFAULT '',
        plan TEXT NOT NULL DEFAULT 'TRIAL',
        -- Geofence padrão da empresa
        geofence_lat DOUBLE PRECISION,
        geofence_lng DOUBLE PRECISION,
        geofence_raio_metros INTEGER NOT NULL DEFAULT 100,
        geofence_obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
        face_obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS},
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS ponto_users (
        id TEXT PRIMARY KEY,
        empresa_id TEXT REFERENCES empresas(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN','ADMIN_EMPRESA','SUPERVISOR','FUNCIONARIO')),
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS},
        created_by TEXT,
        deleted_at TEXT
      );

      CREATE TABLE IF NOT EXISTS escalas (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        nome TEXT NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'personalizada' CHECK(tipo IN ('5x2','6x1','12x36','personalizada')),
        horario_entrada TEXT NOT NULL DEFAULT '08:00',
        horario_saida TEXT NOT NULL DEFAULT '17:00',
        intervalo_minutos INTEGER NOT NULL DEFAULT 60,
        tolerancia_minutos INTEGER NOT NULL DEFAULT 10,
        carga_diaria_minutos INTEGER NOT NULL DEFAULT 480,
        dias_trabalho TEXT NOT NULL DEFAULT '1,2,3,4,5',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS funcionarios (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES ponto_users(id) ON DELETE SET NULL,
        supervisor_id TEXT REFERENCES funcionarios(id) ON DELETE SET NULL,
        escala_id TEXT REFERENCES escalas(id) ON DELETE SET NULL,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL,
        email TEXT DEFAULT '',
        telefone TEXT DEFAULT '',
        cargo TEXT DEFAULT '',
        departamento TEXT DEFAULT '',
        matricula TEXT DEFAULT '',
        data_admissao TEXT,
        foto_facial TEXT DEFAULT '',
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS},
        deleted_at TEXT,
        UNIQUE(empresa_id, cpf)
      );

      CREATE TABLE IF NOT EXISTS registros_ponto (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        funcionario_id TEXT NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK(tipo IN ('entrada','saida_almoco','retorno_almoco','saida_final')),
        registrado_em TEXT NOT NULL,
        data TEXT NOT NULL,
        gps_lat DOUBLE PRECISION,
        gps_lng DOUBLE PRECISION,
        dentro_geofence BOOLEAN,
        distancia_metros DOUBLE PRECISION,
        selfie TEXT DEFAULT '',
        face_verificada BOOLEAN NOT NULL DEFAULT FALSE,
        face_score DOUBLE PRECISION,
        suspeito BOOLEAN NOT NULL DEFAULT FALSE,
        dispositivo TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        origem TEXT NOT NULL DEFAULT 'app' CHECK(origem IN ('app','web','ajuste','importacao')),
        observacao TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS face_tentativas (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        funcionario_id TEXT REFERENCES funcionarios(id) ON DELETE CASCADE,
        score DOUBLE PRECISION,
        aprovada BOOLEAN NOT NULL DEFAULT FALSE,
        motivo TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        dispositivo TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS solicitacoes (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        funcionario_id TEXT NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL CHECK(tipo IN ('ajuste_ponto','folga','justificativa','correcao_horario')),
        descricao TEXT DEFAULT '',
        payload TEXT DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'solicitado' CHECK(status IN ('solicitado','em_analise','aprovado','rejeitado')),
        aprovador_id TEXT REFERENCES ponto_users(id) ON DELETE SET NULL,
        resposta TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS},
        updated_at TEXT NOT NULL DEFAULT ${TS},
        resolved_at TEXT
      );

      CREATE TABLE IF NOT EXISTS banco_horas_movimentos (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        funcionario_id TEXT NOT NULL REFERENCES funcionarios(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        minutos INTEGER NOT NULL,
        tipo TEXT NOT NULL CHECK(tipo IN ('credito','debito','extra','ajuste')),
        origem TEXT NOT NULL DEFAULT 'apuracao',
        descricao TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS feriados (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        data TEXT NOT NULL,
        descricao TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS},
        UNIQUE(empresa_id, data)
      );

      CREATE TABLE IF NOT EXISTS notificacoes (
        id TEXT PRIMARY KEY,
        empresa_id TEXT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        user_id TEXT REFERENCES ponto_users(id) ON DELETE CASCADE,
        funcionario_id TEXT REFERENCES funcionarios(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL DEFAULT 'info',
        titulo TEXT NOT NULL,
        mensagem TEXT DEFAULT '',
        lida BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id TEXT PRIMARY KEY,
        empresa_id TEXT,
        user_id TEXT,
        action TEXT NOT NULL,
        entity TEXT,
        entity_id TEXT,
        details TEXT DEFAULT '',
        ip TEXT DEFAULT '',
        dispositivo TEXT DEFAULT '',
        created_at TEXT NOT NULL DEFAULT ${TS}
      );

      CREATE INDEX IF NOT EXISTS idx_users_empresa ON ponto_users(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa ON funcionarios(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_escalas_empresa ON escalas(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_registros_empresa ON registros_ponto(empresa_id);
      CREATE INDEX IF NOT EXISTS idx_registros_func_data ON registros_ponto(funcionario_id, data);
      CREATE INDEX IF NOT EXISTS idx_solicitacoes_empresa ON solicitacoes(empresa_id, status);
      CREATE INDEX IF NOT EXISTS idx_banco_func ON banco_horas_movimentos(funcionario_id);
      CREATE INDEX IF NOT EXISTS idx_audit_empresa ON audit_log(empresa_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notificacoes(user_id, lida);
    `,
  },
];

export async function runMigrations() {
  await ensureMigrationsTable();

  const applied = await queryAll(`SELECT name FROM ${MIGRATIONS_TABLE}`);
  const appliedNames = new Set(applied.map((r: any) => r.name));

  for (const m of migrations) {
    if (!appliedNames.has(m.name)) {
      try {
        const statements = m.sql
          .split(";")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        for (const stmt of statements) {
          await runSql(stmt);
        }
        await runSql(`INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`, [m.name]);
        console.log(`Migração aplicada: ${m.name}`);
      } catch (err: any) {
        console.error(`Erro na migração ${m.name}: ${err.message}`);
      }
    }
  }
}
