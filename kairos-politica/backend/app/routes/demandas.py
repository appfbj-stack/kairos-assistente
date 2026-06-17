import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Andamento, Cidadao, Demanda, User

router = APIRouter(prefix="/demandas", tags=["demandas"])

class DemandaIn(BaseModel):
    cidadao_id: Optional[str] = None  # obrigatório para equipe; ignorado no portal do cidadão
    responsavel_id: Optional[int] = None
    categoria: str = "outro"
    descricao: str = ""
    bairro: str = ""
    status: str = "recebida"
    prazo: Optional[str] = None

class DemandaOut(BaseModel):
    id: str
    protocolo: str
    cidadao_id: str
    responsavel_id: Optional[int] = None
    categoria: str
    descricao: str
    bairro: str
    status: str
    prazo: Optional[str] = None
    model_config = {"from_attributes": True}

class AndamentoIn(BaseModel):
    descricao: str

class AndamentoOut(BaseModel):
    id: str
    demanda_id: str
    data: str
    descricao: str
    model_config = {"from_attributes": True}

def _own_cidadao(db: Session, cu: User) -> Cidadao | None:
    return db.query(Cidadao).filter(Cidadao.linked_user_id == cu.id, Cidadao.tenant_id == cu.tenant_id).first()

def _visible_query(db: Session, cu: User):
    q = db.query(Demanda).filter(Demanda.tenant_id == cu.tenant_id)
    if cu.role == "cidadao":
        cidadao = _own_cidadao(db, cu)
        q = q.filter(Demanda.cidadao_id == (cidadao.id if cidadao else "__none__"))
    return q

def _gerar_protocolo(db: Session, tenant_id: int) -> str:
    ano = datetime.now(timezone.utc).year
    total = db.query(Demanda).filter(Demanda.tenant_id == tenant_id).count()
    return f"{ano}-{total + 1:05d}"

@router.get("", response_model=list[DemandaOut])
def list_demandas(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    return _visible_query(db, cu).order_by(Demanda.created_at.desc()).all()

@router.get("/{demanda_id}", response_model=DemandaOut)
def get_demanda(demanda_id: str, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    demanda = _visible_query(db, cu).filter(Demanda.id == demanda_id).first()
    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    return demanda

@router.post("", response_model=DemandaOut, status_code=201)
def create_demanda(payload: DemandaIn, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    if cu.role == "cidadao":
        cidadao = _own_cidadao(db, cu)
        if not cidadao:
            raise HTTPException(status_code=400, detail="Cadastro de cidadão não encontrado para este usuário")
        cidadao_id = cidadao.id
        responsavel_id = None
    else:
        if cu.role not in ("admin", "vereador", "assessor"):
            raise HTTPException(status_code=403, detail="Acesso não permitido para o seu perfil")
        if not payload.cidadao_id:
            raise HTTPException(status_code=400, detail="cidadao_id é obrigatório")
        cidadao = db.query(Cidadao).filter(Cidadao.id == payload.cidadao_id, Cidadao.tenant_id == cu.tenant_id).first()
        if not cidadao:
            raise HTTPException(status_code=400, detail="Cidadão inválido")
        cidadao_id = cidadao.id
        responsavel_id = payload.responsavel_id

    demanda = Demanda(
        id=str(uuid.uuid4()), tenant_id=cu.tenant_id, protocolo=_gerar_protocolo(db, cu.tenant_id),
        cidadao_id=cidadao_id, responsavel_id=responsavel_id, categoria=payload.categoria,
        descricao=payload.descricao, bairro=payload.bairro, status="recebida", prazo=payload.prazo,
    )
    db.add(demanda); db.commit(); return demanda

@router.put("/{demanda_id}", response_model=DemandaOut)
def update_demanda(demanda_id: str, payload: DemandaIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id, Demanda.tenant_id == cu.tenant_id).first()
    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    demanda.responsavel_id = payload.responsavel_id
    demanda.categoria = payload.categoria
    demanda.descricao = payload.descricao
    demanda.bairro = payload.bairro
    demanda.status = payload.status
    demanda.prazo = payload.prazo
    db.commit(); return demanda

@router.delete("/{demanda_id}", status_code=204)
def delete_demanda(demanda_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id, Demanda.tenant_id == cu.tenant_id).first()
    if demanda:
        db.delete(demanda); db.commit()

# ── Andamentos (histórico da demanda) ──────────────────────────────────────
@router.get("/{demanda_id}/andamentos", response_model=list[AndamentoOut])
def list_andamentos(demanda_id: str, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    demanda = _visible_query(db, cu).filter(Demanda.id == demanda_id).first()
    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    return db.query(Andamento).filter(Andamento.demanda_id == demanda_id).order_by(Andamento.created_at.desc()).all()

@router.post("/{demanda_id}/andamentos", response_model=AndamentoOut, status_code=201)
def create_andamento(demanda_id: str, payload: AndamentoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    demanda = db.query(Demanda).filter(Demanda.id == demanda_id, Demanda.tenant_id == cu.tenant_id).first()
    if not demanda:
        raise HTTPException(status_code=404, detail="Demanda não encontrada")
    andamento = Andamento(
        id=str(uuid.uuid4()), tenant_id=cu.tenant_id, demanda_id=demanda_id,
        data=datetime.now(timezone.utc).date().isoformat(), descricao=payload.descricao,
    )
    db.add(andamento); db.commit(); return andamento
