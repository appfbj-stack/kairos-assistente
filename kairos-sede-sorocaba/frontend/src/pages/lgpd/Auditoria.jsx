import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { formatarData } from '../../lib/utils';
import { ShieldCheck, History } from 'lucide-react';

const ACOES = {
  acesso: { label: 'Acesso', color: 'bg-blue-100 text-blue-800' },
  criacao: { label: 'Criação', color: 'bg-green-100 text-green-800' },
  alteracao: { label: 'Alteração', color: 'bg-yellow-100 text-yellow-800' },
  remocao: { label: 'Remoção', color: 'bg-red-100 text-red-800' },
  exportacao: { label: 'Exportação', color: 'bg-purple-100 text-purple-800' },
};

const RECURSOS = ['membros', 'obreiros', 'carteirinhas', 'usuarios', 'lgpd', 'auth', 'lgpd_solicitacoes'];

export default function Auditoria() {
  const [acao, setAcao] = useState('');
  const [recurso, setRecurso] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['lgpd-auditoria', acao, recurso, page],
    queryFn: () => api.get('/lgpd/auditoria', { params: { acao, recurso, page, limit: 50 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const totalPaginas = Math.ceil((data?.length || 0) / 50);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck size={24} className="text-blue-600" /> Auditoria de Acesso a Dados
        </h1>
        <p className="text-gray-500 text-sm">Log de acessos, criações, alterações e remoções em dados pessoais</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={acao} onChange={e => { setAcao(e.target.value); setPage(1); }}
          className="bg-white border rounded-lg px-3 py-2 text-sm">
          <option value="">Todas as ações</option>
          {Object.entries(ACOES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
        <select value={recurso} onChange={e => { setRecurso(e.target.value); setPage(1); }}
          className="bg-white border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os recursos</option>
          {RECURSOS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400">Carregando...</div>
        ) : !data || data.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <History size={36} className="mx-auto mb-2 opacity-30" />
            <p>Nenhum registro</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Data</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Usuário</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Ação</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Recurso</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatarData(log.criado_em, true)}</td>
                  <td className="px-4 py-3 text-gray-700">{log.usuario_email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ACOES[log.acao]?.color || 'bg-gray-100'}`}>
                      {ACOES[log.acao]?.label || log.acao}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{log.recurso} {log.recurso_id && <span className="text-gray-400 text-xs">#{log.recurso_id.slice(0, 6)}</span>}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.ip || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate" title={log.detalhes || ''}>{log.detalhes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-sm text-gray-500">Página {page} de {totalPaginas}</p>
            <div className="flex gap-1">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="p-1 rounded disabled:opacity-40 hover:bg-gray-200">‹</button>
              <button disabled={page === totalPaginas} onClick={() => setPage(p => p + 1)}
                className="p-1 rounded disabled:opacity-40 hover:bg-gray-200">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
