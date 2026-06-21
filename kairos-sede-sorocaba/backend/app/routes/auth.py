from datetime import datetime, timezone
from urllib.parse import quote
from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.core.password import verify_password
from app.deps import get_current_user, registrar_auditoria
from app.models import ConsentimentoLGPD, Tenant, Usuario
from app.services.google_oauth import exchange_code, get_auth_url, get_userinfo
from app.services.license import verify_license
from app.utils import new_id

router = APIRouter(prefix="/auth", tags=["auth"])

class UsuarioOut(BaseModel):
    id: str
    email: str
    nome: str
    perfil: str
    congregacao_id: str | None
    foto_url: str | None
    model_config = {"from_attributes": True}

@router.get("/google")
def google_login():
    return RedirectResponse(get_auth_url())

@router.get("/google/callback")
async def google_callback(code: str | None = None, request: Request = None, db: Session = Depends(get_db)):
    frontend = settings.FRONTEND_URL
    if not code:
        return RedirectResponse(f"{frontend}/login?erro=1")

    try:
        tokens = await exchange_code(code)
        userinfo = await get_userinfo(tokens["access_token"])
    except Exception:
        return RedirectResponse(f"{frontend}/login?erro=1")

    email = userinfo.get("email")
    usuario = db.query(Usuario).filter(Usuario.email == email, Usuario.ativo.is_(True)).first()
    if not usuario:
        return RedirectResponse(f"{frontend}/acesso-negado?email={quote(email or '')}")

    license_status = await verify_license()
    if not license_status.get("valid"):
        return RedirectResponse(f"{frontend}/login?erro=1")

    tenant = db.query(Tenant).filter(Tenant.id == usuario.tenant_id).first()
    if not tenant or not tenant.ativo:
        return RedirectResponse(f"{frontend}/login?erro=1")

    usuario.nome = userinfo.get("name", usuario.nome)
    usuario.foto_url = userinfo.get("picture", usuario.foto_url)
    db.commit()

    # Registra consentimento de login (LGPD: log de acesso ao sistema)
    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent", "")[:500] if request else None
    consentimento = ConsentimentoLGPD(
        id=new_id(),
        tenant_id=usuario.tenant_id,
        usuario_id=usuario.id,
        versao_termo=settings.LGPD_VERSAO_TERMO,
        finalidade="login_sistema",
        aceito=True,
        data_aceite=datetime.now(timezone.utc),
        ip=ip,
        user_agent=ua,
    )
    db.add(consentimento)
    db.commit()
    registrar_auditoria(db, usuario, "acesso", "auth", usuario.id, request, detalhes="login google oauth")

    token = create_access_token({"sub": usuario.id})
    return RedirectResponse(f"{frontend}/auth/callback?token={token}")

@router.get("/me", response_model=UsuarioOut)
def me(cu: Usuario = Depends(get_current_user)):
    return cu

class LoginIn(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login_email(body: LoginIn, request: Request = None, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(
        Usuario.email == body.email.strip().lower(),
        Usuario.ativo.is_(True),
    ).first()
    if not usuario or not verify_password(body.password, usuario.password_hash):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")

    license_status = await verify_license()
    if not license_status.get("valid"):
        raise HTTPException(status_code=403, detail="Licença do sistema inválida")

    tenant = db.query(Tenant).filter(Tenant.id == usuario.tenant_id, Tenant.ativo.is_(True)).first()
    if not tenant:
        raise HTTPException(status_code=403, detail="Tenant inativo")

    ip = request.client.host if request and request.client else None
    ua = request.headers.get("user-agent", "")[:500] if request else None
    consentimento = ConsentimentoLGPD(
        id=new_id(),
        tenant_id=usuario.tenant_id,
        usuario_id=usuario.id,
        versao_termo=settings.LGPD_VERSAO_TERMO,
        finalidade="login_sistema",
        aceito=True,
        data_aceite=datetime.now(timezone.utc),
        ip=ip,
        user_agent=ua,
    )
    db.add(consentimento)
    db.commit()
    registrar_auditoria(db, usuario, "acesso", "auth", usuario.id, request, detalhes="login email/senha")
    token = create_access_token({"sub": usuario.id})
    return {"token": token, "usuario": usuario}

@router.post("/logout")
def logout(cu: Usuario = Depends(get_current_user)):
    return {"ok": True}
