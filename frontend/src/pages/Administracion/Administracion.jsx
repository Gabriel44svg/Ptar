import React, { useState, useEffect } from 'react';
import api from '../../services/api'; // Usamos tu instancia configurada
import './Administracion.css';
import fondo from '../../assets/img/fondo.png';

export const Administracion = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [auditoria, setAuditoria] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  
  // Estados para el formulario de nuevo usuario
  const [mostrarForm, setMostrarForm] = useState(false);
  const [formUsuario, setFormUsuario] = useState({ nombre_completo: '', correo: '', password: '', rol: 'Lector' }); // Ajusté el valor inicial a 'Lector'

  const usuarioRol = localStorage.getItem('usuarioRol');
  const esSuperAdmin = usuarioRol === 'Super Admin';
  const esAdmin = usuarioRol === 'Administrador';
  const tieneAccesoUsuarios = esSuperAdmin || esAdmin;

  useEffect(() => { cargarDatosAdmin(); }, []);

  const cargarDatosAdmin = async () => {
    try {
      // Peticiones limpias usando api
      const resAuditoria = await api.get('/admin/auditoria');
      setAuditoria(resAuditoria.data);

      if (tieneAccesoUsuarios) {
        const resUsuarios = await api.get('/admin/usuarios');
        setUsuarios(resUsuarios.data);
      }
    } catch (error) {
      console.error(error);
      setMensaje({ texto: 'Error al cargar los datos del servidor.', tipo: 'error' });
    }
  };

  const handleCrearUsuario = async (e) => {
    e.preventDefault();
    try {
      // Petición limpia usando api
      await api.post('/admin/usuarios', formUsuario);
      setMensaje({ texto: 'Usuario creado exitosamente.', tipo: 'exito' });
      setMostrarForm(false);
      setFormUsuario({ nombre_completo: '', correo: '', password: '', rol: 'Lector' });
      cargarDatosAdmin();
    } catch (error) {
      console.error(error);
      setMensaje({ texto: error.response?.data?.detail || 'Error al crear usuario.', tipo: 'error' });
    }
  };

  const eliminarUsuario = async (id_usuario) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario de forma permanente?')) return;
    try {
      // Petición limpia usando api
      await api.delete(`/admin/usuarios/${id_usuario}`);
      setMensaje({ texto: 'Usuario eliminado.', tipo: 'exito' });
      cargarDatosAdmin();
    } catch (error) {
      console.error(error);
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
                  <label>Correo Electrónico</label>
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