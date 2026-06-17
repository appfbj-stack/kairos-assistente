import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import require_staff
from app.models import Lideranca, User

router = APIRouter(prefix="/liderancas", tags=["liderancas"])

class LiderancaIn(BaseModel):
    nome: str
    regiao: str = ""
    comunidade: str = ""
    area_atuacao: str = ""
    contato: str = ""
    observacoes: Optional[str] = None

class LiderancaOut(LiderancaIn):
    id: str
    model_config = {"from_attributes": True}

@router.get("", response_model=list[LiderancaOut])
def list_liderancas(db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    return db.query(Lideranca).filter(Lideranca.tenant_id == cu.tenant_id).all()

@router.post("", response_model=LiderancaOut, status_code=201)
def create_lideranca(payload: LiderancaIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    lideranca = Lideranca(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(lideranca); db.commit(); return lideranca

@router.put("/{lideranca_id}", response_model=LiderancaOut)
def update_lideranca(lideranca_id: str, payload: LiderancaIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    lideranca = db.query(Lideranca).filter(Lideranca.id == lideranca_id, Lideranca.tenant_id == cu.tenant_id).first()
    if not lideranca:
        raise HTTPException(status_code=404, detail="Liderança não encontrada")
    for field, value in payload.model_dump().items():
        setattr(lideranca, field, value)
    db.commit(); return lideranca

@router.delete("/{lideranca_id}", status_code=204)
def delete_lideranca(lideranca_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    lideranca = db.query(Lideranca).filter(Lideranca.id == lideranca_id, Lideranca.tenant_id == cu.tenant_id).first()
    if lideranca:
        db.delete(lideranca); db.commit()
