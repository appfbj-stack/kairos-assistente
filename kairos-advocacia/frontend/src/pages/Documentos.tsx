import { FormEvent, useEffect, useState } from "react";
import { Upload, Trash2, Download, FileText } from "lucide-react";
import { api, Cliente, Documento, Processo } from "../lib/api";
import { useAuth } from "../hooks/useAuth";

const categoriaLabel: Record<string, string> = {
  peticao: "Petição",
  contrato: "Contrato",
  comprovante: "Comprovante",
  documento_pessoal: "Documento pessoal",
  outro: "Outro",
};

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function Documentos() {
  const { user } = useAuth();
  const isStaff = user && ["admin", "advogado", "assistente_juridico"].includes(user.role);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [form, setForm] = useState<{ cliente_id: string; processo_id: string; categoria: string; file: File | null } | null>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  function load() {
    api.documentos.list().then(setDocumentos).catch((e) => setError(e.message));
    if (isStaff) {
      api.clientes.list().then(setClientes).catch(() => {});
      api.processos.list().then(setProcessos).catch(() => {});
    }
  }
  useEffect(load, [isStaff]);

  function openNew() { setForm({ cliente_id: "", processo_id: "", categoria: "outro", file: null }); }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form || !form.file) return;
    setError(""); setUploading(true);
    try {
      await api.documentos.upload({ cliente_id: form.cliente_id, processo_id: form.processo_id || null, categoria: form.categoria, file: form.file });
      setForm(null); load();
    } catch (err: any) { setError(err.message); } finally { setUploading(false); }
  }

  async function handleDownload(doc: Documento) {
    try { await api.documentos.download(doc); } catch (err: any) { setError(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este documento?")) return;
    await api.documentos.delete(id); load();
  }

  function clienteNome(id: string) { return clientes.find((c) => c.id === id)?.nome || id; }
  function processoNumero(id?: string | null) { if (!id) return "-"; return processos.find((p) => p.id === id)?.numero || id; }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Documentos</h1>
        {isStaff && (
          <button onClick={openNew} className="flex items-center gap-2 rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700">
            <Upload className="h-4 w-4" /> Novo documento
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {form && (
        <form onSubmit={handleSubmit} className="mb-6 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold text-gray-800 dark:text-white">Novo documento</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select required value={form.cliente_id} onChange={(e) => setForm({ ...form, cliente_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Selecione o cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
            <select value={form.processo_id} onChange={(e) => setForm({ ...form, processo_id: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              <option value="">Sem processo vinculado</option>
              {processos.map((p) => <option key={p.id} value={p.id}>{p.numero || p.id}</option>)}
            </select>
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white">
              {Object.entries(categoriaLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input required type="file" onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="submit" disabled={uploading} className="rounded-lg bg-kairos-600 px-4 py-2 text-sm font-semibold text-white hover:bg-kairos-700 disabled:opacity-50">
              {uploading ? "Enviando..." : "Enviar"}
            </button>
            <button type="button" onClick={() => setForm(null)} className="text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
          </div>
        </form>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <tr>
              <th className="px-4 py-3">Arquivo</th>
              {isStaff && <th className="px-4 py-3">Cliente</th>}
              <th className="px-4 py-3">Processo</th>
              <th className="px-4 py-3">Categoria</th>
              <th className="px-4 py-3">Tamanho</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {documentos.map((d) => (
              <tr key={d.id} className="border-t border-gray-100 dark:border-gray-800">
                <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                  <span className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400" /> {d.nome_original}</span>
                </td>
                {isStaff && <td className="px-4 py-3 text-gray-500">{clienteNome(d.cliente_id)}</td>}
                <td className="px-4 py-3 text-gray-500">{processoNumero(d.processo_id)}</td>
                <td className="px-4 py-3 text-gray-500">{categoriaLabel[d.categoria] || d.categoria}</td>
                <td className="px-4 py-3 text-gray-500">{formatSize(d.tamanho)}</td>
                <td className="px-4 py-3 text-gray-500">{new Date(d.created_at).toLocaleDateString("pt-BR")}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDownload(d)} title="Baixar" className="mr-2 text-gray-400 hover:text-kairos-600"><Download className="h-4 w-4" /></button>
                  {isStaff && (
                    <button onClick={() => handleDelete(d.id)} title="Remover" className="text-gray-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  )}
                </td>
              </tr>
            ))}
            {documentos.length === 0 && (
              <tr><td colSpan={isStaff ? 7 : 6} className="px-4 py-6 text-center text-gray-500">Nenhum documento cadastrado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
