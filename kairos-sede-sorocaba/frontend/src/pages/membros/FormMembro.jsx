import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/auth';
import { X, Upload, ShieldAlert } from 'lucide-react';

const SECOES = [
  {
    titulo: 'Dados Pessoais',
    campos: [
      { name: 'nome', label: 'Nome completo *', type: 'text', required: true, span: 2 },
      { name: 'cpf', label: 'CPF', type: 'text', mask: 'cpf', sensitive: true },
      { name: 'rg', label: 'RG', type: 'text', sensitive: true },
      { name: 'data_nascimento', label: 'Data de nascimento', type: 'date' },
      { name: 'naturalidade', label: 'Naturalidade', type: 'text' },
      { name: 'estado_civil', label: 'Estado civil', type: 'select', opcoes: ['solteiro', 'casado', 'divorciado', 'viuvo'] },
      { name: 'profissao', label: 'Profissão', type: 'text' },
      { name: 'escolaridade', label: 'Escolaridade', type: 'select', opcoes: ['fundamental', 'medio', 'superior', 'pos-graduacao', 'mestrado', 'doutorado'] },
    ],
  },
  {
    titulo: 'Contato',
    campos: [
      { name: 'email', label: 'E-mail', type: 'email', sensitive: true },
      { name: 'telefone', label: 'Telefone', type: 'tel' },
      { name: 'whatsapp', label: 'WhatsApp', type: 'tel' },
      { name: 'endereco', label: 'Endereço', type: 'text', span: 2, sensitive: true },
    ],
  },
  {
    titulo: 'Família',
    campos: [
      { name: 'nome_pai', label: 'Nome do pai', type: 'text', span: 2, sensitive: true },
      { name: 'nome_mae', label: 'Nome da mãe', type: 'text', span: 2, sensitive: true },
      { name: 'conjuge_nome', label: 'Cônjuge', type: 'text', sensitive: true },
      { name: 'data_casamento', label: 'Data do casamento', type: 'date' },
      { name: 'num_filhos', label: 'Nº de filhos', type: 'number' },
    ],
  },
  {
    titulo: 'Saúde (dado sensível — Art. 11 LGPD)',
    campos: [
      { name: 'tipo_sanguineo', label: 'Tipo sanguíneo', type: 'select', opcoes: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], sensitive: true },
      { name: 'alergias_medicacoes', label: 'Alergias / medicações', type: 'textarea', span: 2, sensitive: true },
      { name: 'necessidades_especiais', label: 'Necessidades especiais', type: 'textarea', span: 2, sensitive: true },
      { name: 'contato_emergencia_nome', label: 'Contato de emergência (nome)', type: 'text', sensitive: true },
      { name: 'contato_emergencia_telefone', label: 'Contato de emergência (telefone)', type: 'tel', sensitive: true },
    ],
  },
  {
    titulo: 'Dados Eclesiásticos',
    campos: [
      { name: 'data_conversao', label: 'Data de conversão', type: 'date' },
      { name: 'data_batismo', label: 'Data de batismo', type: 'date' },
      { name: 'batismo_espirito_santo_em', label: 'Batismo no Espírito Santo', type: 'date' },
      { name: 'data_entrada_congregacao', label: 'Entrada na congregação', type: 'date' },
      { name: 'cargo', label: 'Cargo atual', type: 'text' },
      { name: 'consagracao_data', label: 'Data da consagração', type: 'date' },
      { name: 'consagracao_oficiante', label: 'Oficiante da consagração', type: 'text', span: 2 },
      { name: 'formacao_teologica', label: 'Formação teológica', type: 'textarea', span: 2 },
      { name: 'status', label: 'Status *', type: 'select', opcoes: ['ativo', 'inativo', 'transferido', 'falecido'], required: true },
    ],
  },
  {
    titulo: 'Observações',
    campos: [
      { name: 'observacoes', label: 'Observações gerais', type: 'textarea', span: 2 },
    ],
  },
];

