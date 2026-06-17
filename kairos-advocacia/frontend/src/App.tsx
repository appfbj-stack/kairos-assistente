import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Clientes from "./pages/Clientes";
import Processos from "./pages/Processos";
import ProcessoDetalhe from "./pages/ProcessoDetalhe";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import Documentos from "./pages/Documentos";
import Usuarios from "./pages/Usuarios";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/clientes"
          element={
            <ProtectedRoute roles={["admin", "advogado", "assistente_juridico"]}>
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route path="/processos" element={<Processos />} />
        <Route path="/processos/:id" element={<ProcessoDetalhe />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/financeiro" element={<Financeiro />} />
        <Route path="/documentos" element={<Documentos />} />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Usuarios />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
