import shutil
from datetime import date, datetime
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.database import get_db
from app.deps import (
    can_see_sensitive,
    congregacao_filter,
    get_current_user,
    registrar_auditoria,
    require_module,
)
from app.models import (
    CursoFormacao,
    HistoricoCargo,
    Membro,
    MinisterioMembro,
    TransferenciaMembro,
    Usuario,
)
from app.services.lgpd import precisa_reaceite, registrar_aceite_membro
from app.utils import new_id, parse_date

router = APIRouter(prefix="/membros", tags=["membros"], dependencies=[Depends(require_module("membros"))])


# ──────────────────────────────────────────────────────────────────────────────
# Schemas
# ──────────────────────────────────────────────────────────────────────────────

class MembroOut(BaseModel):
    id: str
    congregacao_id: str
    foto_url: Optional[str]
    nome: str
    # Dados sensíveis — mascarados por perfil
    cpf: Optional[str]
    rg: Optional[str]
    data_nascimento: Optional[date]
    email: Optional[str]
    telefone: Optional[str]
    whatsapp: Optional[str]
    endereco: Optional[str]
    estado_civil: Optional[str]
    naturalidade: Optional[str]
    profissao: Optional[str]
    escolaridade: Optional[str]
    nome_pai: Optional[str]
    nome_mae: Optional[str]
    conjuge_nome: Optional[str]
    data_casamento: Optional[date]
    num_filhos: Optional[int]
    tipo_sanguineo: Optional[str]
    alergias_medicacoes: Optional[str]
    necessidades_especiais: Optional[str]
    contato_emergencia_nome: Optional[str]
    contato_emergencia_telefone: Optional[str]
    # Dados eclesiásticos
    data_conversao: Optional[date]
    data_batismo: Optional[date]
    batismo_espirito_santo_em: Optional[date]
    data_entrada_congregacao: Optional[date]
    cargo: Optional[str]
    consagracao_data: Optional[date]
    consagracao_oficiante: Optional[str]
    formacao_teologica: Optional[str]
    status: str
    observacoes: Optional[str]
    # LGPD
    lgpd_aceite: bool
    lgpd_data_aceite: Optional[datetime]
    lgpd_versao_termo: Optional[str]
    criado_em: Optional[datetime]
    atualizado_em: Optional[datetime]
    model_config = {"from_attributes": True}


class MembroLista(BaseModel):
    total: int
    page: int
    limit: int
    dados: list[MembroOut]


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _salvar_foto(foto: Optional[UploadFile], subdir: str = "membros") -> Optional[str]:
    if not foto or not foto.filename:
        return None
    pasta = Path(settings.UPLOAD_DIR) / subdir
    pasta.mkdir(parents=True, exist_ok=True)
    nome_arquivo = f"{new_id()}{Path(foto.filename).suffix}"
    destino = pasta / nome_arquivo
    with destino.open("wb") as buffer:
        shutil.copyfileobj(foto.file, buffer)
    return f"/uploads/{subdir}/{nome_arquivo}"


def _mascarar_membro(m: Membro, ver_sensivel: bool) -> Membro:
    """Devolve um clone do membro com campos sensíveis mascarados quando necessário."""
    if ver_sensivel:
        return m
    # Cria um proxy sem commit para mascarar campos sem alterar o banco
    class _Masked: pass
    clone = _Masked()
    for col in m.__table__.columns:
        setattr(clone, col.name, getattr(m, col.name))
    # Mascarar
    if clone.cpf: clone.cpf = "***.***.***-**"
    if clone.rg: clone.rg = "**-******"
    if clone.email: clone.email = "***@" + clone.email.split("@", 1)[-1] if clone.email and "@" in clone.email else "***"
    if clone.endereco: clone.endereco = "••••••••"
    if clone.nome_pai: clone.nome_pai = "••••••"
    if clone.nome_mae: clone.nome_mae = "••••••"
    if clone.alergias_medicacoes: clone.alergias_medicacoes = "••••••"
    if clone.necessidades_especiais: clone.necessidades_especiais = "••••••"
    if clone.contato_emergencia_telefone: clone.contato_emergencia_telefone = "(**) *****-****"
    return clone


