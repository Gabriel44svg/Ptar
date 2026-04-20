import React, { useState } from 'react';
import api from '../../services/api'; // Importamos la configuración de producción
import { useNavigate } from 'react-router-dom';
import './Login.css';

// Importación de las imágenes
import fondo from '../../assets/img/fondo.png';
import ptarLogo from '../../assets/img/ptar.png';
import unamLogo from '../../assets/img/logounam.png';
import fesLogo from '../../assets/img/logofes.png';

export const Login = () => {
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    // Preparamos los datos en formato x-www-form-urlencoded como requiere OAuth2
    const formData = new URLSearchParams();
    formData.append('username', correo);
    formData.append('password', password);

    try {
      // Usamos 'api' en lugar de 'axios' directo. 
      // La URL base ya está en api.js, así que solo usamos la ruta final.
      const response = await api.post(
        '/auth/login',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, nombre, rol } = response.data;

      // Guardamos la sesión en el navegador
      localStorage.setItem('token', access_token);
      localStorage.setItem('usuarioNombre', nombre);
      localStorage.setItem('usuarioRol', rol);

      // ¡Al éxito!
      navigate('/dashboard');

    } catch (err) {
      console.error('Error de login:', err);
      if (err.response && err.response.status === 401) {
        setError('Correo o contraseña incorrectos');
      } else {
        setError('Error al conectar con el servidor. Verifica tu conexión.');
      }
    }
  };

  return (
    <div className="login-page">

      {/* Encabezado Institucional */}
      <header className="main-header">
        <img src={unamLogo} alt="UNAM" className="header-logo" />
        <img src={fesLogo} alt="FES Acatlán" className="header-logo" />
      </header>

      {/* Franja Dorada */}
      <div className="gold-bar"></div>

      {/* Área Principal con Fondo */}
      <main className="login-content" style={{ backgroundImage: `url(${fondo})` }}>

        <div className="form-wrapper">

          {/* Logo PTAR */}
          <img src={ptarLogo} alt="PTAR Logo" className="logo-ptar" />

          <div className="login-box">
            <h2 className="login-title">Inicio de Sesión</h2>
            <hr className="title-divider" />

            {/* Mensaje de error */}
            {error && (
              <div style={{
                color: '#ff6b6b',
                marginBottom: '10px',
                textAlign: 'center',
                fontWeight: 'bold'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="login-form">

              <div className="input-group">
                <label>Correo electrónico</label>
                <input
                  type="email"
                  placeholder='Ej. "admin@fes.unam.mx"'
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  required
                />
              </div>

              <div className="input-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  placeholder="**********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn-ingresar">
                Ingresar
              </button>

            </form>
          </div>
        </div>

      </main>
    </div>
  );
};