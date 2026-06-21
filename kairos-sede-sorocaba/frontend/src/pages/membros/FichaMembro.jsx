import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import { formatarData, calcularIdade, STATUS_MEMBRO, mascararCpf, mascararEmail } from '../../lib/utils';
import { ArrowLeft, Plus, ShieldCheck, History, Building2, Music, GraduationCap } from 'lucide-react';

const ABAS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'pessoais', label: 'Dados Pessoais' },
  { id: 'eclesiasticos', label: 'Eclesiásticos' },
  { id: 'cargos', label: 'Histórico de Cargos' },
  { id: 'transferencias', label: 'Transferências' },
  { id: 'ministerios', label: 'Ministérios' },
  { id: 'cursos', label: 'Cursos' },
  { id: 'consentimentos', label: 'Consentimentos' },
];

export default function FichaMembro() {
  const { id } = useParams();
  const { canSeeSensitive } = useAuthStore();
  const verSensivel = canSeeSensitive();
  const [aba, setAba] = useState('resumo');

  const { data: m, isLoading } = useQuery({
    queryKey: ['membro', id],
    queryFn: () => api.get(`/membros/${id}`).then(r => r.data),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-8 text-center text-gray-400">Carregando ficha...</div>;
  if (!m) return <div className="p-8 text-center text-gray-400">Membro não encontrado</div>;

  const mostrar = (valor) => verSensivel ? (valor || '—') : (valor ? '••••••' : '—');
  const mostrarCpf = (cpf) => verSensivel ? (cpf || '—') : (cpf && !cpf.includes('*') ? mascararCpf(cpf) : (cpf || '—'));
  const mostrarEmail = (email) => verSensivel ? (email || '—') : (email && !email.includes('*') ? mascararEmail(email) : (email || '—'));

  return (
    <div className="space-y-4">
      {/* Voltar */}
      <Link to="/membros" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} /> Voltar para Membros
      </Link>

      {/* Header com foto + nome + status */}
      <div className="bg-white rounded-xl border p-4 lg:p-6 flex items-start gap-4">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center flex-shrink-0">
          {m.foto_url
            ? <img src={m.foto_url} alt={m.nome} className="w-full h-full object-cover" />
            : <span className="text-3xl text-gray-300">👤</span>}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{m.nome}</h1>
          <p className="text-sm text-gray-500">{calcularIdade(m.data_nascimento)} anos • {m.cargo || 'sem cargo'}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`px-2 py-1 rounded-full font-medium ${STATUS_MEMBRO[m.status]?.color}`}>
              {STATUS_MEMBRO[m.status]?.label}
            </span>
            {m.lgpd_aceite && (
              <span className="px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                <ShieldCheck size={12} /> LGPD v{m.lgpd_versao_termo}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="border-b flex overflow-x-auto">
          {ABAS.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 ${
                aba === a.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>

        <div className="p-4 lg:p-6">
          {aba === 'resumo' && (
            <ResumoMembro m={m} mostrar={mostrar} mostrarCpf={mostrarCpf} mostrarEmail={mostrarEmail} />
          )}
          {aba === 'pessoais' && (
            <DadosPessoais m={m} mostrar={mostrar} mostrarCpf={mostrarCpf} mostrarEmail={mostrarEmail} verSensivel={verSensivel} />
          )}
          {aba === 'eclesiasticos' && <DadosEclesiasticos m={m} />}
          {aba === 'cargos' && <SubEntidade membroId={id} tipo="cargos" />}
          {aba === 'transferencias' && <SubEntidade membroId={id} tipo="transferencias" />}
          {aba === 'ministerios' && <SubEntidade membroId={id} tipo="ministerios" />}
          {aba === 'cursos' && <SubEntidade membroId={id} tipo="cursos" />}
          {aba === 'consentimentos' && <ConsentimentosMembro membroId={id} />}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{valor}</p>
    </div>
  );
}

function ResumoMembro({ m, mostrar, mostrarCpf, mostrarEmail }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <Campo label="CPF" valor={mostrarCpf(m.cpf)} />
      <Campo label="Nascimento" valor={formatarData(m.data_nascimento)} />
      <Campo label="Idade" valor={m.data_nascimento ? `${calcularIdade(m.data_nascimento)} anos` : '—'} />
      <Campo label="Naturalidade" valor={m.naturalidade || '—'} />
      <Campo label="Telefone" valor={m.telefone || '—'} />
      <Campo label="WhatsApp" valor={m.whatsapp || '—'} />
      <Campo label="E-mail" valor={mostrarEmail(m.email)} />
      <Campo label="Endereço" valor={mostrar(m.endereco)} />
      <Campo label="Estado civil" valor={m.estado_civil || '—'} />
      <Campo label="Profissão" valor={m.profissao || '—'} />
      <Campo label="Escolaridade" valor={m.escolaridade || '—'} />
      <Campo label="Nº filhos" valor={m.num_filhos ?? '—'} />
      <Campo label="Cargo" valor={m.cargo || '—'} />
      <Campo label="Data batismo" valor={formatarData(m.data_batismo)} />
      <Campo label="Entrada congr." valor={formatarData(m.data_entrada_congregacao)} />
      <Campo label="Status" valor={STATUS_MEMBRO[m.status]?.label || m.status} />
    </div>
  );
}

function DadosPessoais({ m, mostrar, mostrarCpf, mostrarEmail, verSensivel }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xs uppercase text-gray-500 border-b pb-1 mb-3">Identificação</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Nome completo" valor={m.nome} />
          <Campo label="CPF" valor={mostrarCpf(m.cpf)} />
          <Campo label="RG" valor={mostrar(m.rg)} />
          <Campo label="Nascimento" valor={formatarData(m.data_nascimento)} />
          <Campo label="Naturalidade" valor={m.naturalidade || '—'} />
          <Campo label="Estado civil" valor={m.estado_civil || '—'} />
          <Campo label="Profissão" valor={m.profissao || '—'} />
          <Campo label="Escolaridade" valor={m.escolaridade || '—'} />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase text-gray-500 border-b pb-1 mb-3">Contato</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="E-mail" valor={mostrarEmail(m.email)} />
          <Campo label="Telefone" valor={m.telefone || '—'} />
          <Campo label="WhatsApp" valor={m.whatsapp || '—'} />
          <Campo label="Endereço" valor={mostrar(m.endereco)} />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase text-gray-500 border-b pb-1 mb-3">Família</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Nome do pai" valor={mostrar(m.nome_pai)} />
          <Campo label="Nome da mãe" valor={mostrar(m.nome_mae)} />
          <Campo label="Cônjuge" valor={mostrar(m.conjuge_nome)} />
          <Campo label="Data do casamento" valor={formatarData(m.data_casamento)} />
          <Campo label="Nº de filhos" valor={m.num_filhos ?? '—'} />
        </div>
      </div>

      <div>
        <h3 className="text-xs uppercase text-gray-500 border-b pb-1 mb-3 flex items-center gap-2">
          Saúde <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Dado sensível — Art. 11 LGPD</span>
        </h3>
        {verSensivel ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Campo label="Tipo sanguíneo" valor={m.tipo_sanguineo || '—'} />
            <Campo label="Alergias / medicações" valor={m.alergias_medicacoes || '—'} />
            <Campo label="Necessidades especiais" valor={m.necessidades_especiais || '—'} />
            <Campo label="Contato emergência" valor={m.contato_emergencia_nome || '—'} />
            <Campo label="Telefone emergência" valor={m.contato_emergencia_telefone || '—'} />
          </div>
        ) : (
          <p className="text-sm text-gray-400">Dados de saúde restritos ao perfil sede/pastor.</p>
        )}
      </div>
    </div>
  );
}

function DadosEclesiasticos({ m }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      <Campo label="Data de conversão" valor={formatarData(m.data_conversao)} />
      <Campo label="Data de batismo" valor={formatarData(m.data_batismo)} />
      <Campo label="Batismo no Espírito Santo" valor={formatarData(m.batismo_espirito_santo_em)} />
      <Campo label="Entrada na congregação" valor={formatarData(m.data_entrada_congregacao)} />
      <Campo label="Cargo atual" valor={m.cargo || '—'} />
      <Campo label="Data da consagração" valor={formatarData(m.consagracao_data)} />
      <Campo label="Oficiante da consagração" valor={m.consagracao_oficiante || '—'} />
      <Campo label="Formação teológica" valor={m.formacao_teologica || '—'} />
      <Campo label="Status" valor={STATUS_MEMBRO[m.status]?.label || m.status} />
      {m.observacoes && (
        <div className="col-span-2 lg:col-span-3">
          <Campo label="Observações" valor={m.observacoes} />
        </div>
      )}
    </div>
  );
}

