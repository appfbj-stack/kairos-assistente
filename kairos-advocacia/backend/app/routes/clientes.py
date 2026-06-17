import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import require_staff
from app.models import Cliente, User

router = APIRouter(prefix="/clientes", tags=["clientes"])

class ClienteIn(BaseModel):
    tipo: str = "pessoa_fisica"
    nome: str
    documento: str = ""
    email: str = ""
    telefone: str = ""
    endereco: Optional[str] = None
    observacoes: Optional[str] = None

class ClienteOut(ClienteIn):
    id: str
    model_config = {"from_attributes": True}

@router.get("", response_model=list[ClienteOut])
def list_clientes(db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    return db.query(Cliente).filter(Cliente.tenant_id == cu.tenant_id).all()

@router.get("/{cliente_id}", response_model=ClienteOut)
def get_cliente(cliente_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == cu.tenant_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    return cliente

@router.post("", response_model=ClienteOut, status_code=201)
def create_cliente(payload: ClienteIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cliente = Cliente(id=str(uuid.uuid4()), tenant_id=cu.tenant_id, **payload.model_dump())
    db.add(cliente); db.commit(); return cliente

@router.put("/{cliente_id}", response_model=ClienteOut)
def update_cliente(cliente_id: str, payload: ClienteIn, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == cu.tenant_id).first()
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
    for field, value in payload.model_dump().items():
        setattr(cliente, field, value)
    db.commit(); return cliente

@router.delete("/{cliente_id}", status_code=204)
def delete_cliente(cliente_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == cu.tenant_id).first()
    if cliente:
        db.delete(cliente); db.commit()
