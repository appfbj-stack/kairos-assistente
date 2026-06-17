import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Cidadaos from "./pages/Cidadaos";
import Liderancas from "./pages/Liderancas";
import Parceiros from "./pages/Parceiros";
import Demandas from "./pages/Demandas";
import DemandaDetalhe from "./pages/DemandaDetalhe";
import Agenda from "./pages/Agenda";
import Equipe from "./pages/Equipe";

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
          path="/cidadaos"
          element={
            <ProtectedRoute roles={["admin", "vereador", "assessor"]}>
              <Cidadaos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/liderancas"
          element={
            <ProtectedRoute roles={["admin", "vereador", "assessor"]}>
              <Liderancas />
            </ProtectedRoute>
          }
        />
        <Route
          path="/parceiros"
          element={
            <ProtectedRoute roles={["admin", "vereador", "assessor"]}>
              <Parceiros />
            </ProtectedRoute>
          }
        />
        <Route path="/demandas" element={<Demandas />} />
        <Route path="/demandas/:id" element={<DemandaDetalhe />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route
          path="/equipe"
          element={
            <ProtectedRoute roles={["admin"]}>
              <Equipe />
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  );
}