# ──────────────────────────────────────────────────────────────────────────────
# CRUD principal
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", response_model=MembroLista)
def listar(
    busca: str = "", status: str = "", congregacao_id: str = "",
    page: int = 1, limit: int = 50,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
    cong_filtro: Optional[str] = Depends(congregacao_filter),
    ver_sensivel: bool = Depends(can_see_sensitive),
    request: Request = None,
):
    q = db.query(Membro).filter(Membro.tenant_id == cu.tenant_id)
    if cong_filtro:
        q = q.filter(Membro.congregacao_id == cong_filtro)
    elif congregacao_id:
        q = q.filter(Membro.congregacao_id == congregacao_id)
    if status:
        q = q.filter(Membro.status == status)
    if busca:
        q = q.filter(or_(Membro.nome.ilike(f"%{busca}%"), Membro.cpf.ilike(f"%{busca}%")))
    total = q.count()
    dados_db = q.order_by(Membro.nome).offset((page - 1) * limit).limit(limit).all()
    dados = [_mascarar_membro(m, ver_sensivel) for m in dados_db]
    # Auditoria: log de listagem (ação leve, só loga a cada 20 para não inflar)
    if page == 1:
        registrar_auditoria(db, cu, "acesso", "membros", None, request, detalhes=f"listagem busca='{busca}'")
    return {"total": total, "page": page, "limit": limit, "dados": dados}


@router.get("/aniversariantes")
def aniversariantes(
    periodo: str = "hoje",
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
    cong_filtro: Optional[str] = Depends(congregacao_filter),
):
    from datetime import date as date_, timedelta
    from sqlalchemy import extract

    q = db.query(Membro).filter(Membro.tenant_id == cu.tenant_id, Membro.status == "ativo",
                                 Membro.data_nascimento.isnot(None))
    if cong_filtro:
        q = q.filter(Membro.congregacao_id == cong_filtro)
    hoje = date_.today()
    if periodo == "hoje":
        q = q.filter(extract("month", Membro.data_nascimento) == hoje.month,
                     extract("day", Membro.data_nascimento) == hoje.day)
    elif periodo == "mes":
        q = q.filter(extract("month", Membro.data_nascimento) == hoje.month)
    elif periodo == "semana":
        dias = [(hoje + timedelta(days=i)) for i in range(8)]
        pares = [(d.month, d.day) for d in dias]
        from sqlalchemy import tuple_
        q = q.filter(tuple_(extract("month", Membro.data_nascimento), extract("day", Membro.data_nascimento)).in_(pares))
    membros = q.order_by(extract("month", Membro.data_nascimento), extract("day", Membro.data_nascimento)).all()
    return [
        {"id": m.id, "nome": m.nome, "data_nascimento": m.data_nascimento, "congregacao_id": m.congregacao_id,
         "foto_url": m.foto_url, "telefone": m.telefone, "whatsapp": m.whatsapp}
        for m in membros
    ]


@router.get("/{membro_id}", response_model=MembroOut)
def obter(
    membro_id: str,
    request: Request,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
    cong_filtro: Optional[str] = Depends(congregacao_filter),
    ver_sensivel: bool = Depends(can_see_sensitive),
):
    m = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if cong_filtro and m.congregacao_id != cong_filtro:
        raise HTTPException(status_code=403, detail="Acesso negado")
    # Auditoria — todo acesso a ficha individual é logado
    registrar_auditoria(db, cu, "acesso", "membros", m.id, request, detalhes=f"visualizou {m.nome}")
    return _mascarar_membro(m, ver_sensivel)


