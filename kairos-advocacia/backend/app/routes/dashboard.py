from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.deps import get_current_user
from app.models import Cliente, Compromisso, Fatura, Processo, User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/stats")
def stats(db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    today = datetime.now(timezone.utc).date().isoformat()

    if cu.role == "cliente":
        cliente_ids = [c.id for c in db.query(Cliente).filter(Cliente.linked_user_id == cu.id).all()]
        processos_q = db.query(Processo).filter(Processo.tenant_id == cu.tenant_id, Processo.cliente_id.in_(cliente_ids or ["__none__"]))
        faturas_q = db.query(Fatura).filter(Fatura.tenant_id == cu.tenant_id, Fatura.cliente_id.in_(cliente_ids or ["__none__"]))
        return {
            "meus_processos": processos_q.count(),
            "processos_ativos": processos_q.filter(Processo.status == "ativo").count(),
            "faturas_pendentes": faturas_q.filter(Fatura.status == "pendente").count(),
            "valor_pendente": faturas_q.filter(Fatura.status == "pendente").with_entities(func.sum(Fatura.valor)).scalar() or 0,
        }

    processos_q = db.query(Processo).filter(Processo.tenant_id == cu.tenant_id)
    compromissos_q = db.query(Compromisso).filter(Compromisso.tenant_id == cu.tenant_id)
    faturas_q = db.query(Fatura).filter(Fatura.tenant_id == cu.tenant_id)
    mes_atual = today[:7]

    return {
        "total_clientes": db.query(Cliente).filter(Cliente.tenant_id == cu.tenant_id).count(),
        "total_processos": processos_q.count(),
        "processos_ativos": processos_q.filter(Processo.status == "ativo").count(),
        "valor_causas_ativas": processos_q.filter(Processo.status == "ativo").with_entities(func.sum(Processo.valor_causa)).scalar() or 0,
        "compromissos_pendentes": compromissos_q.filter(Compromisso.status == "pendente").count(),
        "proximos_compromissos": [
            {"id": c.id, "titulo": c.titulo, "tipo": c.tipo, "data_hora": c.data_hora}
            for c in compromissos_q.filter(Compromisso.status == "pendente", Compromisso.data_hora >= today)
            .order_by(Compromisso.data_hora).limit(5).all()
        ],
        "a_receber": faturas_q.filter(Fatura.status == "pendente").with_entities(func.sum(Fatura.valor)).scalar() or 0,
        "recebido_mes": faturas_q.filter(Fatura.status == "paga", Fatura.data_pagamento.like(f"{mes_atual}%")).with_entities(func.sum(Fatura.valor)).scalar() or 0,
        "faturas_atrasadas": faturas_q.filter(Fatura.status == "pendente", Fatura.data_vencimento < today).count(),
    }
