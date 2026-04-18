import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Administracion.css';
import fondo from '../../assets/img/fondo.png';

export const Administracion = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  
  // Estados para el formulario de nuevo usuario
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ nombre_completo: '', correo: '', password: '', rol: 'Usuario de Registro' });

  const usuarioRol = localStorage.getItem('usuarioRol');
  const esSuperAdmin = usuarioRol === 'Super Admin';
  const esAdmin = usuarioRol === 'Administrador';
  const tieneAccesoUsuarios = esSuperAdmin || esAdmin;

  useEffect(() => { cargarDatosAdmin(); }, []);

  const cargarDatosAdmin = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const resAuditoria = await axios.get('http://127.0.0.1:8000/api/admin/auditoria', config);
      setAuditoria(resAuditoria.data);

      if (tieneAccesoUsuarios) {
        const resUsuarios = await axios.get('http://127.0.0.1:8000/api/admin/usuarios', config);
        setUsuarios(resUsuarios.data);
      }
    } catch (error) {
      setMensaje({ texto: 'Error al cargar los datos del servidor.', tipo: 'error' });
    }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/api/admin/usuarios', formUsuario, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: 'Usuario creado exitosamente.', tipo: 'exito' });
      setMostrarForm(false);
      setFormUsuario({ nombre_completo: '', correo: '', password: '', rol: 'Usuario de registro' });
      cargarDatosAdmin();
    } catch (error) {
      setMensaje({ texto: error.response?.data?.detail || 'Error al crear usuario.', tipo: 'error' });
    }
  };

  const eliminarUsuario = async (id_usuario) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario de forma permanente?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/admin/usuarios/${id_usuario}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: 'Usuario eliminado.', tipo: 'exito' });
      cargarDatosAdmin();
    } catch (error) {
      setMensaje({ texto: error.response?.data?.detail || 'Error al eliminar usuario.', tipo: 'error' });
    }
  };

  return (
  
      <div
        style={{
          backgroundImage: `url(${fondo})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '100%',
          padding: '2rem',
          borderRadius: '8px',
          color: 'white',
          boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.55)'
        }}
      >
      <div className="header-modulo">
        <h2 className="modulo-title">Panel de Administración</h2>
      </div>

      {mensaje.texto && <div className={`mensaje-alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

      {tieneAccesoUsuarios && (
        <div className="panel-oscuro mb-2">
          <div className="header-flex">
            <h3>Gestión de Usuarios</h3>
            <button className="btn-guardar" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cancelar' : '+ Nuevo Usuario'}
            </button>
          </div>

          {mostrarForm && (
            <form onSubmit={handleCrearUsuario} className="captura-form mt-2" style={{ backgroundColor: '#222', padding: '15px', borderRadius: '5px' }}>
              <div className="input-row">
                <div className="input-group-vertical w-50">
                  <label>Nombre Completo</label>
                  <input type="text" required value={formUsuario.nombre_completo} onChange={e => setFormUsuario({...formUsuario, nombre_completo: e.target.value})} />
                </div>
                <div className="input-group-vertical w-50">
                  <label>Correo UNAM</label>
                  <input type="email" required value={formUsuario.correo} onChange={e => setFormUsuario({...formUsuario, correo: e.target.value})} />
                </div>
              </div>
              <div className="input-row mt-2">
                <div className="input-group-vertical w-50">
                  <label>Contraseña Temporal</label>
                  <input type="password" required value={formUsuario.password} onChange={e => setFormUsuario({...formUsuario, password: e.target.value})} />
                </div>
                <div className="input-group-vertical w-50">
                  <label>Rol de Acceso</label>
                  {/* AQUÍ ESTÁ LA MAGIA: Solo opciones válidas para la DB */}
                  <select value={formUsuario.rol} onChange={e => setFormUsuario({...formUsuario, rol: e.target.value})}>
                    {esSuperAdmin && <option value="Super Admin">Super Admin</option>}
                    {esSuperAdmin && <option value="Administrador">Administrador</option>}
                    <option value="Editor">Editor</option>
                    <option value="Lector">Lector</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-guardar mt-2">Crear Cuenta</button>
            </form>
          )}

          <div className="tabla-responsive mt-2">
            <table className="tabla-historial">
              <thead>
                <tr>
                  <th>ID</th><th>Nombre</th><th>Correo</th><th>Rol</th><th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id_usuario}>
                    <td>{u.id_usuario}</td>
                    <td>{u.nombre_completo}</td>
                    <td>{u.correo}</td>
                    <td><span className={`badge-rol ${u.rol.replace(/\s+/g, '-').toLowerCase()}`}>{u.rol}</span></td>
                    <td>
                      <button className="btn-eliminar-sm" onClick={() => eliminarUsuario(u.id_usuario)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bitácora de Auditoría */}
      <div className="panel-oscuro">
        <h3>Bitácora de Auditoría</h3>
        <p className="instrucciones">Registro inalterable de modificaciones y eliminaciones críticas en el sistema.</p>
        <div className="tabla-responsive mt-2">
          <table className="tabla-historial tabla-auditoria">
            {/* Aquí va la estructura de tu tabla de auditoría exactamente como la tenías en el paso anterior */}
             <thead>
              <tr><th>No.</th><th>Fecha y Hora</th><th>Responsable</th><th>Acción</th><th>Tabla Afectada</th><th>Registro (ID)</th><th>Valor Anterior</th></tr>
            </thead>
            <tbody>
              {auditoria.map(log => (
                <tr key={log.id_auditoria}>
                  <td>{log.id_auditoria}</td><td>{new Date(log.fecha_hora_accion).toLocaleString('es-MX')}</td><td className="responsable">{log.responsable}</td>
                  <td><span className={`badge-accion ${log.accion_realizada.toLowerCase()}`}>{log.accion_realizada}</span></td>
                  <td>{log.tabla_afectada}</td><td>{log.id_registro_afectado}</td><td className="valor-anterior">{log.valor_anterior || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};