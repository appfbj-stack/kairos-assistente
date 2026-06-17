import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import require_staff
from app.models import Cidadao, User

router = APIRouter(prefix="/cidadaos", tags=["cidadaos"])

class CidadaoIn(BaseModel):
    nome: str
    telefone: str = ""
    whatsapp: str = ""
    endereco: str = ""
    bairro: str = ""
    cidade: str = ""
    observacoes: Optional[str] = None

class CidadaoOut(CidadaoIn):
    id: str
    model_config = {"from_attributes": True}

@router.get("", response_model=list[CidadaoOut])
def list_cidadaos(db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    return db.query(Cidadao).filter(Cidadao.tenant_id == cu.tenant_id).all()

@router.get("/{cidadao_id}", response_model=CidadaoOut)
def get_cidadao(cidadao_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cidadao = db.query(Cidadao).filter(Cidadao.id == cidadao_id, Cidadao.tenant_id == cu.tenant_id).first()
    if not cidadao:
        raise HTTPException(status_code=404, detail="Cidadão não encontrado")
    return cidadao

@router.post("", response_model=CidadaoOut, status_code=201)
def create_cidadao(payload: CidadaoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cidadao = Cidadao(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(cidadao); db.commit(); return cidadao

@router.put("/{cidadao_id}", response_model=CidadaoOut)
def update_cidadao(cidadao_id: str, payload: CidadaoIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cidadao = db.query(Cidadao).filter(Cidadao.id == cidadao_id, Cidadao.tenant_id == cu.tenant_id).first()
    if not cidadao:
        raise HTTPException(status_code=404, detail="Cidadão não encontrado")
    for field, value in payload.model_dump().items():
        setattr(cidadao, field, value)
    db.commit(); return cidadao

@router.delete("/{cidadao_id}", status_code=204)
def delete_cidadao(cidadao_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cidadao = db.query(Cidadao).filter(Cidadao.id == cidadao_id, Cidadao.tenant_id == cu.tenant_id).first()
    if cidadao:
        db.delete(cidadao); db.commit()
