import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { formatarData } from '../../lib/utils';
import { ShieldCheck, Inbox, Check } from 'lucide-react';

const STATUS = {
  recebida: { label: 'Recebida', color: 'bg-yellow-100 text-yellow-800' },
  em_andamento: { label: 'Em andamento', color: 'bg-blue-100 text-blue-800' },
  concluida: { label: 'Concluída', color: 'bg-green-100 text-green-800' },
  recusada: { label: 'Recusada', color: 'bg-red-100 text-red-800' },
};

const TIPOS_LABEL = {
  acesso: 'Acesso', retificacao: 'Retificação', exclusao: 'Exclusão',
  portabilidade: 'Portabilidade', revogacao: 'Revogação',
};

export default function Solicitacoes() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [selecionada, setSelecionada] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lgpd-solicitacoes', status, page],
    queryFn: () => api.get('/lgpd/solicitacoes', { params: { status, page, limit: 20 } }).then(r => r.data),
    keepPreviousData: true,
  });

  const atualizar = useMutation({
    mutationFn: ({ id, payload }) => api.patch(`/lgpd/solicitacoes/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries(['lgpd-solicitacoes']); },
  });

  const lista = data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck size={24} className="text-blue-600" /> Solicitações LGPD
          </h1>
          <p className="text-gray-500 text-sm">Direitos do titular — Art. 18 Lei 13.709/2018</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="bg-white border rounded-lg px-3 py-2 text-sm">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Lista */}
        <div className="lg:col-span-1 bg-white rounded-xl border overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">Carregando...</div>
          ) : lista.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Inbox size={36} className="mx-auto mb-2 opacity-30" />
              <p>Nenhuma solicitação</p>
            </div>
          ) : (
            <ul className="divide-y">
              {lista.map(s => (
                <li key={s.id}>
                  <button
                    onClick={() => setSelecionada(s)}
                    className={`w-full text-left p-3 hover:bg-gray-50 ${selecionada?.id === s.id ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{s.titular_nome}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS[s.status]?.color}`}>
                        {STATUS[s.status]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{s.titular_email}</p>
                    <p className="text-xs text-gray-400">{TIPOS_LABEL[s.tipo]} • {formatarData(s.criado_em)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Detalhe / Resposta */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-4 lg:p-6">
          {!selecionada ? (
            <div className="text-center text-gray-400 py-12">
              <ShieldCheck size={36} className="mx-auto mb-2 opacity-30" />
              <p>Selecione uma solicitação para responder</p>
            </div>
          ) : (
            <DetalheSolicitacao
              sol={selecionada}
              onAtualizar={(payload) => atualizar.mutate({ id: selecionada.id, payload }, {
                onSuccess: (updated) => setSelecionada(updated),
              })}
              salvando={atualizar.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DetalheSolicitacao({ sol, onAtualizar, salvando }) {
  const [novoStatus, setNovoStatus] = useState(sol.status);
  const [resposta, setResposta] = useState(sol.resposta || '');

  return (
    <div className="space-y-4">
      <div className="border-b pb-3">
        <h2 className="font-bold text-gray-900">{sol.titular_nome}</h2>
        <p className="text-sm text-gray-600">{sol.titular_email} • {sol.titular_telefone || 'sem telefone'}</p>
        {sol.titular_cpf && <p className="text-xs text-gray-500">CPF: {sol.titular_cpf}</p>}
        <p className="text-xs text-gray-400 mt-1">Protocolo #{sol.id.slice(0, 8).toUpperCase()} • {formatarData(sol.criado_em)}</p>
      </div>

      <div>
        <p className="text-xs uppercase text-gray-400 mb-1">Tipo</p>
        <p className="text-sm font-medium">{TIPOS_LABEL[sol.tipo]}</p>
      </div>

      <div>
        <p className="text-xs uppercase text-gray-400 mb-1">Descrição do titular</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded-lg border">{sol.descricao}</p>
      </div>

      {sol.atendido_em && (
        <div className="text-xs text-gray-500">
          Atendida por: <strong>{sol.atendido_por || '—'}</strong> em {formatarData(sol.atendido_em)}
        </div>
      )}

      <div className="border-t pt-4 space-y-3">
        <h3 className="font-semibold text-sm">Atender solicitação</h3>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
          <select value={novoStatus} onChange={e => setNovoStatus(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm">
            {Object.entries(STATUS).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Resposta / observação</label>
          <textarea rows={4} value={resposta} onChange={e => setResposta(e.target.value)}
            placeholder="Descreva a ação tomada..."
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onAtualizar({ status: novoStatus, resposta })}
            disabled={salvando}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar atendimento'}
          </button>
          <button
            onClick={() => onAtualizar({ status: 'concluida', resposta: resposta || 'Solicitação processada.' })}
            disabled={salvando}
            className="flex items-center gap-1 bg-green-600 text-white rounded-lg py-2 px-3 text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            <Check size={14} /> Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
