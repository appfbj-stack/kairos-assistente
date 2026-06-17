import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import require_staff
from app.models import Parceiro, User

router = APIRouter(prefix="/parceiros", tags=["parceiros"])

class ParceiroIn(BaseModel):
    nome: str
    tipo: str = "empresa"
    contato: str = ""
    observacoes: Optional[str] = None

class ParceiroOut(ParceiroIn):
    id: str
    model_config = {"from_attributes": True}

@router.get("", response_model=list[ParceiroOut])
def list_parceiros(db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    return db.query(Parceiro).filter(Parceiro.tenant_id == cu.tenant_id).all()

@router.post("", response_model=ParceiroOut, status_code=201)
def create_parceiro(payload: ParceiroIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    parceiro = Parceiro(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(parceiro); db.commit(); return parceiro

@router.put("/{parceiro_id}", response_model=ParceiroOut)
def update_parceiro(parceiro_id: str, payload: ParceiroIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    parceiro = db.query(Parceiro).filter(Parceiro.id == parceiro_id, Parceiro.tenant_id == cu.tenant_id).first()
    if not parceiro:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    for field, value in payload.model_dump().items():
        setattr(parceiro, field, value)
    db.commit(); return parceiro

@router.delete("/{parceiro_id}", status_code=204)
def delete_parceiro(parceiro_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    parceiro = db.query(Parceiro).filter(Parceiro.id == parceiro_id, Parceiro.tenant_id == cu.tenant_id).first()
    if parceiro:
        db.delete(parceiro); db.commit()
