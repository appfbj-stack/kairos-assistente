import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, SessionLocal
from app.core.security import hash_password
from app.models import Base, Tenant, User
from app.services.license import verify_license

Base.metadata.create_all(bind=engine)

def _seed_admin():
    email = os.getenv("ADMIN_EMAIL", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not email or not password:
        return
    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            return
        tenant = db.query(Tenant).first()
        if not tenant:
            tenant = Tenant(name="Escritório", slug="escritorio", active=True)
            db.add(tenant); db.flush()
        user = User(tenant_id=tenant.id, email=email, password_hash=hash_password(password),
                    name="Administrador", role="admin", active=True)
        db.add(user); db.commit()
    finally:
        db.close()

async def _check_license():
    result = await verify_license()
    if result.get("valid"):
        print(f"✅ Licença Kairos: {result.get('status')} - {result.get('message', '')}")
    else:
        print(f"❌ Licença Kairos: {result.get('status')} - {result.get('message', '')}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_admin()
    await _check_license()
    yield

from app.routes import agenda, auth, clientes, dashboard, documentos, faturas, processos, users

app = FastAPI(title="Kairos Advocacia API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(clientes.router)
app.include_router(processos.router)
app.include_router(agenda.router)
app.include_router(faturas.router)
app.include_router(documentos.router)
app.include_router(dashboard.router)

@app.get("/health")
def health():
    return {"status": "ok", "app": "Kairos Advocacia API"}