function SubEntidade({ membroId, tipo }) {
  const endpointMap = {
    cargos: { list: '/historico-cargos', add: '/historico-cargos', icon: History, label: 'cargo' },
    transferencias: { list: '/transferencias', add: '/transferencias', icon: Building2, label: 'transferência' },
    ministerios: { list: '/ministerios', add: '/ministerios', icon: Music, label: 'ministério' },
    cursos: { list: '/cursos', add: '/cursos', icon: GraduationCap, label: 'curso' },
  };
  const cfg = endpointMap[tipo];
  const Icon = cfg.icon;
  const [novo, setNovo] = useState(null);
  const qc = useQueryClient();

  const { data: lista = [] } = useQuery({
    queryKey: ['membro-' + tipo, membroId],
    queryFn: () => api.get(`/membros/${membroId}${cfg.list}`).then(r => r.data),
  });

  const criar = useMutation({
    mutationFn: (payload) => api.post(`/membros/${membroId}${cfg.add}`, payload),
    onSuccess: () => { qc.invalidateQueries(['membro-' + tipo, membroId]); setNovo(null); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2"><Icon size={16} /> {cfg.label}s</h3>
        <button onClick={() => setNovo({})} className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700">
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {lista.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">Nenhum registro.</p>
      ) : (
        <ul className="divide-y bg-gray-50 rounded-lg border">
          {lista.map(item => (
            <li key={item.id} className="p-3 text-sm">
              {tipo === 'cargos' && (
                <div className="flex justify-between">
                  <span><strong>{item.cargo}</strong> • {formatarData(item.data_inicio)} → {item.data_fim ? formatarData(item.data_fim) : 'atual'}</span>
                  {item.oficializado_por && <span className="text-gray-500 text-xs">por {item.oficializado_por}</span>}
                </div>
              )}
              {tipo === 'transferencias' && (
                <div>
                  <p><strong>{item.congregacao_origem_nome || '—'}</strong> → <strong>{item.congregacao_destino_nome || '—'}</strong></p>
                  <p className="text-xs text-gray-500">{formatarData(item.data)} {item.motivo && `• ${item.motivo}`}</p>
                </div>
              )}
              {tipo === 'ministerios' && (
                <div className="flex justify-between">
                  <span><strong>{item.ministerio}</strong> {item.funcao && `• ${item.funcao}`}</span>
                  <span className="text-xs text-gray-500">{formatarData(item.data_inicio)} → {item.data_fim ? formatarData(item.data_fim) : 'atual'}</span>
                </div>
              )}
              {tipo === 'cursos' && (
                <div className="flex justify-between">
                  <span><strong>{item.curso}</strong> {item.instituicao && `• ${item.instituicao}`}</span>
                  <span className="text-xs text-gray-500">Conclusão: {formatarData(item.data_conclusao)}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {novo && (
        <FormularioSubEntidade
          tipo={tipo}
          onCancel={() => setNovo(null)}
          onSubmit={(payload) => criar.mutate(payload)}
          salvando={criar.isPending}
        />
      )}
    </div>
  );
}

function FormularioSubEntidade({ tipo, onCancel, onSubmit, salvando }) {
  const [form, setForm] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    onSubmit(form);
  };

  const inputClass = "w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500";

  return (
    <form onSubmit={submit} className="bg-white border-2 border-blue-200 rounded-xl p-4 space-y-3">
      {tipo === 'cargos' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Cargo *</label>
              <input required value={form.cargo || ''} onChange={e => set('cargo', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Data início *</label>
              <input required type="date" value={form.data_inicio || ''} onChange={e => set('data_inicio', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Data fim</label>
              <input type="date" value={form.data_fim || ''} onChange={e => set('data_fim', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Oficializado por</label>
              <input value={form.oficializado_por || ''} onChange={e => set('oficializado_por', e.target.value)} className={inputClass} /></div>
          </div>
        </>
      )}
      {tipo === 'transferencias' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Congregação origem</label>
              <input value={form.congregacao_origem_nome || ''} onChange={e => set('congregacao_origem_nome', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Congregação destino</label>
              <input value={form.congregacao_destino_nome || ''} onChange={e => set('congregacao_destino_nome', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
              <input required type="date" value={form.data || ''} onChange={e => set('data', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Motivo</label>
              <input value={form.motivo || ''} onChange={e => set('motivo', e.target.value)} className={inputClass} /></div>
          </div>
        </>
      )}
      {tipo === 'ministerios' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Ministério *</label>
              <input required value={form.ministerio || ''} onChange={e => set('ministerio', e.target.value)} placeholder="ex: louvor, infantil, diaconia" className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Função</label>
              <input value={form.funcao || ''} onChange={e => set('funcao', e.target.value)} placeholder="ex: líder, membro" className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Data início *</label>
              <input required type="date" value={form.data_inicio || ''} onChange={e => set('data_inicio', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Data fim</label>
              <input type="date" value={form.data_fim || ''} onChange={e => set('data_fim', e.target.value)} className={inputClass} /></div>
          </div>
        </>
      )}
      {tipo === 'cursos' && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Curso *</label>
              <input required value={form.curso || ''} onChange={e => set('curso', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Instituição</label>
              <input value={form.instituicao || ''} onChange={e => set('instituicao', e.target.value)} className={inputClass} /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1">Data conclusão</label>
              <input type="date" value={form.data_conclusao || ''} onChange={e => set('data_conclusao', e.target.value)} className={inputClass} /></div>
          </div>
        </>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 border rounded-lg py-2 text-sm font-medium">Cancelar</button>
        <button type="submit" disabled={salvando} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>
      </div>
    </form>
  );
}

function ConsentimentosMembro({ membroId }) {
  const { data: lista = [], isLoading } = useQuery({
    queryKey: ['membro-consentimentos', membroId],
    queryFn: () => api.get(`/lgpd/consentimentos/${membroId}`).then(r => r.data),
  });

  if (isLoading) return <p className="text-sm text-gray-400">Carregando...</p>;
  if (lista.length === 0) return <p className="text-sm text-gray-400 py-4 text-center">Nenhum aceite registrado.</p>;

  return (
    <div className="space-y-2">
      <h3 className="font-semibold flex items-center gap-2"><ShieldCheck size={16} /> Histórico de Consentimentos</h3>
      <ul className="divide-y bg-gray-50 rounded-lg border">
        {lista.map(c => (
          <li key={c.id} className="p-3 text-sm flex justify-between">
            <div>
              <p><strong>{c.finalidade}</strong> — v{c.versao_termo}</p>
              <p className="text-xs text-gray-500">IP: {c.ip || '—'}</p>
            </div>
            <div className="text-right">
              <p className={c.aceito ? 'text-green-700' : 'text-red-700'}>
                {c.aceito ? '✅ Aceito' : '❌ Recusado'}
              </p>
              <p className="text-xs text-gray-500">{formatarData(c.data_aceite, true)}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
