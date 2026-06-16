# Template Kairos Pro

**Para apps robustos com PostgreSQL, autenticação JWT e multi-usuário.**

---

## Estrutura de Pastas

```
meu-app-pro/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── models.py            # SQLAlchemy models
│   │   ├── deps.py              # Dependency injection
│   │   ├── core/
│   │   │   ├── config.py        # Settings (pydantic)
│   │   │   ├── database.py      # PostgreSQL session
│   │   │   └── security.py      # JWT + bcrypt
│   │   ├── routes/
│   │   │   ├── auth.py          # Login, register
│   │   │   ├── users.py         # Gestão de usuários
│   │   │   └── {dominio}.py     # Rotas específicas do app
│   │   └── services/
│   │       └── license.py       # Verificação Kairos Admin
│   ├── requirements.txt
│   ├── Dockerfile
│   └── alembic/                 # Migrações
│       └── versions/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   ├── Layout.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── hooks/
│   │   │   └── useAuth.ts
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   └── Dashboard.tsx
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
│
├── docker-compose.yml
└── .env.example
```

---

## Arquivo: `backend/app/core/config.py`

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # App
    APP_NAME: str = "Meu App Pro"
    APP_SLUG: str = "meu-app"  # Registrar no Kairos Admin
    
    # Database
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    POSTGRES_DB: str = "meuapp"
    POSTGRES_USER: str = "meuapp"
    POSTGRES_PASSWORD: str = "senha123"
    
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
    
    # JWT
    SECRET_KEY: str = "troque-esta-chave-secreta"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 dias
    
    # Kairos Admin
    KAIROS_ADMIN_URL: str = "http://kairos-backend:3010"
    KAIROS_CLIENT_ID: str = ""  # UUID do cliente no Kairos Admin
    
    # Admin inicial
    ADMIN_EMAIL: str = "admin@meuapp.com"
    ADMIN_PASSWORD: str = "admin123"
    
    class Config:
        env_file = ".env"

settings = Settings()
```

---

## Arquivo: `backend/app/services/license.py`

```python
import httpx
from app.core.config import settings

async def verify_license() -> dict:
    """Verifica se a licença do app está ativa no Kairos Admin."""
    url = f"{settings.KAIROS_ADMIN_URL}/api/license/verify"
    params = {
        "client_id": settings.KAIROS_CLIENT_ID,
        "app_slug": settings.APP_SLUG,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.get(url, params=params)
            return res.json()
    except Exception:
        # Se Kairos Admin não acessível, permite acesso (fail-open)
        return {"valid": True, "status": "unknown", "message": "Kairos Admin inacessível"}

async def check_license_or_raise():
    """Lança exceção se licença inválida."""
    from fastapi import HTTPException
    result = await verify_license()
    if not result.get("valid"):
        raise HTTPException(
            status_code=403,
            detail=result.get("message", "Licença inválida ou expirada.")
        )
    return result
```

---

## Arquivo: `backend/app/models.py`

```python
from sqlalchemy import Column, String, Boolean, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime
import uuid

Base = declarative_base()

def gen_id():
    return str(uuid.uuid4())

class Tenant(Base):
    """Multi-tenant: cada cliente tem seu próprio tenant."""
    __tablename__ = "tenants"
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, index=True)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    users = relationship("User", back_populates="tenant")

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"))
    email = Column(String(255), unique=True, index=True)
    password_hash = Column(String(255))
    name = Column(String(255))
    role = Column(String(50), default="admin")  # admin, super_admin, viewer
    active = Column(Boolean, default=True)
    tenant = relationship("Tenant", back_populates="users")