@router.post("", response_model=MembroOut, status_code=201)
def criar(
    request: Request,
    nome: str = Form(...),
    cpf: str = Form(None), rg: str = Form(None),
    data_nascimento: str = Form(None),
    email: str = Form(None), telefone: str = Form(None), whatsapp: str = Form(None),
    endereco: str = Form(None), estado_civil: str = Form(None),
    naturalidade: str = Form(None), profissao: str = Form(None), escolaridade: str = Form(None),
    nome_pai: str = Form(None), nome_mae: str = Form(None),
    conjuge_nome: str = Form(None), data_casamento: str = Form(None), num_filhos: int = Form(None),
    tipo_sanguineo: str = Form(None), alergias_medicacoes: str = Form(None),
    necessidades_especiais: str = Form(None),
    contato_emergencia_nome: str = Form(None), contato_emergencia_telefone: str = Form(None),
    data_conversao: str = Form(None), data_batismo: str = Form(None),
    batismo_espirito_santo_em: str = Form(None), data_entrada_congregacao: str = Form(None),
    cargo: str = Form(None),
    consagracao_data: str = Form(None), consagracao_oficiante: str = Form(None),
    formacao_teologica: str = Form(None),
    status: str = Form("ativo"), observacoes: str = Form(None),
    congregacao_id: str = Form(None),
    foto: UploadFile = File(None),
    # LGPD
    lgpd_aceite: bool = Form(False),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
    cong_filtro: Optional[str] = Depends(congregacao_filter),
):
    cong_id = cong_filtro or congregacao_id
    if not cong_id:
        raise HTTPException(status_code=400, detail="congregacao_id obrigatório")
    if not lgpd_aceite:
        raise HTTPException(
            status_code=400,
            detail="Consentimento LGPD obrigatório. O titular deve autorizar o tratamento dos dados.",
        )

    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent", "")[:500]

    membro = Membro(
        id=new_id(), tenant_id=cu.tenant_id, congregacao_id=cong_id,
        foto_url=_salvar_foto(foto),
        nome=nome, cpf=cpf, rg=rg, data_nascimento=parse_date(data_nascimento),
        email=email, telefone=telefone, whatsapp=whatsapp, endereco=endereco, estado_civil=estado_civil,
        naturalidade=naturalidade, profissao=profissao, escolaridade=escolaridade,
        nome_pai=nome_pai, nome_mae=nome_mae,
        conjuge_nome=conjuge_nome, data_casamento=parse_date(data_casamento), num_filhos=num_filhos,
        tipo_sanguineo=tipo_sanguineo, alergias_medicacoes=alergias_medicacoes,
        necessidades_especiais=necessidades_especiais,
        contato_emergencia_nome=contato_emergencia_nome, contato_emergencia_telefone=contato_emergencia_telefone,
        data_conversao=parse_date(data_conversao), data_batismo=parse_date(data_batismo),
        batismo_espirito_santo_em=parse_date(batismo_espirito_santo_em),
        data_entrada_congregacao=parse_date(data_entrada_congregacao),
        cargo=cargo,
        consagracao_data=parse_date(consagracao_data), consagracao_oficiante=consagracao_oficiante,
        formacao_teologica=formacao_teologica,
        status=status, observacoes=observacoes,
    )
    db.add(membro); db.flush()  # flush para ter o id
    registrar_aceite_membro(db, membro, ip, ua)
    db.commit(); db.refresh(membro)
    registrar_auditoria(db, cu, "criacao", "membros", membro.id, request, detalhes=f"criou {membro.nome}")
    return membro


