from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user
from app.models import Cidadao, Compromisso, Demanda, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

def _por_categoria(db: Session, tenant_id: int):
    rows = (
        db.query(Demanda.categoria, func.count(Demanda.id))
        .filter(Demanda.tenant_id == tenant_id)
        .group_by(Demanda.categoria)
        .all()
    )
    return [{"categoria": categoria, "total": total} for categoria, total in rows]

@router.get("/stats")
def stats(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()

    if cu.role == "cidadao":
        cidadao_ids = [c.id for c in db.query(Cidadao).filter(Cidadao.linked_user_id == cu.id).all()]
        demandas_q = db.query(Demanda).filter(Demanda.tenant_id == cu.tenant_id, Demanda.cidadao_id.in_(cidadao_ids or ["__none__"]))
        return {
            "minhas_demandas": demandas_q.count(),
            "demandas_pendentes": demandas_q.filter(Demanda.status.in_(["recebida", "analisada", "encaminhada", "em_andamento"])).count(),
            "demandas_resolvidas": demandas_q.filter(Demanda.status == "resolvida").count(),
        }

    demandas_q = db.query(Demanda).filter(Demanda.tenant_id == cu.tenant_id)
    compromissos_q = db.query(Compromisso).filter(Compromisso.tenant_id == cu.tenant_id)

    return {
        "total_cidadaos": db.query(Cidadao).filter(Cidadao.tenant_id == cu.tenant_id).count(),
        "total_demandas": demandas_q.count(),
        "demandas_pendentes": demandas_q.filter(Demanda.status.in_(["recebida", "analisada", "encaminhada", "em_andamento"])).count(),
        "demandas_resolvidas": demandas_q.filter(Demanda.status == "resolvida").count(),
        "compromissos_pendentes": compromissos_q.filter(Compromisso.status == "pendente").count(),
        "proximos_compromissos": [
            {"id": c.id, "titulo": c.titulo, "tipo": c.tipo, "data_hora": c.data_hora}
            for c in compromissos_q.filter(Compromisso.status == "pendente", Compromisso.data_hora >= today)
            .order_by(Compromisso.data_hora).limit(5).all()
        ],
        "demandas_por_categoria": _por_categoria(db, cu.tenant_id),
    }
