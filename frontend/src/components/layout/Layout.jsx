import React from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import './Layout.css';

// Logos
import unamLogo from '../../assets/img/logounam.png';
import ptarLogo from '../../assets/img/ptar.png';
import fesLogo from '../../assets/img/logofes.png';

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const nombreUsuario = localStorage.getItem('usuarioNombre') || 'Usuario';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('usuarioNombre');
    localStorage.removeItem('usuarioRol');
    navigate('/login');
  };

  const isActive = (path) =>
    location.pathname === path ? 'active' : '';

  return (
    <div className="app-container">

      {/* HEADER */}
      <header className="top-header">
        <div className="header-logos">
          <img src={unamLogo} alt="UNAM" className="h-logo" />
          <img src={ptarLogo} alt="PTAR" className="h-logo-center" />
          <img src={fesLogo} alt="FES Acatlán" className="h-logo" />
        </div>

        <div className="header-user">
          <span>Bienvenido {nombreUsuario}</span>
          <button className="btn-logout" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {/* NAVBAR */}
      <nav className="navbar">

        {/* MENÚ PRINCIPAL (TUS NOMBRES) */}
        <div className="nav-main">
          <Link to="/dashboard" className={isActive('/dashboard')}>
            Dashboard Principal (Vista General)
          </Link>

          <Link to="/laboratorio" className={isActive('/laboratorio')}>
            Módulo de Laboratorio
          </Link>

          <Link to="/riego" className={isActive('/riego')}>
            Módulo de Riego y Optimización
          </Link>
        </div>

        {/* SUBMENÚ */}
        <div className="nav-sub">
          <Link to="/predictivo" className={isActive('/predictivo')}>
            Análisis Predictivo y Gráficas
          </Link>

          <Link to="/reportes" className={isActive('/reportes')}>
            Centro de Datos y Reportes
          </Link>

          <Link to="/administracion" className={isActive('/administracion')}>
            Panel de Administración
          </Link>
        </div>

      </nav>

      {/* CONTENIDO */}
      <main className="content-area">
        <Outlet />
      </main>

    </div>
  );
};