@router.put("/{membro_id}", response_model=MembroOut)
def atualizar(
    membro_id: str,
    request: Request,
    nome: str = Form(...),
    cpf: str = Form(None), rg: str = Form(None),
    data_nascimento: str = Form(None),
    email: str = Form(None), telefone: str = Form(None), whatsapp: str = Form(None),
    endereco: str = Form(None), estado_civil: str = Form(None),
    naturalidade: str = Form(None), profissao: str = Form(None), escolaridade: str = Form(None),
    nome_pai: str = Form(None), nome_mae: str = Form(None),
    conjuge_nome: str = Form(None), data_casamento: str = Form(None), num_filhos: int = Form(None),
    tipo_sanguineo: str = Form(None), alergias_medicacoes: str = Form(None),
    necessidades_especiais: str = Form(None),
    contato_emergencia_nome: str = Form(None), contato_emergencia_telefone: str = Form(None),
    data_conversao: str = Form(None), data_batismo: str = Form(None),
    batismo_espirito_santo_em: str = Form(None), data_entrada_congregacao: str = Form(None),
    cargo: str = Form(None),
    consagracao_data: str = Form(None), consagracao_oficiante: str = Form(None),
    formacao_teologica: str = Form(None),
    status: str = Form("ativo"), observacoes: str = Form(None),
    foto: UploadFile = File(None),
    lgpd_aceite: bool = Form(False),
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
    cong_filtro: Optional[str] = Depends(congregacao_filter),
):
    membro = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not membro:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if cong_filtro and membro.congregacao_id != cong_filtro:
        raise HTTPException(status_code=403, detail="Acesso negado")

    # LGPD: se o termo mudou de versão, exigir reaceite
    if precisa_reaceite(membro) and not lgpd_aceite:
        raise HTTPException(
            status_code=400,
            detail=f"Termo LGPD atualizado (v{settings.LGPD_VERSAO_TERMO}). Novo aceite obrigatório.",
        )

    foto_url = _salvar_foto(foto)
    alteracoes = []
    def _set(attr, novo):
        velho = getattr(membro, attr)
        if novo != velho:
            alteracoes.append(f"{attr}: {velho!r} -> {novo!r}")
        setattr(membro, attr, novo)

    _set("nome", nome)
    _set("cpf", cpf)
    _set("rg", rg)
    _set("data_nascimento", parse_date(data_nascimento))
    _set("email", email)
    _set("telefone", telefone)
    _set("whatsapp", whatsapp)
    _set("endereco", endereco)
    _set("estado_civil", estado_civil)
    _set("naturalidade", naturalidade)
    _set("profissao", profissao)
    _set("escolaridade", escolaridade)
    _set("nome_pai", nome_pai)
    _set("nome_mae", nome_mae)
    _set("conjuge_nome", conjuge_nome)
    _set("data_casamento", parse_date(data_casamento))
    _set("num_filhos", num_filhos)
    _set("tipo_sanguineo", tipo_sanguineo)
    _set("alergias_medicacoes", alergias_medicacoes)
    _set("necessidades_especiais", necessidades_especiais)
    _set("contato_emergencia_nome", contato_emergencia_nome)
    _set("contato_emergencia_telefone", contato_emergencia_telefone)
    _set("data_conversao", parse_date(data_conversao))
    _set("data_batismo", parse_date(data_batismo))
    _set("batismo_espirito_santo_em", parse_date(batismo_espirito_santo_em))
    _set("data_entrada_congregacao", parse_date(data_entrada_congregacao))
    _set("cargo", cargo)
    _set("consagracao_data", parse_date(consagracao_data))
    _set("consagracao_oficiante", consagracao_oficiante)
    _set("formacao_teologica", formacao_teologica)
    _set("status", status)
    _set("observacoes", observacoes)
    if foto_url:
        _set("foto_url", foto_url)

    # Reaceite de versão nova
    if lgpd_aceite and precisa_reaceite(membro):
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent", "")[:500]
        registrar_aceite_membro(db, membro, ip, ua)

    db.commit(); db.refresh(membro)
    registrar_auditoria(db, cu, "alteracao", "membros", membro.id, request, detalhes="; ".join(alteracoes)[:500])
    return membro


