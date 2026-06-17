from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models import Tenant, User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> User:
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido")
    user = db.query(User).filter(User.id == int(payload["sub"]), User.active.is_(True)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Usuário não encontrado")
    tenant = db.query(Tenant).filter(Tenant.id == user.tenant_id).first()
    if tenant and not tenant.active:
        raise HTTPException(status_code=402, detail="Assinatura suspensa. Entre em contato com o administrador.")
    return user

def require_roles(*roles: str):
    def _check(cu: User = Depends(get_current_user)) -> User:
        if cu.role not in roles:
            raise HTTPException(status_code=403, detail="Acesso não permitido para o seu perfil")
        return cu
    return _check

# Atalhos comuns
require_staff = require_roles("admin", "vereador", "assessor")
require_admin = require_roles("admin")
