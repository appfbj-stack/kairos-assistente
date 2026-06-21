import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export default function TermosUso() {
  const { data: html, isLoading } = useQuery({
    queryKey: ['lgpd-termos'],
    queryFn: () => api.get('/lgpd/termos').then(r => r.data),
    staleTime: 3600000,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-900 text-white py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={22} />
          <h1 className="font-bold">Kairos — Termos de Uso</h1>
        </div>
        <Link to="/" className="text-blue-200 hover:text-white text-sm flex items-center gap-1">
          <ArrowLeft size={14} /> Voltar ao app
        </Link>
      </header>
      <div className="bg-white shadow rounded-xl mx-auto my-6 max-w-4xl">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">Carregando...</div>
        ) : (
          <div className="p-6 lg:p-10 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
      <footer className="text-center text-xs text-gray-400 pb-8 space-x-3">
        <Link to="/politica-de-privacidade" className="hover:text-gray-700">Política de Privacidade</Link>
        <span>•</span>
        <Link to="/consentimento-lgpd" className="hover:text-gray-700">Consentimento</Link>
        <span>•</span>
        <Link to="/solicitar-exclusao-de-dados" className="hover:text-gray-700">Direitos do Titular</Link>
      </footer>
    </div>
  );
}
