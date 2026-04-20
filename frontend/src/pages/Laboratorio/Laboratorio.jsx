import React, { useState, useEffect } from 'react';
import api from '../../services/api'
import './Laboratorio.css';
import fondo from '../../assets/img/fondo.png';

export const Laboratorio = () => {
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [historial, setHistorial] = useState([]);
  const [editandoId, setEditandoId] = useState(null); // NUEVO: Rastrea si estamos editando

  const estadoInicial = {
    fecha: new Date().toISOString().split('T')[0],
    hora: new Date().toTimeString().split(' ')[0].substring(0, 5),
    no_muestra: '',
    tec_nivel: '', tec_ph: '', tec_dqo: '', tec_t: '',
    rac_dqo: '', rac_ph: '', rac_t: '',
    rec_ssed: '', rec_od: '', rec_ph: '', rec_t: '',
    csc_dqo: '', csc_ph: '', csc_t: '',
    observaciones: '',
    realizo: ''
  };

  const [formulario, setFormulario] = useState(estadoInicial);

  const usuarioRol = localStorage.getItem('usuarioRol');
  const puedeEliminar = usuarioRol === 'Super Admin' || usuarioRol === 'Administrador';

  useEffect(() => {
    cargarHistorial();
  }, []);

  const cargarHistorial = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://127.0.0.1:8000/api/laboratorio/registros', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistorial(res.data);
    } catch (error) {
      console.error("Error al cargar historial");
    }
  };

  const handleChange = (e) => {
    setFormulario({ ...formulario, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      
      const payload = {};
      Object.keys(formulario).forEach(key => {
        if (formulario[key] === '') {
          payload[key] = null;
        } else if (key !== 'fecha' && key !== 'hora' && key !== 'observaciones' && key !== 'realizo') {
          payload[key] = Number(formulario[key]);
        } else {
          payload[key] = formulario[key];
        }
      });

      // Si estamos editando, hacemos un PUT, si no, hacemos un POST
      if (editandoId) {
        await axios.put(`http://127.0.0.1:8000/api/laboratorio/registros/${editandoId}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMensaje({ texto: 'Registro modificado exitosamente.', tipo: 'exito' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/laboratorio/registros', payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMensaje({ texto: 'Registro F02-PTAR-02 guardado exitosamente.', tipo: 'exito' });
      }

      setFormulario(estadoInicial);
      setEditandoId(null); // Salimos del modo edición
      cargarHistorial();
    } catch (error) {
      setMensaje({ texto: 'Error al procesar el registro. Revisa los datos.', tipo: 'error' });
    }
  };

  const eliminarRegistro = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro de la bitácora? Esta acción no se puede deshacer.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/laboratorio/registros/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: 'Registro eliminado exitosamente.', tipo: 'exito' });
      cargarHistorial();
    } catch (error) {
      setMensaje({ texto: 'Error al eliminar. Permisos insuficientes.', tipo: 'error' });
    }
  };

  // NUEVO: Función para cargar los datos a los inputs y subir la pantalla
  const cargarParaEditar = (reg) => {
    setEditandoId(reg.id_registro);
    setFormulario({
      fecha: reg.fecha,
      hora: reg.hora ? reg.hora.substring(0, 5) : '', // Formateamos la hora para el input
      no_muestra: reg.no_muestra,
      tec_nivel: reg.tec_nivel ?? '', tec_ph: reg.tec_ph ?? '', tec_dqo: reg.tec_dqo ?? '', tec_t: reg.tec_t ?? '',
      rac_dqo: reg.rac_dqo ?? '', rac_ph: reg.rac_ph ?? '', rac_t: reg.rac_t ?? '',
      rec_ssed: reg.rec_ssed ?? '', rec_od: reg.rec_od ?? '', rec_ph: reg.rec_ph ?? '', rec_t: reg.rec_t ?? '',
      csc_dqo: reg.csc_dqo ?? '', csc_ph: reg.csc_ph ?? '', csc_t: reg.csc_t ?? '',
      observaciones: reg.observaciones ?? '',
      realizo: reg.realizo ?? ''
    });
    // Sube la pantalla suavemente para que veas el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
  };

  // NUEVO: Cancelar la edición
  const cancelarEdicion = () => {
    setFormulario(estadoInicial);
    setEditandoId(null);
    setMensaje({ texto: '', tipo: '' });
  };

  return (
      <div 
        className="modulo-container"
        style={{ 
          backgroundImage: `url(${fondo})`, 
          backgroundSize: 'cover', 
          backgroundPosition: 'center', 
          backgroundAttachment: 'fixed',
          minHeight: '100%', 
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: 'inset 0 0 0 2000px rgba(27, 27, 27, 0.6)' 
        }}
      >
      <div className="header-modulo">
        {/* TÍTULO EN COLOR BLANCO */}
        <h2 className="modulo-title" style={{ color: 'white' }}>
          {editandoId ? 'Modificando Registro F02-PTAR-02' : 'Captura de Bitácora F02-PTAR-02'}
        </h2>
      </div>

      {mensaje.texto && <div className={`mensaje-alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

      <div className="panel-oscuro" style={{ border: editandoId ? '2px solid #f0ad4e' : 'none' }}>
        <form onSubmit={handleSubmit} className="form-bitacora">
          
          <div className="form-seccion">
            <h4 style={{ color: editandoId ? '#f0ad4e' : '#aa863a' }}>Datos Generales</h4>
            <div className="form-grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="input-group">
                <label>Fecha</label>
                <input type="date" name="fecha" value={formulario.fecha} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Hora</label>
                <input type="time" name="hora" value={formulario.hora} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>No. Muestra</label>
                <input type="number" name="no_muestra" value={formulario.no_muestra} onChange={handleChange} required />
              </div>
              <div className="input-group">
                <label>Realizó</label>
                <input type="text" name="realizo" value={formulario.realizo} onChange={handleChange} required placeholder="Ej. ORM" />
              </div>
            </div>
          </div>

          <div className="tanques-grid">
            <div className="form-seccion tanque-caja">
              <h4 style={{ color: editandoId ? '#f0ad4e' : '#aa863a' }}>TEC-01</h4>
              <div className="input-group"><label>NIVEL (m)</label><input type="number" step="0.01" name="tec_nivel" value={formulario.tec_nivel} onChange={handleChange} /></div>
              <div className="input-group"><label>pH</label><input type="number" step="0.01" name="tec_ph" value={formulario.tec_ph} onChange={handleChange} /></div>
              <div className="input-group"><label>DQO</label><input type="number" step="0.1" name="tec_dqo" value={formulario.tec_dqo} onChange={handleChange} /></div>
              <div className="input-group"><label>T (°C)</label><input type="number" step="0.1" name="tec_t" value={formulario.tec_t} onChange={handleChange} /></div>
            </div>

            <div className="form-seccion tanque-caja">
              <h4 style={{ color: editandoId ? '#f0ad4e' : '#aa863a' }}>RAC-01</h4>
              <div className="input-group"><label>DQO</label><input type="number" step="0.1" name="rac_dqo" value={formulario.rac_dqo} onChange={handleChange} /></div>
              <div className="input-group"><label>pH</label><input type="number" step="0.01" name="rac_ph" value={formulario.rac_ph} onChange={handleChange} /></div>
              <div className="input-group"><label>T (°C)</label><input type="number" step="0.1" name="rac_t" value={formulario.rac_t} onChange={handleChange} /></div>
            </div>

            <div className="form-seccion tanque-caja">
              <h4 style={{ color: editandoId ? '#f0ad4e' : '#aa863a' }}>REC-01</h4>
              <div className="input-group"><label>SSED</label><input type="number" step="0.1" name="rec_ssed" value={formulario.rec_ssed} onChange={handleChange} /></div>
              <div className="input-group"><label>OD</label><input type="number" step="0.01" name="rec_od" value={formulario.rec_od} onChange={handleChange} /></div>
              <div className="input-group"><label>pH</label><input type="number" step="0.01" name="rec_ph" value={formulario.rec_ph} onChange={handleChange} /></div>
              <div className="input-group"><label>T (°C)</label><input type="number" step="0.1" name="rec_t" value={formulario.rec_t} onChange={handleChange} /></div>
            </div>

            <div className="form-seccion tanque-caja">
              <h4 style={{ color: editandoId ? '#f0ad4e' : '#aa863a' }}>CSC-01</h4>
              <div className="input-group"><label>DQO</label><input type="number" step="0.1" name="csc_dqo" value={formulario.csc_dqo} onChange={handleChange} /></div>
              <div className="input-group"><label>pH</label><input type="number" step="0.01" name="csc_ph" value={formulario.csc_ph} onChange={handleChange} /></div>
              <div className="input-group"><label>T (°C)</label><input type="number" step="0.1" name="csc_t" value={formulario.csc_t} onChange={handleChange} /></div>
            </div>
          </div>

          <div className="form-seccion mt-2">
            <div className="input-group">
              <label>Observaciones</label>
              <input type="text" name="observaciones" value={formulario.observaciones} onChange={handleChange} placeholder="Ej. OD = 9.78..." />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              type="submit" 
              className="btn-guardar mt-2 w-100" 
              style={{ backgroundColor: editandoId ? '#f0ad4e' : '#aa863a', color: editandoId ? '#000' : '#fff' }}
            >
              {editandoId ? 'Actualizar Registro' : 'Guardar Registro en Bitácora'}
            </button>
            
            {editandoId && (
              <button 
                type="button" 
                className="btn-guardar mt-2" 
                onClick={cancelarEdicion}
                style={{ backgroundColor: '#555', flexBasis: '20%' }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>
      
      <div className="panel-oscuro mt-2">
        <h3>Historial Formato F02-PTAR-02</h3>
        <div className="tabla-responsive mt-2" style={{ overflowX: 'auto' }}>
            <table className="tabla-historial tabla-completa">
              <thead>
                <tr>
                  <th rowSpan="2" className="borde-derecho">Fecha</th>
                  <th rowSpan="2" className="borde-derecho">Hora</th>
                  <th rowSpan="2" className="borde-derecho">No.<br/>Muestra</th>
                  <th colSpan="4" className="borde-derecho text-center">TEC-01</th>
                  <th colSpan="3" className="borde-derecho text-center">RAC-01</th>
                  <th colSpan="4" className="borde-derecho text-center">REC-01</th>
                  <th colSpan="3" className="borde-derecho text-center">CSC-01</th>
                  <th rowSpan="2" className="borde-derecho">Observaciones</th>
                  <th rowSpan="2" className="borde-derecho">Realizó</th>
                  {puedeEliminar && <th rowSpan="2">Acciones</th>}
                </tr>
                <tr>
                  <th>NIVEL</th><th>pH</th><th>DQO</th><th className="borde-derecho">T(°C)</th>
                  <th>DQO</th><th>pH</th><th className="borde-derecho">T(°C)</th>
                  <th>SSED</th><th>OD</th><th>pH</th><th className="borde-derecho">T(°C)</th>
                  <th>DQO</th><th>pH</th><th className="borde-derecho">T(°C)</th>
                </tr>
              </thead>
              <tbody>
                {historial.map(reg => (
                  <tr key={reg.id_registro} style={{ backgroundColor: editandoId === reg.id_registro ? 'rgba(240, 173, 78, 0.2)' : 'transparent' }}>
                    <td className="borde-derecho">{reg.fecha}</td>
                    <td className="borde-derecho">{reg.hora.substring(0,5)}</td>
                    <td className="borde-derecho" style={{fontWeight: 'bold'}}>{reg.no_muestra}</td>
                    
                    <td>{reg.tec_nivel ?? '-'}</td><td>{reg.tec_ph ?? '-'}</td><td>{reg.tec_dqo ?? '-'}</td><td className="borde-derecho">{reg.tec_t ?? '-'}</td>
                    <td>{reg.rac_dqo ?? '-'}</td><td>{reg.rac_ph ?? '-'}</td><td className="borde-derecho">{reg.rac_t ?? '-'}</td>
                    <td>{reg.rec_ssed ?? '-'}</td><td>{reg.rec_od ?? '-'}</td><td>{reg.rec_ph ?? '-'}</td><td className="borde-derecho">{reg.rec_t ?? '-'}</td>
                    <td>{reg.csc_dqo ?? '-'}</td><td>{reg.csc_ph ?? '-'}</td><td className="borde-derecho">{reg.csc_t ?? '-'}</td>
                    
                    <td className="borde-derecho">{reg.observaciones || '-'}</td>
                    <td className="borde-derecho" style={{color: '#888', fontWeight: 'bold'}}>{reg.realizo}</td>
                    
                    {puedeEliminar && (
                      <td style={{ minWidth: '160px' }}>
                        <button 
                          onClick={() => cargarParaEditar(reg)}
                          style={{ backgroundColor: '#f0ad4e', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontWeight: 'bold' }}
                        >
                          Modificar
                        </button>
                        <button 
                          onClick={() => eliminarRegistro(reg.id_registro)}
                          style={{ backgroundColor: '#c92a2a', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}
                        >
                          Eliminar
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      </div>
    </div>
  );
};