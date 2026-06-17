import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Cliente, Movimentacao, Processo, User

router = APIRouter(prefix="/processos", tags=["processos"])

class ProcessoIn(BaseModel):
    numero: str = ""
    cliente_id: str
    advogado_id: Optional[int] = None
    area: str = ""
    tribunal: str = ""
    vara: str = ""
    status: str = "ativo"
    valor_causa: float = 0
    data_distribuicao: str = ""
    descricao: Optional[str] = None

class ProcessoOut(ProcessoIn):
    id: str
    model_config = {"from_attributes": True}

class MovimentacaoIn(BaseModel):
    data: str
    tipo: str = "andamento"
    descricao: str

class MovimentacaoOut(MovimentacaoIn):
    id: str
    processo_id: str
    model_config = {"from_attributes": True}

def _visible_query(db: Session, cu: User):
    q = db.query(Processo).filter(Processo.tenant_id == cu.tenant_id)
    if cu.role == "cliente":
        cliente_ids = [c.id for c in db.query(Cliente).filter(Cliente.linked_user_id == cu.id).all()]
        q = q.filter(Processo.cliente_id.in_(cliente_ids or ["__none__"]))
    return q

@router.get("", response_model=list[ProcessoOut])
def list_processos(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    return _visible_query(db, cu).all()

@router.get("/{processo_id}", response_model=ProcessoOut)
def get_processo(processo_id: str, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    processo = _visible_query(db, cu).filter(Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    return processo

@router.post("", response_model=ProcessoOut, status_code=201)
def create_processo(payload: ProcessoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cliente = db.query(Cliente).filter(Cliente.id == payload.cliente_id, Cliente.tenant_id == cu.tenant_id).first()
    if not cliente:
        raise HTTPException(status_code=400, detail="Cliente inválido")
    processo = Processo(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(processo); db.commit(); return processo

@router.put("/{processo_id}", response_model=ProcessoOut)
def update_processo(processo_id: str, payload: ProcessoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    processo = db.query(Processo).filter(Processo.id == processo_id, Processo.tenant_id == cu.tenant_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    for field, value in payload.model_dump().items():
        setattr(processo, field, value)
    db.commit(); return processo

@router.delete("/{processo_id}", status_code=204)
def delete_processo(processo_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    processo = db.query(Processo).filter(Processo.id == processo_id, Processo.tenant_id == cu.tenant_id).first()
    if processo:
        db.delete(processo); db.commit()

# ── Movimentações ───────────────────────────────────────────────────────────
@router.get("/{processo_id}/movimentacoes", response_model=list[MovimentacaoOut])
def list_movimentacoes(processo_id: str, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    processo = _visible_query(db, cu).filter(Processo.id == processo_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    return db.query(Movimentacao).filter(Movimentacao.processo_id == processo_id).order_by(Movimentacao.data.desc()).all()

@router.post("/{processo_id}/movimentacoes", response_model=MovimentacaoOut, status_code=201)
def create_movimentacao(processo_id: str, payload: MovimentacaoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    processo = db.query(Processo).filter(Processo.id == processo_id, Processo.tenant_id == cu.tenant_id).first()
    if not processo:
        raise HTTPException(status_code=404, detail="Processo não encontrado")
    mov = Movimentacao(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, processo_id=processo_id, **payload.model_dump())
    db.add(mov); db.commit(); return mov

@router.delete("/{processo_id}/movimentacoes/{mov_id}", status_code=204)
def delete_movimentacao(processo_id: str, mov_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    mov = db.query(Movimentacao).filter(Movimentacao.id == mov_id, Movimentacao.processo_id == processo_id, Movimentacao.tenant_id == cu.tenant_id).first()
    if mov:
        db.delete(mov); db.commit()
