from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import hash_password
from app.deps import get_current_user, require_admin
from app.models import ROLES, User

router = APIRouter(prefix="/users", tags=["users"])

class UserIn(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    role: str = "advogado"
    active: bool = True

class UserOut(BaseModel):
    id: int; name: str; email: str; role: str; active: bool
    model_config = {"from_attributes": True}

@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    return db.query(User).filter(User.tenant_id == cu.tenant_id).all()

@router.post("", response_model=UserOut, status_code=201)
def create_user(payload: UserIn, db: Session = Depends(get_db), cu: User = Depends(require_admin)):
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Perfil inválido")
    if not payload.password:
        raise HTTPException(status_code=400, detail="Senha obrigatória para novo usuário")
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    user = User(tenant_id=cu.tenant_id, name=payload.name, email=payload.email,
                password_hash=hash_password(payload.password), role=payload.role, active=payload.active)
    db.add(user); db.commit(); db.refresh(user)
    return user

@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: int, payload: UserIn, db: Session = Depends(get_db), cu: User = Depends(require_admin)):
    user = db.query(User).filter(User.id == user_id, User.tenant_id == cu.tenant_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if payload.role not in ROLES:
        raise HTTPException(status_code=400, detail="Perfil inválido")
    user.name = payload.name; user.email = payload.email
    user.role = payload.role; user.active = payload.active
    if payload.password:
        user.password_hash = hash_password(payload.password)
    db.commit(); return user

@router.delete("/{user_id}", status_code=204)
def delete_user(user_id: int, db: Session = Depends(get_db), cu: User = Depends(require_admin)):
    if user_id == cu.id:
        raise HTTPException(status_code=400, detail="Não é possível remover o próprio usuário")
    user = db.query(User).filter(User.id == user_id, User.tenant_id == cu.tenant_id).first()
    if user:
        db.delete(user); db.commit()
