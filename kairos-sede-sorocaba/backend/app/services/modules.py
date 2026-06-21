from app.core.database import SessionLocal
from app.models import Module, Tenant, TenantModule
from app.utils import new_id

MODULOS_PADRAO = [
    {"slug": "membros", "nome": "Membros"},
    {"slug": "obreiros", "nome": "Obreiros"},
    {"slug": "carteirinhas", "nome": "Carteirinhas"},
    {"slug": "patrimonio", "nome": "Patrimônio"},
    {"slug": "agenda", "nome": "Agenda"},
    {"slug": "batismos", "nome": "Batismos"},
    {"slug": "congregacoes", "nome": "Congregações"},
    {"slug": "usuarios", "nome": "Usuários"},
    {"slug": "dashboard", "nome": "Dashboard"},
    {"slug": "lgpd", "nome": "LGPD — Proteção de Dados"},
]

def seed_modules():
    """Garante que todos os módulos padrão existam no banco, ativados para o tenant inicial."""
    db = SessionLocal()
    try:
        existing = {m.slug for m in db.query(Module).all()}
        for data in MODULOS_PADRAO:
            if data["slug"] not in existing:
                module = Module(id=new_id(), slug=data["slug"], nome=data["nome"], ativo=True)
                db.add(module)

        tenant = db.query(Tenant).first()
        if tenant:
            for data in MODULOS_PADRAO:
                existing_rel = db.query(TenantModule).filter(
                    TenantModule.tenant_id == tenant.id,
                    TenantModule.module_slug == data["slug"],
                ).first()
                if not existing_rel:
                    rel = TenantModule(tenant_id=tenant.id, module_slug=data["slug"], ativo=True)
                    db.add(rel)

        db.commit()
    finally:
        db.close()

def get_active_modules(tenant_id: int) -> list[str]:
    """Retorna slugs dos módulos ativos para um tenant."""
    from app.core.database import SessionLocal
    db = SessionLocal()
    try:
        rows = (
            db.query(TenantModule)
            .join(Module, TenantModule.module_slug == Module.slug)
            .filter(
                TenantModule.tenant_id == tenant_id,
                TenantModule.ativo.is_(True),
                Module.ativo.is_(True),
            )
            .all()
        )
        return [r.module_slug for r in rows]
    finally:
        db.close()
