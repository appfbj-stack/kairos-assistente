import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';

const TIPOS = [
  { value: 'acesso', label: 'Acesso aos dados (Art. 18, II)' },
  { value: 'retificacao', label: 'Correção de dados incompletos ou inexatos (Art. 18, III)' },
  { value: 'exclusao', label: 'Eliminação de dados (Art. 18, VI)' },
  { value: 'portabilidade', label: 'Portabilidade dos dados (Art. 18, V)' },
  { value: 'revogacao', label: 'Revogação do consentimento (Art. 8º, §5º)' },
];

export default function SolicitarExclusao() {
  const [form, setForm] = useState({
    titular_nome: '', titular_email: '', titular_cpf: '',
    titular_telefone: '', tipo: 'acesso', descricao: '',
  });
  const [enviado, setEnviado] = useState(null);

  const enviar = useMutation({
    mutationFn: () => api.post('/lgpd/solicitacao', form).then(r => r.data),
    onSuccess: (data) => { setEnviado(data); },
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  if (enviado) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 max-w-md text-center">
          <CheckCircle2 size={56} className="mx-auto mb-3 text-green-600" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Solicitação registrada</h1>
          <p className="text-sm text-gray-600 mb-3">
            Protocolo <strong className="font-mono">#{enviado.protocolo}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Sua solicitação foi registrada e será processada em até 15 dias úteis. Você receberá resposta no e-mail informado.
          </p>
          <Link to="/" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium inline-block hover:bg-blue-700">
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} />
          <h1 className="font-bold">Kairos — Direitos do Titular (LGPD)</h1>
        </div>
        <Link to="/" className="text-blue-200 hover:text-white text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Voltar ao app
        </Link>
      </header>

      <div className="bg-white shadow rounded-xl mx-auto my-6 max-w-2xl p-6 lg:p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Solicitação de Direitos do Titular</h2>
        <p className="text-sm text-gray-500 mb-6">
          Conforme a Lei 13.709/2018 (LGPD), você pode exercer seus direitos sobre seus dados pessoais.
          Preencha o formulário abaixo. A identificação é necessária para validar a titularidade.
        </p>

        {enviar.isError && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            <span>Erro ao enviar. Verifique os campos e tente novamente.</span>
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); enviar.mutate(); }}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
              <input required value={form.titular_nome} onChange={e => set('titular_nome', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
              <input required type="email" value={form.titular_email} onChange={e => set('titular_email', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <input value={form.titular_cpf} onChange={e => set('titular_cpf', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={form.titular_telefone} onChange={e => set('titular_telefone', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de solicitação *</label>
            <select value={form.tipo} onChange={e => set('tipo', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500">
              {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descreva sua solicitação *</label>
            <textarea required rows={5} value={form.descricao} onChange={e => set('descricao', e.target.value)}
              placeholder="Detalhe quais dados deseja acessar, corrigir ou excluir."
              className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">
            Ao enviar, você concorda em ser contactado pelo e-mail informado. Sua solicitação será processada em até 15 dias úteis.
          </div>

          <button
            type="submit"
            disabled={enviar.isPending}
            className="w-full bg-blue-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {enviar.isPending ? 'Enviando...' : 'Enviar solicitação'}
          </button>
        </form>
      </div>

      <footer className="text-center text-xs text-gray-400 pb-8 space-x-3">
        <Link to="/politica-de-privacidade" className="hover:text-gray-700">Política de Privacidade</Link>
        <span>•</span>
        <Link to="/termos-de-uso" className="hover:text-gray-700">Termos de Uso</Link>
      </footer>
    </div>
  );
}
