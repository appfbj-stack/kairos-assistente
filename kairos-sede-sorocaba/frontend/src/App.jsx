import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from './stores/auth';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Callback from './pages/auth/Callback';
import Dashboard from './pages/dashboard/Dashboard';
import Membros from './pages/membros/Membros';
import FichaMembro from './pages/membros/FichaMembro';
import Obreiros from './pages/obreiros/Obreiros';
import Congregacoes from './pages/congregacoes/Congregacoes';
import Patrimonio from './pages/patrimonio/Patrimonio';
import Agenda from './pages/agenda/Agenda';
import Carteirinhas from './pages/carteirinhas/Carteirinhas';
import PoliticaPrivacidade from './pages/lgpd/PoliticaPrivacidade';
import TermosUso from './pages/lgpd/TermosUso';
import Consentimento from './pages/lgpd/Consentimento';
import SolicitarExclusao from './pages/lgpd/SolicitarExclusao';
import Solicitacoes from './pages/lgpd/Solicitacoes';
import Auditoria from './pages/lgpd/Auditoria';


const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } });

function RotaProtegida({ children }) {
  const { usuario, token, carregando } = useAuthStore();
  if (carregando) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!token && !usuario) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function SomentesSede({ children }) {
  const { isSede } = useAuthStore();
  if (!isSede()) return <Navigate to="/dashboard" replace />;
  return children;
}

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RotaModulo({ slug, children }) {
  const { moduloAtivo } = useAuthStore();
  const ativo = moduloAtivo(slug);
  if (ativo === null) return <Loading />;
  if (!ativo) return <Navigate to="/dashboard" replace />;
  return children;
}

// Wrapper para páginas públicas (sem login, sem Layout)
function RotaPublica({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}

export default function App() {
  const { carregarUsuario, carregarModulos } = useAuthStore();
  useEffect(() => { carregarUsuario(); }, []);
  useEffect(() => { carregarModulos(); }, []);

  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          {/* Públicas — LGPD */}
          <Route path="/politica-de-privacidade" element={<RotaPublica><PoliticaPrivacidade /></RotaPublica>} />
          <Route path="/termos-de-uso" element={<RotaPublica><TermosUso /></RotaPublica>} />
          <Route path="/consentimento-lgpd" element={<RotaPublica><Consentimento /></RotaPublica>} />
          <Route path="/solicitar-exclusao-de-dados" element={<RotaPublica><SolicitarExclusao /></RotaPublica>} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/auth/callback" element={<Callback />} />
          <Route path="/acesso-negado" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="bg-white rounded-2xl p-8 text-center shadow max-w-md">
                <div className="text-5xl mb-4">🚫</div>
                <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso não permitido</h1>
                <p className="text-gray-500 text-sm mb-4">Seu e-mail não está cadastrado no sistema. Entre em contato com o administrador da sede.</p>
                <a href="/login" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium inline-block hover:bg-blue-700">Voltar ao Login</a>
              </div>
            </div>
          } />

          {/* Protegidas */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<RotaProtegida><Dashboard /></RotaProtegida>} />
          <Route path="/membros"      element={<RotaProtegida><RotaModulo slug="membros"><Membros /></RotaModulo></RotaProtegida>} />
          <Route path="/membros/:id"  element={<RotaProtegida><RotaModulo slug="membros"><FichaMembro /></RotaModulo></RotaProtegida>} />
          <Route path="/obreiros"     element={<RotaProtegida><RotaModulo slug="obreiros"><Obreiros /></RotaModulo></RotaProtegida>} />
          <Route path="/carteirinhas" element={<RotaProtegida><RotaModulo slug="carteirinhas"><Carteirinhas /></RotaModulo></RotaProtegida>} />
          <Route path="/congregacoes" element={<RotaProtegida><SomentesSede><RotaModulo slug="congregacoes"><Congregacoes /></RotaModulo></SomentesSede></RotaProtegida>} />
          <Route path="/patrimonio"   element={<RotaProtegida><RotaModulo slug="patrimonio"><Patrimonio /></RotaModulo></RotaProtegida>} />
          <Route path="/agenda"       element={<RotaProtegida><RotaModulo slug="agenda"><Agenda /></RotaModulo></RotaProtegida>} />
          <Route path="/lgpd/solicitacoes" element={<RotaProtegida><SomentesSede><RotaModulo slug="lgpd"><Solicitacoes /></RotaModulo></SomentesSede></RotaProtegida>} />
          <Route path="/lgpd/auditoria"    element={<RotaProtegida><SomentesSede><RotaModulo slug="lgpd"><Auditoria /></RotaModulo></SomentesSede></RotaProtegida>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