# === ADICIONE AQUI AS ENTIDADES DO SEU DOMÍNIO ===
# Exemplo para Igreja:
# class Membro(Base):
#     __tablename__ = "membros"
#     id = Column(String(50), primary_key=True, default=gen_id)
#     tenant_id = Column(Integer, ForeignKey("tenants.id"), index=True)
#     nome = Column(String(255))
#     telefone = Column(String(50))
#     status = Column(String(50), default="ativo")
#     created_at = Column(DateTime, default=datetime.utcnow)
```

---

## Arquivo: `backend/app/routes/auth.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, create_access_token, get_password_hash
from app.models import User, Tenant
from app.services.license import check_license_or_raise
from pydantic import BaseModel

router = APIRouter()

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    tenant_name: str

@router.post("/login")
async def login(data: LoginRequest, db: Session = Depends(get_db)):
    # Verifica licença no Kairos Admin
    await check_license_or_raise()
    
    user = db.query(User).filter(User.email == data.email, User.active == True).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")
    
    token = create_access_token({"sub": str(user.id), "tenant_id": user.tenant_id})
    return {"access_token": token, "token_type": "bearer", "user": {"name": user.name, "role": user.role}}

@router.post("/register")
async def register(data: RegisterRequest, db: Session = Depends(get_db)):
    await check_license_or_raise()
    
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    tenant = Tenant(name=data.tenant_name, slug=data.tenant_name.lower().replace(" ", "-"))
    db.add(tenant)
    db.flush()
    
    user = User(
        tenant_id=tenant.id,
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
        role="admin"
    )
    db.add(user)
    db.commit()
    
    token = create_access_token({"sub": str(user.id), "tenant_id": tenant.id})
    return {"access_token": token, "token_type": "bearer"}
```

---

## Arquivo: `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: meuapp
      POSTGRES_USER: meuapp
      POSTGRES_PASSWORD: senha123
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U meuapp"]
      interval: 5s
      retries: 10

  backend:
    build: ./backend
    ports:
      - "8010:8000"    # Escolha uma porta livre (8010, 8020, etc.)
    environment:
      - KAIROS_ADMIN_URL=http://kairos-backend:3010
      - KAIROS_CLIENT_ID=${KAIROS_CLIENT_ID}
      - POSTGRES_HOST=postgres
      - SECRET_KEY=${SECRET_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - default
      - kairos_network    # Rede compartilhada com o Kairos Admin

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: http://backend:8000
    ports:
      - "3020:80"    # Escolha uma porta livre (3020, 3025, etc.)
    depends_on:
      - backend

volumes:
  postgres_data:

networks:
  kairos_network:
    external: true    # Criada pelo docker-compose do Kairos Admin
```

---

## Arquivo: `.env.example`

```env
# Kairos Admin
KAIROS_CLIENT_ID=cole-o-uuid-do-cliente-aqui

# Segurança
SECRET_KEY=gere-uma-chave-aleatoria-segura

# Banco (opcional, já tem defaults)
POSTGRES_PASSWORD=senha-segura-aqui
```

---

## Arquivo: `frontend/src/hooks/useAuth.ts`

```typescript
import { useState, useEffect } from "react";

interface User { name: string; role: string; }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem("token");
    const u = localStorage.getItem("user");
    if (t && u) { setToken(t); setUser(JSON.parse(u)); }
  }, []);

  function login(token: string, user: User) {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    setToken(token); setUser(user);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null); setUser(null);
  }

  return { user, token, isAuthenticated: !!token, login, logout };
}
```

---

## Checklist de Novo App Pro

- [ ] Registrar app no Kairos Admin (slug + nome + URL)
- [ ] Obter `KAIROS_CLIENT_ID` do cliente no Kairos Admin
- [ ] Criar licença no Kairos Admin para o cliente
- [ ] Definir entidades do domínio em `models.py`
- [ ] Criar rotas CRUD específicas
- [ ] Configurar porta única no VPS (ex: backend 8010, frontend 3020)
- [ ] Adicionar ao `docker-compose.yml` do VPS
- [ ] Conectar à rede `kairos_network` para comunicação interna
- [ ] Deploy e teste de verificação de licença
