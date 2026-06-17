import os
import uuid
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.deps import get_current_user, require_staff
from app.models import Cliente, Documento, Processo, User

router = APIRouter(prefix="/documentos", tags=["documentos"])

CATEGORIAS = {"peticao", "contrato", "comprovante", "documento_pessoal", "outro"}
MAX_SIZE = 20 * 1024 * 1024  # 20 MB

class DocumentoOut(BaseModel):
    id: str
    cliente_id: str
    processo_id: Optional[str] = None
    categoria: str
    nome_original: str
    mime_type: str
    tamanho: int
    created_at: datetime
    model_config = {"from_attributes": True}

def _visible_query(db: Session, cu: User):
    q = db.query(Documento).filter(Documento.tenant_id == cu.tenant_id)
    if cu.role == "cliente":
        cliente_ids = [c.id for c in db.query(Cliente).filter(Cliente.linked_user_id == cu.id).all()]
        q = q.filter(Documento.cliente_id.in_(cliente_ids or ["__none__"]))
    return q

def _tenant_dir(tenant_id: int) -> str:
    path = os.path.join(settings.STORAGE_DIR, str(tenant_id))
    os.makedirs(path, exist_ok=True)
    return path

def _safe_ext(filename: str) -> str:
    ext = os.path.splitext(filename or "")[1][:10]
    if ext.startswith(".") and ext[1:].isalnum():
        return ext
    return ""

@router.get("", response_model=list[DocumentoOut])
def list_documentos(
    cliente_id: Optional[str] = None,
    processo_id: Optional[str] = None,
    db: Session = Depends(get_db),
    cu: User = Depends(get_current_user),
):
    q = _visible_query(db, cu)
    if cliente_id:
        q = q.filter(Documento.cliente_id == cliente_id)
    if processo_id:
        q = q.filter(Documento.processo_id == processo_id)
    return q.order_by(Documento.created_at.desc()).all()

@router.post("", response_model=DocumentoOut, status_code=201)
def upload_documento(
    cliente_id: str = Form(...),
    processo_id: Optional[str] = Form(None),
    categoria: str = Form("outro"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    cu: User = Depends(require_staff),
):
    cliente = db.query(Cliente).filter(Cliente.id == cliente_id, Cliente.tenant_id == cu.tenant_id).first()
    if not cliente:
        raise HTTPException(status_code=400, detail="Cliente inválido")
    if processo_id:
        processo = db.query(Processo).filter(Processo.id == processo_id, Processo.tenant_id == cu.tenant_id).first()
        if not processo:
            raise HTTPException(status_code=400, detail="Processo inválido")
    if categoria not in CATEGORIAS:
        categoria = "outro"

    content = file.file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="Arquivo muito grande (máx. 20MB)")

    doc_id = str(uuid.uuid4())
    stored_name = f"{doc_id}{_safe_ext(file.filename or '')}"
    with open(os.path.join(_tenant_dir(cu.tenant_id), stored_name), "wb") as f:
        f.write(content)

    documento = Documento(
        id=doc_id, tenant_id=cu.tenant_id, cliente_id=cliente_id, processo_id=processo_id,
        categoria=categoria, nome_original=file.filename or stored_name,
        nome_arquivo=stored_name, mime_type=file.content_type or "application/octet-stream",
        tamanho=len(content), uploaded_by=cu.id,
    )
    db.add(documento); db.commit(); return documento

@router.get("/{documento_id}/download")
def download_documento(documento_id: str, db: Session = Depends(get_db), cu: User = Depends(get_current_user)):
    documento = _visible_query(db, cu).filter(Documento.id == documento_id).first()
    if not documento:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    path = os.path.join(_tenant_dir(documento.tenant_id), documento.nome_arquivo)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")
    return FileResponse(path, media_type=documento.mime_type, filename=documento.nome_original)

@router.delete("/{documento_id}", status_code=204)
def delete_documento(documento_id: str, db: Session = Depends(get_db), cu: User = Depends(require_staff)):
    documento = db.query(Documento).filter(Documento.id == documento_id, Documento.tenant_id == cu.tenant_id).first()
    if documento:
        path = os.path.join(_tenant_dir(documento.tenant_id), documento.nome_arquivo)
        if os.path.isfile(path):
            os.remove(path)
        db.delete(documento); db.commit()
