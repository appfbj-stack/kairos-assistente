import { FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Upload, Download, FileText } from "lucide-react";
import { api, Documento, Movimentacao, Processo } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const tipoLabel: Record<string, string> = { andamento: "Andamento", prazo: "Prazo", audiencia: "Audiência", decisao: "Decisão" };
const categoriaLabel: Record<string, string> = { peticao: "Petição", contrato: "Contrato", comprovante: "Comprovante", documento_pessoal: "Documento pessoal", outro: "Outro" };

export default function ProcessoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const isStaff = user && ["admin", "advogado", "assistente_juridico"].includes(user.role);
  const [processo, setProcesso] = useState<Processo | null>(null);
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [form, setForm] = useState<any>(null);
  const [docForm, setDocForm] = useState<{ categoria: string; file: File | null } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function load() {
    if (!id) return;
    api.processos.get(id).then(setProcesso).catch((e) => setError(e.message));
    api.processos.movimentacoes.list(id).then(setMovimentacoes).catch(() => {});
    api.documentos.list({ processo_id: id }).then(setDocumentos).catch(() => {});
  }
  useEffect(load, [id]);

  async function handleDocSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id || !processo || !docForm || !docForm.file) return;
    setError(""); setUploading(true);
    try {
      await api.documentos.upload({ cliente_id: processo.cliente_id, processo_id: id, categoria: docForm.categoria, file: docForm.file });
      setDocForm(null); load();
    } catch (err: any) { setError(err.message); } finally { setUploading(false); }
  }

  async function handleDocDownload(doc: Documento) {
    try { await api.documentos.download(doc); } catch (err: any) { setError(err.message); }
  }

  async function handleDocDelete(docId: string) {
    if (!confirm("Remover este documento?")) return;
    await api.documentos.delete(docId); load();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    try {
      await api.processos.movimentacoes.create(id, form);
      setForm(null); load();
    } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(movId: string) {
    if (!id || !confirm("Remover esta movimentação?")) return;
    await api.processos.movimentacoes.delete(id, movId); load();
  }

  if (!processo) return <p className="text-gray-500">{error || "Carregando..."}</p>;

  return (
    <div>
      <Link to="/processos" className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-kairos-600">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">{processo.numero || "(sem número)"}</h1>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-500 sm:grid-cols-4">
          <span>Área: {processo.area || "-"}</span>
          <span>Tribunal: {processo.tribunal || "-"}</span>
          <span>Vara: {processo.vara || "-"}</span>
          <span>Status: {processo.status}</span>
        </div>
        {processo.descricao && <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{processo.descricao}</p>}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Movimentações</h2>
        {isStaff && (
          <button onClick={() => setForm({ data: "", tipo: "andamento", descricao: "" })} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-kairos-700">
            <Plus className="h-4 w-4" /> Nova movimentação
          </button>
        )}
      </div>

      {form && (
        <form onSubmit={handleSubmit} className="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(tipoLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <textarea required placeholder="Descrição" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          <button type="submit" className="mt-3 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">Adicionar</button>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {movimentacoes.map((m) => (
          <div key={m.id} className="flex items-start justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div>
              <div className="text-xs font-medium uppercase text-kairos-600">{tipoLabel[m.tipo] || m.tipo} · {m.data}</div>
              <p className="mt-1 text-sm text-gray-700 dark:text-gray-200">{m.descricao}</p>
            </div>
            {isStaff && (
              <button onClick={() => handleDelete(m.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        ))}
        {movimentacoes.length === 0 && <p className="text-sm text-gray-500">Nenhuma movimentação registrada.</p>}
      </div>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Documentos</h2>
        {isStaff && (
          <button onClick={() => setDocForm({ categoria: "outro", file: null })} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-kairos-700">
            <Upload className="h-4 w-4" /> Novo documento
          </button>
        )}
      </div>

      {docForm && (
        <form onSubmit={handleDocSubmit} className="mt-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select value={docForm.categoria} onChange={(e) => setDocForm({ ...docForm, categoria: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(categoriaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input required type="file" onChange={(e) => setDocForm({ ...docForm, file: e.target.files?.[0] || null })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="submit" disabled={uploading} className="rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700 disabled:opacity-50">
              {uploading ? "Enviando..." : "Enviar"}
            </button>
            <button type="button" onClick={() => setDocForm(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          </div>
        </form>
      )}

      <div className="mt-4 space-y-3">
        {documentos.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-200">{d.nome_original}</p>
                <span className="text-xs text-gray-500">{categoriaLabel[d.categoria] || d.categoria}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleDocDownload(d)} title="Baixar" className="text-gray-400 hover:text-kairos-600"><Download className="h-4 w-4" /></button>
              {isStaff && (
                <button onClick={() => handleDocDelete(d.id)} title="Remover" className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
              )}
            </div>
          </div>
        ))}
        {documentos.length === 0 && <p className="text-sm text-gray-500">Nenhum documento anexado a este processo.</p>}
      </div>
    </div>
  );
}
