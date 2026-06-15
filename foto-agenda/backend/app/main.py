import os, httpx
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, SessionLocal
from app.core.security import hash_password
from app.models import Base, User

Base.metadata.create_all(bind=engine)

def _seed_admin():
    email = os.getenv("ADMIN_EMAIL", "").strip()
    password = os.getenv("ADMIN_PASSWORD", "").strip()
    if not email or not password: return
    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if not existing:
            from app.models import Tenant; tenant = db.query(Tenant).first()
            if not tenant:
                tenant = Tenant(name="Default", slug="default", active=True)
                db.add(tenant); db.flush()
            user = User(tenant_id=tenant.id, email=email, password_hash=hash_password(password), name="Admin", role="admin", active=True)
            db.add(user); db.commit()
    finally: db.close()

def check_license():
    client_id = os.getenv("KAIROS_CLIENT_ID", "").strip()
    if not client_id: return print("KAIROS_CLIENT_ID não configurado")
    try:
        r = httpx.get(f"http://backend:3010/api/license/verify?client_id={client_id}&app_slug=fotoagenda", timeout=5)
        data = r.json()
        if data.get("valid"):
            print(f"✅ Licença: {data.get('status')} - {data.get('message')}")
        else:
            print(f"❌ Licença: {data.get('status')} - {data.get('message')}")
    except Exception as e:
        print(f"⚠️ Erro ao verificar licença: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    _seed_admin()
    check_license()
    yield

from app.routes import auth, admin, shoots, hermes, panel

app = FastAPI(title="FotoAgenda API", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
app.include_router(auth.router); app.include_router(admin.router); app.include_router(shoots.router); app.include_router(hermes.router); app.include_router(panel.router)

@app.get("/health")
def health(): return {"status": "ok", "app": "FotoAgenda API"}
