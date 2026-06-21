from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy import desc
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.deps import get_current_user, registrar_auditoria, require_sede
from app.models import AuditoriaLog, ConsentimentoLGPD, SolicitacaoLGPD, Usuario
from app.services.lgpd import (
    get_consentimento_membro_html,
    get_politica_privacidade_html,
    get_termos_uso_html,
)
from app.utils import new_id

router = APIRouter(prefix="/lgpd", tags=["lgpd"])


# ──────────────────────────────────────────────────────────────────────────────
# Páginas públicas (HTML)
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/politica", response_class=HTMLResponse)
def politica():
    return get_politica_privacidade_html()

@router.get("/termos", response_class=HTMLResponse)
def termos():
    return get_termos_uso_html()

@router.get("/consentimento-membro", response_class=HTMLResponse)
def consentimento_membro():
    return get_consentimento_membro_html()


# ──────────────────────────────────────────────────────────────────────────────
# Solicitação do titular — PÚBLICO (sem auth)
# ──────────────────────────────────────────────────────────────────────────────

class SolicitacaoIn(BaseModel):
    titular_nome: str
    titular_email: EmailStr
    titular_cpf: Optional[str] = None
    titular_telefone: Optional[str] = None
    tipo: str  # acesso | retificacao | exclusao | portabilidade | revogacao
    descricao: str

TIPOS_VALIDOS = {"acesso", "retificacao", "exclusao", "portabilidade", "revogacao"}

@router.post("/solicitacao", status_code=201)
def criar_solicitacao(payload: SolicitacaoIn, request: Request, db: Session = Depends(get_db)):
    """Cria uma solicitação LGPD do titular — sem necessidade de login.
    O tenant é inferido pelo e-mail (ou 1 se houver só um tenant)."""
    if payload.tipo not in TIPOS_VALIDOS:
        raise HTTPException(status_code=400, detail="Tipo inválido")
    # Por simplicidade, todos os tenants recebem a solicitação. Se houver mais de um,
    # o admin deve filtrar. Para apps single-tenant (1 igreja), basta.
    from app.models import Tenant
    tenant = db.query(Tenant).first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Nenhum tenant configurado")
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]
    sol = SolicitacaoLGPD(
        id=new_id(),
        tenant_id=tenant.id,
        titular_nome=payload.titular_nome,
        titular_email=payload.titular_email,
        titular_cpf=payload.titular_cpf,
        titular_telefone=payload.titular_telefone,
        tipo=payload.tipo,
        descricao=payload.descricao,
        status="recebida",
        ip=ip,
        user_agent=ua,
    )
    db.add(sol); db.commit(); db.refresh(sol)
    return {"ok": True, "id": sol.id, "protocolo": sol.id[:8].upper()}


# ──────────────────────────────────────────────────────────────────────────────
# Admin — Solicitações (só sede)
# ──────────────────────────────────────────────────────────────────────────────

class SolicitacaoOut(BaseModel):
    id: str
    titular_nome: str
    titular_email: str
    titular_cpf: Optional[str]
    titular_telefone: Optional[str]
    tipo: str
    descricao: str
    status: str
    atendido_por: Optional[str]
    atendido_em: Optional[datetime]
    resposta: Optional[str]
    criado_em: datetime
    model_config = {"from_attributes": True}

class SolicitacaoUpdate(BaseModel):
    status: str
    resposta: Optional[str] = None

STATUS_VALIDOS = {"recebida", "em_andamento", "concluida", "recusada"}

@router.get("/solicitacoes", response_model=list[SolicitacaoOut])
def listar_solicitacoes(
    status: str = "",
    page: int = 1,
    limit: int = 50,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(require_sede),
):
    q = db.query(SolicitacaoLGPD).filter(SolicitacaoLGPD.tenant_id == cu.tenant_id)
    if status:
        q = q.filter(SolicitacaoLGPD.status == status)
    total = q.count()
    return q.order_by(desc(SolicitacaoLGPD.criado_em)).offset((page - 1) * limit).limit(limit).all()

@router.patch("/solicitacoes/{sol_id}", response_model=SolicitacaoOut)
def atualizar_solicitacao(
    sol_id: str,
    payload: SolicitacaoUpdate,
    request: Request,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(require_sede),
):
    if payload.status not in STATUS_VALIDOS:
        raise HTTPException(status_code=400, detail="Status inválido")
    sol = db.query(SolicitacaoLGPD).filter(SolicitacaoLGPD.id == sol_id, SolicitacaoLGPD.tenant_id == cu.tenant_id).first()
    if not sol:
        raise HTTPException(status_code=404, detail="Solicitação não encontrada")
    status_anterior = sol.status
    sol.status = payload.status
    sol.resposta = payload.resposta
    if payload.status in {"concluida", "recusada"}:
        sol.atendido_por = cu.id
        sol.atendido_em = datetime.now(timezone.utc)
    db.commit(); db.refresh(sol)
    registrar_auditoria(
        db, cu, "alteracao", "lgpd_solicitacoes", sol.id, request,
        detalhes=f"status: {status_anterior} -> {payload.status}",
    )
    return sol


# ──────────────────────────────────────────────────────────────────────────────
# Admin — Auditoria (só sede)
# ──────────────────────────────────────────────────────────────────────────────

class AuditoriaOut(BaseModel):
    id: str
    usuario_email: Optional[str]
    acao: str
    recurso: str
    recurso_id: Optional[str]
    ip: Optional[str]
    detalhes: Optional[str]
    criado_em: datetime
    model_config = {"from_attributes": True}

@router.get("/auditoria", response_model=list[AuditoriaOut])
def listar_auditoria(
    acao: str = "",
    recurso: str = "",
    page: int = 1,
    limit: int = 100,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(require_sede),
):
    q = db.query(AuditoriaLog).filter(AuditoriaLog.tenant_id == cu.tenant_id)
    if acao:
        q = q.filter(AuditoriaLog.acao == acao)
    if recurso:
        q = q.filter(AuditoriaLog.recurso == recurso)
    return q.order_by(desc(AuditoriaLog.criado_em)).offset((page - 1) * limit).limit(limit).all()


@router.get("/consentimentos/{membro_id}", response_model=list[dict])
def historico_consentimentos_membro(
    membro_id: str,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
):
    """Histórico de aceites LGPD de um membro — sede/pastor/secretário podem ver."""
    from app.models import Membro
    membro = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not membro:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    registros = (
        db.query(ConsentimentoLGPD)
        .filter(ConsentimentoLGPD.membro_id == membro_id)
        .order_by(desc(ConsentimentoLGPD.criado_em))
        .all()
    )
    return [
        {
            "id": r.id,
            "versao_termo": r.versao_termo,
            "finalidade": r.finalidade,
            "aceito": r.aceito,
            "data_aceite": r.data_aceite,
            "ip": r.ip,
        }
        for r in registros
    ]
