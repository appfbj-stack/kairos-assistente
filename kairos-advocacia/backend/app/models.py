from datetime import datetime, timezone
from sqlalchemy import Boolean, DateTime, ForeignKey, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

def utcnow(): return datetime.now(timezone.utc)

ROLES = ["admin", "advogado", "assistente_juridico", "cliente"]

# ── Tenant (escritório de advocacia) ───────────────────────────────────────────
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
    role: Mapped[str] = mapped_column(String(50), default="admin")  # admin | advogado | assistente_juridico | cliente
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Cliente (cliente do escritório, pessoa física ou jurídica) ─────────────────
class Cliente(Base):
    __tablename__ = "clientes"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    tipo: Mapped[str] = mapped_column(String(20), default="pessoa_fisica")  # pessoa_fisica | pessoa_juridica
    nome: Mapped[str] = mapped_column(String(255))
    documento: Mapped[str] = mapped_column(String(30), default="")  # CPF ou CNPJ
    email: Mapped[str] = mapped_column(String(255), default="")
    telefone: Mapped[str] = mapped_column(String(50), default="")
    endereco: Mapped[str | None] = mapped_column(Text, nullable=True)
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    linked_user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)  # acesso ao portal do cliente
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Processo ──────────────────────────────────────────────────────────────────
class Processo(Base):
    __tablename__ = "processos"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    numero: Mapped[str] = mapped_column(String(50), default="")
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    advogado_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    area: Mapped[str] = mapped_column(String(100), default="")
    tribunal: Mapped[str] = mapped_column(String(100), default="")
    vara: Mapped[str] = mapped_column(String(100), default="")
    status: Mapped[str] = mapped_column(String(30), default="ativo")  # ativo | suspenso | arquivado | encerrado
    valor_causa: Mapped[float] = mapped_column(Float, default=0)
    data_distribuicao: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Movimentação (linha do tempo do processo) ──────────────────────────────────
class Movimentacao(Base):
    __tablename__ = "movimentacoes"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    processo_id: Mapped[str] = mapped_column(ForeignKey("processos.id"), index=True)
    data: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    tipo: Mapped[str] = mapped_column(String(30), default="andamento")  # andamento | prazo | audiencia | decisao
    descricao: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Compromisso (agenda jurídica) ───────────────────────────────────────────────
class Compromisso(Base):
    __tablename__ = "compromissos"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    titulo: Mapped[str] = mapped_column(String(255))
    tipo: Mapped[str] = mapped_column(String(30), default="outro")  # audiencia | prazo | reuniao | outro
    data_hora: Mapped[str] = mapped_column(String(25), default="")  # ISO 8601
    local: Mapped[str] = mapped_column(String(255), default="")
    processo_id: Mapped[str | None] = mapped_column(ForeignKey("processos.id"), nullable=True)
    responsavel_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pendente")  # pendente | concluido | cancelado
    observacoes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# ── Fatura (financeiro) ─────────────────────────────────────────────────────
class Fatura(Base):
    __tablename__ = "faturas"
    id: Mapped[str] = mapped_column(String(50), primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    cliente_id: Mapped[str] = mapped_column(ForeignKey("clientes.id"), index=True)
    processo_id: Mapped[str | None] = mapped_column(ForeignKey("processos.id"), nullable=True)
    descricao: Mapped[str] = mapped_column(String(255), default="")
    valor: Mapped[float] = mapped_column(Float, default=0)
    data_emissao: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    data_vencimento: Mapped[str] = mapped_column(String(10), default="")  # YYYY-MM-DD
    status: Mapped[str] = mapped_column(String(20), default="pendente")  # pendente | paga | cancelada
    data_pagamento: Mapped[str | None] = mapped_column(String(10), nullable=True)
    forma_pagamento: Mapped[str | None] = mapped_column(String(30), nullable=True)  # pix | boleto | cartao | transferencia
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

# === Fase 2 restante (não implementado nesta versão): Documento (MinIO +
# assinatura digital), Mensagem (chat interno), integração de IA jurídica e
# login OAuth Google. Ver README.md.
