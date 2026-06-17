import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Compromisso, User

router = APIRouter(prefix="/agenda", tags=["agenda"])

class CompromissoIn(BaseModel):
    titulo: str
    tipo: str = "outro"
    data_hora: str
    local: str = ""
    responsavel_id: Optional[int] = None
    status: str = "pendente"
    observacoes: Optional[str] = None

class CompromissoOut(CompromissoIn):
    id: str
    model_config = {"from_attributes": True}

@router.get("", response_model=list[CompromissoOut])
def list_compromissos(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    q = db.query(Compromisso).filter(Compromisso.tenant_id == cu.tenant_id)
    if cu.role not in ("admin", "vereador", "assessor"):
        q = q.filter(Compromisso.responsavel_id == cu.id)
    return q.order_by(Compromisso.data_hora).all()

@router.post("", response_model=CompromissoOut, status_code=201)
def create_compromisso(payload: CompromissoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    compromisso = Compromisso(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(compromisso); db.commit(); return compromisso

@router.put("/{compromisso_id}", response_model=CompromissoOut)
def update_compromisso(compromisso_id: str, payload: CompromissoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    compromisso = db.query(Compromisso).filter(Compromisso.id == compromisso_id, Compromisso.tenant_id == cu.tenant_id).first()
    if not compromisso:
        raise HTTPException(status_code=404, detail="Compromisso não encontrado")
    for field, value in payload.model_dump().items():
        setattr(compromisso, field, value)
    db.commit(); return compromisso

@router.delete("/{compromisso_id}", status_code=204)
def delete_compromisso(compromisso_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    compromisso = db.query(Compromisso).filter(Compromisso.id == compromisso_id, Compromisso.tenant_id == cu.tenant_id).first()
    if compromisso:
        db.delete(compromisso); db.commit()