@router.delete("/{membro_id}")
def remover(
    membro_id: str,
    request: Request,
    db: Session = Depends(get_db),
    cu: Usuario = Depends(get_current_user),
    cong_filtro: Optional[str] = Depends(congregacao_filter),
):
    membro = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not membro:
        raise HTTPException(status_code=404, detail="Não encontrado")
    if cong_filtro and membro.congregacao_id != cong_filtro:
        raise HTTPException(status_code=403, detail="Acesso negado")
    nome = membro.nome
    db.delete(membro); db.commit()
    registrar_auditoria(db, cu, "remocao", "membros", membro_id, request, detalhes=f"removeu {nome}")
    return {"ok": True}


# ──────────────────────────────────────────────────────────────────────────────
# Sub-entidades: Transferências
# ──────────────────────────────────────────────────────────────────────────────

class TransferenciaIn(BaseModel):
    congregacao_origem_id: Optional[str] = None
    congregacao_destino_id: Optional[str] = None
    congregacao_origem_nome: Optional[str] = None
    congregacao_destino_nome: Optional[str] = None
    data: date
    motivo: Optional[str] = None
    documento_comprovante_url: Optional[str] = None

class TransferenciaOut(TransferenciaIn):
    id: str
    membro_id: str
    criado_em: Optional[datetime]
    model_config = {"from_attributes": True}

@router.get("/{membro_id}/transferencias", response_model=list[TransferenciaOut])
def listar_transferencias(membro_id: str, db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user)):
    return (
        db.query(TransferenciaMembro)
        .filter(TransferenciaMembro.membro_id == membro_id, TransferenciaMembro.tenant_id == cu.tenant_id)
        .order_by(TransferenciaMembro.data.desc())
        .all()
    )

@router.post("/{membro_id}/transferencias", response_model=TransferenciaOut, status_code=201)
def criar_transferencia(
    membro_id: str, payload: TransferenciaIn, request: Request,
    db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user),
):
    m = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    t = TransferenciaMembro(
        id=new_id(), tenant_id=cu.tenant_id, membro_id=membro_id,
        congregacao_origem_id=payload.congregacao_origem_id,
        congregacao_destino_id=payload.congregacao_destino_id,
        congregacao_origem_nome=payload.congregacao_origem_nome,
        congregacao_destino_nome=payload.congregacao_destino_nome,
        data=payload.data, motivo=payload.motivo,
        documento_comprovante_url=payload.documento_comprovante_url,
    )
    db.add(t); db.commit(); db.refresh(t)
    registrar_auditoria(db, cu, "criacao", "membros_transferencias", t.id, request,
                       detalhes=f"membro={membro_id} data={payload.data}")
    return t


# ──────────────────────────────────────────────────────────────────────────────
# Sub-entidades: Histórico de Cargos
# ──────────────────────────────────────────────────────────────────────────────

class HistoricoCargoIn(BaseModel):
    congregacao_id: Optional[str] = None
    cargo: str
    data_inicio: date
    data_fim: Optional[date] = None
    oficializado_por: Optional[str] = None
    observacoes: Optional[str] = None

class HistoricoCargoOut(HistoricoCargoIn):
    id: str
    membro_id: str
    criado_em: Optional[datetime]
    model_config = {"from_attributes": True}

@router.get("/{membro_id}/historico-cargos", response_model=list[HistoricoCargoOut])
def listar_historico_cargos(membro_id: str, db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user)):
    return (
        db.query(HistoricoCargo)
        .filter(HistoricoCargo.membro_id == membro_id, HistoricoCargo.tenant_id == cu.tenant_id)
        .order_by(HistoricoCargo.data_inicio.desc())
        .all()
    )

