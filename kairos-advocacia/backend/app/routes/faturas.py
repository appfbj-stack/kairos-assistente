import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Cliente, Fatura, Processo, User

router = APIRouter(prefix="/faturas", tags=["faturas"])

class FaturaIn(BaseModel):
    cliente_id: str
    processo_id: Optional[str] = None
    descricao: str = ""
    valor: float = 0
    data_emissao: str = ""
    data_vencimento: str = ""

class PagamentoIn(BaseModel):
    forma_pagamento: Optional[str] = None
    data_pagamento: Optional[str] = None

class FaturaOut(FaturaIn):
    id: str
    status: str
    data_pagamento: Optional[str] = None
    forma_pagamento: Optional[str] = None
    model_config = {"from_attributes": True}

def _visible_query(db: Session, cu: User):
    q = db.query(Fatura).filter(Fatura.tenant_id == cu.tenant_id)
    if cu.role == "cliente":
        cliente_ids = [c.id for c in db.query(Cliente).filter(Cliente.linked_user_id == cu.id).all()]
        q = q.filter(Fatura.cliente_id.in_(cliente_ids or ["__none__"]))
    return q

@router.get("", response_model=list[FaturaOut])
def list_faturas(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    return _visible_query(db, cu).order_by(Fatura.data_vencimento).all()

@router.post("", response_model=FaturaOut, status_code=201)
def create_fatura(payload: FaturaIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cliente = db.query(Cliente).filter(Cliente.id == payload.cliente_id, Cliente.tenant_id == cu.tenant_id).first()
    if not cliente:
        raise HTTPException(status_code=400, detail="Cliente inválido")
    if payload.processo_id:
        processo = db.query(Processo).filter(Processo.id == payload.processo_id, Processo.tenant_id == cu.tenant_id).first()
        if not processo:
            raise HTTPException(status_code=400, detail="Processo inválido")
    fatura = Fatura(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, status="pendente", **payload.model_dump())
    db.add(fatura); db.commit(); return fatura

@router.put("/{fatura_id}", response_model=FaturaOut)
def update_fatura(fatura_id: str, payload: FaturaIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.tenant_id == cu.tenant_id).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    for field, value in payload.model_dump().items():
        setattr(fatura, field, value)
    db.commit(); return fatura

@router.post("/{fatura_id}/pagar", response_model=FaturaOut)
def pagar_fatura(fatura_id: str, payload: PagamentoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.tenant_id == cu.tenant_id).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    fatura.status = "paga"
    fatura.forma_pagamento = payload.forma_pagamento
    fatura.data_pagamento = payload.data_pagamento or datetime.now(timezone.utc).date().isoformat()
    db.commit(); return fatura

@router.post("/{fatura_id}/cancelar", response_model=FaturaOut)
def cancelar_fatura(fatura_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.tenant_id == cu.tenant_id).first()
    if not fatura:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    fatura.status = "cancelada"
    db.commit(); return fatura

@router.delete("/{fatura_id}", status_code=204)
def delete_fatura(fatura_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    fatura = db.query(Fatura).filter(Fatura.id == fatura_id, Fatura.tenant_id == cu.tenant_id).first()
    if fatura:
        db.delete(fatura); db.commit()
