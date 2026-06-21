from datetime import date, datetime, timezone
from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

def utcnow(): return datetime.now(timezone.utc)

# Perfis permitidos no sistema.
# sede            — acesso total ao tenant (admin da igreja)
# pastor          — acesso restrito à própria congregação, vê dados sensíveis
# secretario      — acesso à própria congregação, SEM CPF/RG/endereço (mascaramento)
# lider_ministerio— acesso à própria congregação, apenas resumo cadastral
PERFIS = ["sede", "pastor", "secretario", "lider_ministerio"]

# Perfis que enxergam dados sensíveis (CPF, RG, endereço completo, e-mail)
PERFIS_SENITIVE_ACCESS = ["sede", "pastor"]

# ── Module (catálogo de módulos disponíveis no ecossistema Kairos) ─────────
class Module(Base):
    __tablename__ = "modules"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(255))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

class TenantModule(Base):
    __tablename__ = "tenant_modules"
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), primary_key=True)
    module_slug: Mapped[str] = mapped_column(String(100), primary_key=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)

# ── Tenant (cliente da plataforma Kairos, ex: "OBPC Sorocaba") ──────────────
class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True)
    nome: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Usuário (acesso ao sistema, autenticado via Google OAuth + senha) ──────
class Usuario(Base):
    __tablename__ = "usuarios"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    nome: Mapped[str] = mapped_column(String(255))
    perfil: Mapped[str] = mapped_column(String(20), default="pastor")  # sede | pastor
    congregacao_id: Mapped[str | None] = mapped_column(ForeignKey("congregacoes.id"), nullable=True)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    password_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

# ── Congregação ──────────────────────────────────────────────────────────────
class Congregacao(Base):
    __tablename__ = "congregacoes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    nome: Mapped[str] = mapped_column(String(255))
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(String(2), nullable=True)
    pastor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    telefone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(50), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ativa")  # ativa | inativa
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