export default function FormMembro({ membro, onFechar }) {
  const qc = useQueryClient();
  const { isSede, canSeeSensitive } = useAuthStore();
  const verSensivel = canSeeSensitive();

  const [form, setForm] = useState({
    nome: '', cpf: '', rg: '', data_nascimento: '', email: '', telefone: '', whatsapp: '',
    endereco: '', estado_civil: '', naturalidade: '', profissao: '', escolaridade: '',
    nome_pai: '', nome_mae: '', conjuge_nome: '', data_casamento: '', num_filhos: '',
    tipo_sanguineo: '', alergias_medicacoes: '', necessidades_especiais: '',
    contato_emergencia_nome: '', contato_emergencia_telefone: '',
    data_conversao: '', data_batismo: '', batismo_espirito_santo_em: '', data_entrada_congregacao: '',
    cargo: '', consagracao_data: '', consagracao_oficiante: '', formacao_teologica: '',
    status: 'ativo', observacoes: '', congregacao_id: '',
    lgpd_aceite: false,
    ...membro,
  });
  const [foto, setFoto] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(membro?.foto_url || null);
  const [erroLgpd, setErroLgpd] = useState('');

  const { data: congregacoes } = useQuery({
    queryKey: ['congregacoes'],
    queryFn: () => api.get('/congregacoes').then(r => r.data),
    enabled: isSede(),
  });

  const salvar = useMutation({
    mutationFn: () => {
      setErroLgpd('');
      if (!form.lgpd_aceite) {
        setErroLgpd('O consentimento LGPD é obrigatório. Marque a caixa para continuar.');
        throw new Error('LGPD não aceito');
      }
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null || v === undefined) return;
        if (typeof v === 'boolean') {
          if (v) fd.append(k, 'true');
          return;
        }
        fd.append(k, v);
      });
      if (foto) fd.append('foto', foto);
      if (membro?.id) return api.put(`/membros/${membro.id}`, fd);
      return api.post('/membros', fd);
    },
    onSuccess: () => { qc.invalidateQueries(['membros']); qc.invalidateQueries(['dashboard']); onFechar(); },
    onError: (err) => {
      const detail = err.response?.data?.detail || '';
      if (detail.toLowerCase().includes('lgpd') || detail.toLowerCase().includes('consentimento')) {
        setErroLgpd(detail);
      }
    },
  });

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
      <div className="bg-white w-full lg:max-w-3xl lg:rounded-2xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-900">{membro ? 'Editar' : 'Novo'} Membro</h2>
          <button onClick={onFechar} className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} /></button>
        </div>

        <div className="p-4 space-y-6">
          {/* Foto */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
              {fotoPreview
                ? <img src={fotoPreview} alt="Foto" className="w-full h-full object-cover" />
                : <span className="text-3xl text-gray-300">👤</span>
              }
            </div>
            <label className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg cursor-pointer text-sm">
              <Upload size={16} /> Foto
              <input type="file" accept="image/*" onChange={handleFoto} className="hidden" />
            </label>
          </div>

          {/* Congregação */}
          {isSede() && congregacoes && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Congregação *</label>
              <select value={form.congregacao_id} onChange={e => setForm(f => ({ ...f, congregacao_id: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                <option value="">Selecione...</option>
                {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
          )}

          {/* Seções de campos */}
          {SECOES.map(sec => (
            <div key={sec.titulo} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-gray-500 border-b pb-1">
                {sec.titulo}
                {sec.titulo.includes('sensível') && (
                  <span className="ml-2 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">LGPD Art. 11</span>
                )}
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {sec.campos.map(({ name, label, type, required, opcoes, span, sensitive }) => {
                  // Pular campos sensíveis quando o usuário logado não pode vê-los (em edição)
                  // Mas permitir salvar valor existente — só escondemos do form
                  const colSpan = span === 2 ? 'lg:col-span-2' : '';
                  return (
                    <div key={name} className={colSpan}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                        {sensitive && !verSensivel && <span className="ml-1 text-[10px] text-gray-400">(restrito)</span>}
                      </label>
                      {type === 'select' ? (
                        <select value={form[name]} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
                          <option value="">Selecione...</option>
                          {opcoes.filter(o => o !== '').map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1).replace('_', ' ')}</option>)}
                        </select>
                      ) : type === 'textarea' ? (
                        <textarea value={form[name] || ''} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                          rows={3} className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" />
                      ) : (
                        <input type={type} value={form[name] || ''} required={required}
                          onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* LGPD — Consentimento */}
          <div className="border-2 border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <ShieldAlert size={20} className="text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-blue-900">Consentimento LGPD</h3>
                <p className="text-xs text-blue-800">
                  O titular dos dados deve autorizar o tratamento. Ao marcar a caixa, você declara ter obtido o consentimento
                  do titular (ou seu representante legal). O aceite será registrado com IP, data e versão do termo.
                </p>
                <a href="/consentimento-lgpd" target="_blank" className="text-xs text-blue-700 underline">Ver termo completo</a>
              </div>
            </div>
            <label className="flex items-start gap-2 text-sm text-blue-900 cursor-pointer">
              <input
                type="checkbox"
                checked={form.lgpd_aceite}
                onChange={e => { setForm(f => ({ ...f, lgpd_aceite: e.target.checked })); setErroLgpd(''); }}
                className="mt-1"
              />
              <span>Li e obteve o consentimento do titular para o tratamento de seus dados pessoais para fins administrativos e de comunicação da igreja, conforme a <a href="/politica-de-privacidade" target="_blank" className="underline">Política de Privacidade</a>.</span>
            </label>
            {membro?.lgpd_aceite && (
              <p className="text-xs text-blue-700">
                ✅ Aceite já registrado em {new Date(membro.lgpd_data_aceite).toLocaleString('pt-BR')} (termo v{membro.lgpd_versao_termo}).
              </p>
            )}
            {erroLgpd && (
              <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{erroLgpd}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 p-4 border-t sticky bottom-0 bg-white">
          <button onClick={onFechar} className="flex-1 border rounded-lg py-2 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending || !form.nome || !form.lgpd_aceite}
            className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {salvar.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
