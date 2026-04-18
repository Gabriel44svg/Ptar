import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login/Login';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { Laboratorio } from './pages/Laboratorio/Laboratorio';
import { Riego } from './pages/Riego/Riego';
import { Predictivo } from './pages/Predictivo/Predictivo';
import { CentroDatos } from './pages/CentroDatos/CentroDatos';
import { Administracion } from './pages/Administracion/Administracion';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rutas protegidas que usan el Layout */}
        <Route element={<Layout />}>
          
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/laboratorio" element={<Laboratorio />} />
          
          <Route path="/riego" element={<Riego />} />
          <Route path="/predictivo" element={<Predictivo />} />
          
          
          <Route path="/reportes" element={<CentroDatos />} />
          
          <Route path="/administracion" element={<Administracion />} />







          {/* Aquí iremos agregando /laboratorio, /riego, etc. */}
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;