# ── Membro ───────────────────────────────────────────────────────────────────
class Membro(Base):
    __tablename__ = "membros"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    congregacao_id: Mapped[str] = mapped_column(ForeignKey("congregacoes.id"), index=True)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    nome: Mapped[str] = mapped_column(String(255))
    # ── Dados pessoais (RGPD: base legal = consentimento + legítimo interesse) ──
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    rg: Mapped[str | None] = mapped_column(String(20), nullable=True)
    data_nascimento: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    telefone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    whatsapp: Mapped[str | None] = mapped_column(String(50), nullable=True)
    endereco: Mapped[str | None] = mapped_column(String(255), nullable=True)
    estado_civil: Mapped[str | None] = mapped_column(String(20), nullable=True)
    naturalidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    profissao: Mapped[str | None] = mapped_column(String(100), nullable=True)
    escolaridade: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # ── Família ───────────────────────────────────────────────────────────────
    nome_pai: Mapped[str | None] = mapped_column(String(255), nullable=True)
    nome_mae: Mapped[str | None] = mapped_column(String(255), nullable=True)
    conjuge_nome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data_casamento: Mapped[date | None] = mapped_column(Date, nullable=True)
    num_filhos: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # ── Saúde (dado sensível — LGPD Art. 11) ─────────────────────────────────
    tipo_sanguineo: Mapped[str | None] = mapped_column(String(5), nullable=True)
    alergias_medicacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    necessidades_especiais: Mapped[str | None] = mapped_column(Text, nullable=True)
    contato_emergencia_nome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contato_emergencia_telefone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    # ── Dados eclesiásticos ──────────────────────────────────────────────────
    data_conversao: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_batismo: Mapped[date | None] = mapped_column(Date, nullable=True)
    batismo_espirito_santo_em: Mapped[date | None] = mapped_column(Date, nullable=True)
    data_entrada_congregacao: Mapped[date | None] = mapped_column(Date, nullable=True)
    cargo: Mapped[str | None] = mapped_column(String(100), nullable=True)
    consagracao_data: Mapped[date | None] = mapped_column(Date, nullable=True)
    consagracao_oficiante: Mapped[str | None] = mapped_column(String(255), nullable=True)
    formacao_teologica: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ativo", index=True)  # ativo | inativo | transferido | falecido
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # ── LGPD — consentimento registrado ──────────────────────────────────────
    lgpd_aceite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    lgpd_data_aceite: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    lgpd_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    lgpd_user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lgpd_versao_termo: Mapped[str | None] = mapped_column(String(20), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

# ── Obreiro (credencial ministerial de um membro) ───────────────────────────
class Obreiro(Base):
    __tablename__ = "obreiros"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    congregacao_id: Mapped[str] = mapped_column(ForeignKey("congregacoes.id"), index=True)
    categoria: Mapped[str] = mapped_column(String(30))  # cooperador | diacono | presbitero | evangelista | pastor
    credencial_numero: Mapped[str | None] = mapped_column(String(50), nullable=True)
    credencial_emissao: Mapped[date | None] = mapped_column(Date, nullable=True)
    credencial_validade: Mapped[date | None] = mapped_column(Date, nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    membro: Mapped["Membro"] = relationship("Membro")

# ── Carteirinha (carteira de membresia com QR-code) ─────────────────────────
class Carteirinha(Base):
    __tablename__ = "carteirinhas"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    obreiro_id: Mapped[str | None] = mapped_column(ForeignKey("obreiros.id"), nullable=True)
    qrcode_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    emissao: Mapped[date | None] = mapped_column(Date, nullable=True)
    validade: Mapped[date | None] = mapped_column(Date, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="nao_emitida")  # nao_emitida | ativa | vencida
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    membro: Mapped["Membro"] = relationship("Membro")

# ── Patrimônio ───────────────────────────────────────────────────────────────
class Patrimonio(Base):
    __tablename__ = "patrimonio"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    congregacao_id: Mapped[str] = mapped_column(ForeignKey("congregacoes.id"), index=True)
    codigo: Mapped[str | None] = mapped_column(String(50), nullable=True)
    categoria: Mapped[str | None] = mapped_column(String(50), nullable=True)
    descricao: Mapped[str] = mapped_column(String(255))
    valor: Mapped[float] = mapped_column(Float, default=0)
    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    localizacao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    atualizado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

# ── Evento (agenda) ──────────────────────────────────────────────────────────
class Evento(Base):
    __tablename__ = "eventos"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    congregacao_id: Mapped[str] = mapped_column(ForeignKey("congregacoes.id"), index=True)
    titulo: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(30), default="culto")  # culto | batismo | santa_ceia | congresso | reuniao
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    data_fim: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    local: Mapped[str | None] = mapped_column(String(255), nullable=True)
    responsavel_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # reservado para sincronização futura (fase 2)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Batismo ──────────────────────────────────────────────────────────────────
class Batismo(Base):
    __tablename__ = "batismos"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    congregacao_id: Mapped[str] = mapped_column(ForeignKey("congregacoes.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    data: Mapped[date] = mapped_column(Date)
    local: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pastor_id: Mapped[str | None] = mapped_column(ForeignKey("membros.id"), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    membro: Mapped["Membro"] = relationship("Membro", foreign_keys=[membro_id])
    pastor: Mapped["Membro | None"] = relationship("Membro", foreign_keys=[pastor_id])


# ── Transferência de Membro (cartório eclesiástico) ─────────────────────────
class TransferenciaMembro(Base):
    __tablename__ = "transferencias_membro"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    congregacao_origem_id: Mapped[str | None] = mapped_column(ForeignKey("congregacoes.id"), nullable=True)
    congregacao_destino_id: Mapped[str | None] = mapped_column(ForeignKey("congregacoes.id"), nullable=True)
    congregacao_origem_nome: Mapped[str | None] = mapped_column(String(255), nullable=True)  # livre p/ igrejas externas
    congregacao_destino_nome: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data: Mapped[date] = mapped_column(Date)
    motivo: Mapped[str | None] = mapped_column(String(255), nullable=True)
    documento_comprovante_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    membro: Mapped["Membro"] = relationship("Membro", foreign_keys=[membro_id])


# ── Histórico de Cargos (cronológico) ────────────────────────────────────────
class HistoricoCargo(Base):
    __tablename__ = "historico_cargos"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    congregacao_id: Mapped[str | None] = mapped_column(ForeignKey("congregacoes.id"), nullable=True)
    cargo: Mapped[str] = mapped_column(String(100))
    data_inicio: Mapped[date] = mapped_column(Date)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    oficializado_por: Mapped[str | None] = mapped_column(String(255), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    membro: Mapped["Membro"] = relationship("Membro", foreign_keys=[membro_id])


# ── Ministério do Membro (participação em ministérios) ──────────────────────
class MinisterioMembro(Base):
    __tablename__ = "ministerios_membro"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    ministerio: Mapped[str] = mapped_column(String(100))  # louvor | infantil | diaconia | missões | etc
    funcao: Mapped[str | None] = mapped_column(String(100), nullable=True)  # líder | membro | coordenador
    data_inicio: Mapped[date] = mapped_column(Date)
    data_fim: Mapped[date | None] = mapped_column(Date, nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    membro: Mapped["Membro"] = relationship("Membro", foreign_keys=[membro_id])


# ── Curso / Formação do Membro ───────────────────────────────────────────────
class CursoFormacao(Base):
    __tablename__ = "cursos_formacao"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    membro_id: Mapped[str] = mapped_column(ForeignKey("membros.id"), index=True)
    curso: Mapped[str] = mapped_column(String(255))
    instituicao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    data_conclusao: Mapped[date | None] = mapped_column(Date, nullable=True)
    certificacao_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    membro: Mapped["Membro"] = relationship("Membro", foreign_keys=[membro_id])


# ── Consentimento LGPD (histórico de aceites — uma linha por aceite) ─────────
class ConsentimentoLGPD(Base):
    __tablename__ = "consentimentos_lgpd"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    # titular pode ser um Membro (cadastro) ou um Usuario (login no sistema)
    membro_id: Mapped[str | None] = mapped_column(ForeignKey("membros.id"), nullable=True, index=True)
    usuario_id: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    versao_termo: Mapped[str] = mapped_column(String(20))
    finalidade: Mapped[str] = mapped_column(String(100))  # cadastro_membro | login_sistema | etc
    aceito: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    data_aceite: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


# ── Auditoria (log de acessos e alterações a dados pessoais) ────────────────
class AuditoriaLog(Base):
    __tablename__ = "auditoria_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    usuario_id: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True, index=True)
    usuario_email: Mapped[str | None] = mapped_column(String(255), nullable=True)  # desnormalizado p/ histórico
    acao: Mapped[str] = mapped_column(String(30), index=True)  # acesso | criacao | alteracao | remocao | exportacao
    recurso: Mapped[str] = mapped_column(String(50), index=True)  # membros | obreiros | carteirinhas | usuarios | lgpd
    recurso_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    detalhes: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON livre com campos alterados
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)


# ── Solicitação LGPD (canal do titular — Art. 18 LGPD) ──────────────────────
class SolicitacaoLGPD(Base):
    __tablename__ = "solicitacoes_lgpd"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    # titular (não precisa ser usuário do sistema)
    titular_nome: Mapped[str] = mapped_column(String(255))
    titular_email: Mapped[str] = mapped_column(String(255), index=True)
    titular_cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    titular_telefone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    tipo: Mapped[str] = mapped_column(String(30), index=True)  # acesso | retificacao | exclusao | portabilidade | revogacao
    descricao: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(30), default="recebida", index=True)  # recebida | em_andamento | concluida | recusada
    atendido_por: Mapped[str | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    atendido_em: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resposta: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    criado_em: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