@router.post("/{membro_id}/historico-cargos", response_model=HistoricoCargoOut, status_code=201)
def criar_historico_cargo(
    membro_id: str, payload: HistoricoCargoIn, request: Request,
    db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user),
):
    m = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    h = HistoricoCargo(
        id=new_id(), tenant_id=cu.tenant_id, membro_id=membro_id,
        congregacao_id=payload.congregacao_id, cargo=payload.cargo,
        data_inicio=payload.data_inicio, data_fim=payload.data_fim,
        oficializado_por=payload.oficializado_por, observacoes=payload.observacoes,
    )
    db.add(h); db.commit(); db.refresh(h)
    registrar_auditoria(db, cu, "criacao", "membros_historico_cargos", h.id, request,
                       detalhes=f"membro={membro_id} cargo={payload.cargo}")
    return h


# ──────────────────────────────────────────────────────────────────────────────
# Sub-entidades: Ministérios
# ──────────────────────────────────────────────────────────────────────────────

class MinisterioIn(BaseModel):
    ministerio: str
    funcao: Optional[str] = None
    data_inicio: date
    data_fim: Optional[date] = None
    observacoes: Optional[str] = None

class MinisterioOut(MinisterioIn):
    id: str
    membro_id: str
    criado_em: Optional[datetime]
    model_config = {"from_attributes": True}

@router.get("/{membro_id}/ministerios", response_model=list[MinisterioOut])
def listar_ministerios(membro_id: str, db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user)):
    return (
        db.query(MinisterioMembro)
        .filter(MinisterioMembro.membro_id == membro_id, MinisterioMembro.tenant_id == cu.tenant_id)
        .order_by(MinisterioMembro.data_inicio.desc())
        .all()
    )

@router.post("/{membro_id}/ministerios", response_model=MinisterioOut, status_code=201)
def criar_ministerio(
    membro_id: str, payload: MinisterioIn, request: Request,
    db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user),
):
    m = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    mi = MinisterioMembro(
        id=new_id(), tenant_id=cu.tenant_id, membro_id=membro_id,
        ministerio=payload.ministerio, funcao=payload.funcao,
        data_inicio=payload.data_inicio, data_fim=payload.data_fim,
        observacoes=payload.observacoes,
    )
    db.add(mi); db.commit(); db.refresh(mi)
    registrar_auditoria(db, cu, "criacao", "membros_ministerios", mi.id, request,
                       detalhes=f"membro={membro_id} ministerio={payload.ministerio}")
    return mi


# ──────────────────────────────────────────────────────────────────────────────
# Sub-entidades: Cursos / Formação
# ──────────────────────────────────────────────────────────────────────────────

class CursoIn(BaseModel):
    curso: str
    instituicao: Optional[str] = None
    data_conclusao: Optional[date] = None
    certificacao_url: Optional[str] = None
    observacoes: Optional[str] = None

class CursoOut(CursoIn):
    id: str
    membro_id: str
    criado_em: Optional[datetime]
    model_config = {"from_attributes": True}

@router.get("/{membro_id}/cursos", response_model=list[CursoOut])
def listar_cursos(membro_id: str, db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user)):
    return (
        db.query(CursoFormacao)
        .filter(CursoFormacao.membro_id == membro_id, CursoFormacao.tenant_id == cu.tenant_id)
        .order_by(CursoFormacao.data_conclusao.desc().nullslast())
        .all()
    )

@router.post("/{membro_id}/cursos", response_model=CursoOut, status_code=201)
def criar_curso(
    membro_id: str, payload: CursoIn, request: Request,
    db: Session = Depends(get_db), cu: Usuario = Depends(get_current_user),
):
    m = db.query(Membro).filter(Membro.id == membro_id, Membro.tenant_id == cu.tenant_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Membro não encontrado")
    c = CursoFormacao(
        id=new_id(), tenant_id=cu.tenant_id, membro_id=membro_id,
        curso=payload.curso, instituicao=payload.instituicao,
        data_conclusao=payload.data_conclusao, certificacao_url=payload.certificacao_url,
        observacoes=payload.observacoes,
    )
    db.add(c); db.commit(); db.refresh(c)
    registrar_auditoria(db, cu, "criacao", "membros_cursos", c.id, request,
                       detalhes=f"membro={membro_id} curso={payload.curso}")
    return c
