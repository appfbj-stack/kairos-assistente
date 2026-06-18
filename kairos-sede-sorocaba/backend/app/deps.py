from fastapi import Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_token
from app.models import Module, Tenant, TenantModule, Usuario

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

def get_current_user(db: Session = Depends(get_db), token: str | None = Depends(oauth2_scheme)) -> Usuario:
    if not token:
        raise HTTPException(status_code=401, detail="Token não fornecido")
    try:
        payload = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Token inválido ou expirado")
    usuario = db.query(Usuario).filter(Usuario.id == payload["sub"], Usuario.ativo.is_(True)).first()
    if not usuario:
        raise HTTPException(status_code=401, detail="Usuário inativo ou não encontrado")
    tenant = db.query(Tenant).filter(Tenant.id == usuario.tenant_id).first()
    if tenant and not tenant.ativo:
        raise HTTPException(status_code=402, detail="Assinatura suspensa. Entre em contato com o administrador.")
    return usuario

def require_roles(*perfis: str):
    def _check(cu: Usuario = Depends(get_current_user)) -> Usuario:
        if cu.perfil not in perfis:
            raise HTTPException(status_code=403, detail="Acesso não permitido")
        return cu
    return _check

require_sede = require_roles("sede")

def require_module(slug: str):
    def _check(db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user)) -> None:
        ativo = (
            db.query(TenantModule)
            .join(Module, TenantModule.module_slug == Module.slug)
            .filter(
                TenantModule.tenant_id == cu.tenant_id,
                TenantModule.module_slug == slug,
                TenantModule.ativo.is_(True),
                Module.ativo.is_(True),
            )
            .first()
        )
        if not ativo:
            raise HTTPException(status_code=403, detail=f"Módulo '{slug}' não está ativo")
    return _check

def congregacao_filter(cu: Usuario = Depends(get_current_user)) -> str | None:
    """Mirror do middleware filtrarCongregacao original: usuários 'sede' veem tudo,
    demais perfis são restritos à própria congregação."""
    return None if cu.perfil == "sede" else cu.congregacao_id
