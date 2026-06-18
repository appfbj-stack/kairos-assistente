from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user
from app.models import Module, TenantModule, Usuario

router = APIRouter(prefix="/modules", tags=["modules"])

@router.get("")
def listar_modulos(db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user)):
    rows = (
        db.query(TenantModule)
        .join(Module, TenantModule.module_slug == Module.slug)
        .filter(
            TenantModule.tenant_id == cu.tenant_id,
            Module.ativo.is_(True),
        )
        .all()
    )
    slugs_ativos = {r.module_slug for r in rows if r.ativo}
    modulos = db.query(Module).filter(Module.ativo.is_(True)).order_by(Module.nome).all()
    return [
        {"slug": m.slug, "nome": m.nome, "active": m.slug in slugs_ativos}
        for m in modulos
    ]
