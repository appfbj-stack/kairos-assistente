from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

def utcnow(): return datetime.now(timezone.utc)

ROLES = ["admin", "vereador", "assessor", "cidadao"]

# ── Tenant (gabinete / mandato) ─────────────────────────────────────────────
class Tenant(Base):
    __tablename__ = "tenants"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── User ──────────────────────────────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(50), default="admin")  # admin | vereador | assessor | cidadao
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Cidadão (CRM político) ──────────────────────────────────────────────────
class Cidadao(Base):
    __tablename__ = "cidadaos"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    nome: Mapped[str] = mapped_column(String(255))
    telefone: Mapped[str] = mapped_column(String(50), default="")
    whatsapp: Mapped[str] = mapped_column(String(50), default="")
    endereco: Mapped[str] = mapped_column(String(255), default="")
    bairro: Mapped[str] = mapped_column(String(100), default="")
    cidade: Mapped[str] = mapped_column(String(100), default="")
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    linked_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # acesso ao portal do cidadão
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Liderança ────────────────────────────────────────────────────────────────
class Lideranca(Base):
    __tablename__ = "liderancas"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    nome: Mapped[str] = mapped_column(String(255))
    regiao: Mapped[str] = mapped_column(String(100), default="")
    comunidade: Mapped[str] = mapped_column(String(100), default="")
    area_atuacao: Mapped[str] = mapped_column(String(100), default="")
    contato: Mapped[str] = mapped_column(String(100), default="")
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Parceiro ─────────────────────────────────────────────────────────────────
class Parceiro(Base):
    __tablename__ = "parceiros"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    nome: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(30), default="empresa")  # empresa | associacao | instituicao | projeto_social
    contato: Mapped[str] = mapped_column(String(100), default="")
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Demanda (protocolo de atendimento) ─────────────────────────────────────
class Demanda(Base):
    __tablename__ = "demandas"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    protocolo: Mapped[str] = mapped_column(String(20), default="", index=True)
    cidadao_id: Mapped[str] = mapped_column(ForeignKey("cidadaos.id"), index=True)
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    categoria: Mapped[str] = mapped_column(String(30), default="outro")  # iluminacao | saude | transporte | infraestrutura | educacao | seguranca | outro
    descricao: Mapped[str] = mapped_column(Text, default="")
    bairro: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(20), default="recebida")  # recebida | analisada | encaminhada | em_andamento | resolvida
    prazo: Mapped[str | None] = mapped_column(String(10), nullable=True)  # YYYY-MM-DD
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Andamento (histórico da demanda) ────────────────────────────────────────
class Andamento(Base):
    __tablename__ = "andamentos"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    demanda_id: Mapped[str] = mapped_column(ForeignKey("demandas.id"), index=True)
    data: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    descricao: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Compromisso (agenda do mandato) ─────────────────────────────────────────
class Compromisso(Base):
    __tablename__ = "compromissos"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    titulo: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(30), default="outro")  # reuniao | visita | sessao | evento | audiencia | outro
    data_hora: Mapped[str] = mapped_column(String(25), default="")  # ISO 8601
    local: Mapped[str] = mapped_column(String(255), default="")
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente")  # pendente | concluido | cancelado
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# === Fase 2 (não implementado nesta versão): Projetos e Ações (projetos de
# lei, indicações, requerimentos), Mapa de Atuação territorial, Comunicação
# avançada (mensagens internas/WhatsApp/e-mail/SMS), Portal do Cidadão
# completo (upload de documentos), Assistente de IA de gabinete. Ver README.md.
