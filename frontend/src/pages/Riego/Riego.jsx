import React, { useState, useEffect } from 'react';
import api from '../../services/api'
import './Riego.css'; // Asegúrate de tener aquí los estilos de la tabla gigante
import fondo from '../../assets/img/fondo.png';

export const Riego = () => {
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  
  // Estados para la base de datos
  const [zonas, setZonas] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [editandoId, setEditandoId] = useState(null);

  // Estados del Simulador y Zonas
  const [nuevaZona, setNuevaZona] = useState({ nombre_zona: '', demanda_agua: 0, costo_distribucion: 1 });
  const [volumenSimulacion, setVolumenSimulacion] = useState('');
  const [resultadosSimulacion, setResultadosSimulacion] = useState(null);

  // Estado Inicial del Formato F01-PTAR-15
  const estadoInicial = {
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '', hora_termino: '', zona_regar: '',
    bcm_03a: '', bcm_03b: '', bcm_03r: '',
    tac_inicio: '', tac_termino: '', volumen_usado: '',
    observaciones: 'Alim. Continua', responsable: ''
  };

  const [formulario, setFormulario] = useState(estadoInicial);

  const usuarioRol = localStorage.getItem('usuarioRol');
  const esAdmin = usuarioRol === 'Super Admin' || usuarioRol === 'Administrador';

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Traemos las zonas para el simulador y los registros para la tabla
      const [resZonas, resRegistros] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/riego/zonas', config),
        axios.get('http://127.0.0.1:8000/api/riego/registros', config)
      ]);
      setZonas(resZonas.data);
      setHistorial(resRegistros.data);
      
      // Preseleccionar la primera zona si existe
      if (resZonas.data.length > 0 && !formulario.zona_regar) {
        setFormulario(prev => ({ ...prev, zona_regar: resZonas.data[0].nombre_zona }));
      }
    } catch (error) {
      console.error("Error al cargar datos", error);
    }
  };

  const handleChange = (e) => { setFormulario({ ...formulario, [e.target.name]: e.target.value }); };

  // --- SUBMIT DEL FORMATO F01-PTAR-15 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = { ...formulario };
      
      // Convertir campos vacíos a null y textos a números donde corresponda
      ['bcm_03a', 'bcm_03b', 'bcm_03r', 'tac_inicio', 'tac_termino', 'volumen_usado'].forEach(k => {
        payload[k] = payload[k] === '' ? null : Number(payload[k]);
      });

      if (editandoId) {
        await axios.put(`http://127.0.0.1:8000/api/riego/registros/${editandoId}`, payload, { headers: { Authorization: `Bearer ${token}` } });
        setMensaje({ texto: 'Registro modificado exitosamente.', tipo: 'exito' });
      } else {
        await axios.post('http://127.0.0.1:8000/api/riego/registros', payload, { headers: { Authorization: `Bearer ${token}` } });
        setMensaje({ texto: 'Registro F01-PTAR-15 guardado exitosamente.', tipo: 'exito' });
      }

      setFormulario({ ...estadoInicial, zona_regar: zonas.length > 0 ? zonas[0].nombre_zona : '' });
      setEditandoId(null);
      cargarDatos();
    } catch (error) {
      setMensaje({ texto: 'Error al procesar el registro.', tipo: 'error' });
    }
  };

  const cargarParaEditar = (reg) => {
    setEditandoId(reg.id_registro);
    setFormulario({
      fecha: reg.fecha,
      hora_inicio: reg.hora_inicio.substring(0, 5),
      hora_termino: reg.hora_termino.substring(0, 5),
      zona_regar: reg.zona_regar,
      bcm_03a: reg.bcm_03a ?? '', bcm_03b: reg.bcm_03b ?? '', bcm_03r: reg.bcm_03r ?? '',
      tac_inicio: reg.tac_inicio ?? '', tac_termino: reg.tac_termino ?? '', volumen_usado: reg.volumen_usado ?? '',
      observaciones: reg.observaciones ?? '', responsable: reg.responsable ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarRegistro = async (id) => {
    if (!window.confirm('¿Seguro de eliminar este registro de riego?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/riego/registros/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ texto: 'Registro eliminado.', tipo: 'exito' });
      cargarDatos();
    } catch (e) { setMensaje({ texto: 'Error al eliminar.', tipo: 'error' }); }
  };

  // --- FUNCIONES DEL SIMULADOR Y ZONAS ---
  const handleCrearZona = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/api/riego/zonas', nuevaZona, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ texto: 'Zona creada.', tipo: 'exito' });
      setNuevaZona({ nombre_zona: '', demanda_agua: 0, costo_distribucion: 1 });
      cargarDatos();
    } catch (error) {
      setMensaje({ texto: 'Error al crear zona.', tipo: 'error' });
    }
  };

  const eliminarZona = async (id_zona) => {
    if (!window.confirm('¿Eliminar esta zona del simulador?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/riego/zonas/${id_zona}`, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ texto: 'Zona eliminada.', tipo: 'exito' });
      cargarDatos();
    } catch (error) {
      setMensaje({ texto: error.response?.data?.detail || 'Error al eliminar zona.', tipo: 'error' });
    }
  };

  const ejecutarSimulacion = async () => {
    if (!volumenSimulacion || volumenSimulacion <= 0) return setMensaje({ texto: 'Volumen inválido.', tipo: 'error' });
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://127.0.0.1:8000/api/riego/simular', 
        { volumen_disponible: parseFloat(volumenSimulacion) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setResultadosSimulacion(res.data);
    } catch (error) {
      setMensaje({ texto: 'Error en la simulación matemática.', tipo: 'error' });
    }
  };

  return (
    <div 
      className="modulo-container"
      style={{ 
        backgroundImage: `url(${fondo})`, 
        backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
        minHeight: '100%', borderRadius: '8px', padding: '2rem',
        boxShadow: 'inset 0 0 0 2000px rgba(27, 27, 27, 0.6)' 
      }}
    >
      <div className="header-modulo">
        <h2 className="modulo-title" style={{ color: 'white' }}>
          {editandoId ? 'Modificando Registro F01-PTAR-15' : 'Captura de Riego F01-PTAR-15 y Optimización'}
        </h2>
      </div>

      {mensaje.texto && <div className={`mensaje-alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

      {/* GRID PRINCIPAL: Izquierda Formulario F01, Derecha Zonas/Simulador */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '20px' }}>
        
        {/* PANEL IZQUIERDO: FORMULARIO GIGANTE */}
        <div className="panel-oscuro" style={{ flex: '2 1 600px', border: editandoId ? '2px solid #3498db' : 'none' }}>
          <h3>Captura Operativa</h3>
          <form onSubmit={handleSubmit} className="form-bitacora">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
              {/* Tiempos y Zona */}
              <div className="form-seccion tanque-caja" style={{ borderTopColor: '#3498db', gridColumn: '1 / -1' }}>
                <h4 style={{ color: '#3498db', margin: '0 0 10px 0' }}>Ejecución</h4>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div className="input-group" style={{ flex: '1' }}><label>Fecha</label><input type="date" name="fecha" value={formulario.fecha} onChange={handleChange} required /></div>
                  <div className="input-group" style={{ flex: '1' }}><label>Inicio</label><input type="time" name="hora_inicio" value={formulario.hora_inicio} onChange={handleChange} required /></div>
                  <div className="input-group" style={{ flex: '1' }}><label>Término</label><input type="time" name="hora_termino" value={formulario.hora_termino} onChange={handleChange} required /></div>
                  <div className="input-group" style={{ flex: '1.5' }}>
                    <label>Zona a Regar</label>
                    <select name="zona_regar" value={formulario.zona_regar} onChange={handleChange} required style={{ width: '100%', padding: '8px', backgroundColor: '#333', color: 'white', border: '1px solid #555', borderRadius: '4px' }}>
                      <option value="">-- Seleccionar --</option>
                      {zonas.map(z => <option key={z.id_zona} value={z.nombre_zona}>{z.nombre_zona}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Presión Bombas */}
              <div className="form-seccion tanque-caja" style={{ borderTopColor: '#3498db' }}>
                <h4 style={{ color: '#3498db', margin: '0 0 10px 0' }}>Bombas (kg/cm2)</h4>
                <div className="input-group"><label>BCM-03A</label><input type="number" step="0.01" name="bcm_03a" value={formulario.bcm_03a} onChange={handleChange} /></div>
                <div className="input-group"><label>BCM-03B</label><input type="number" step="0.01" name="bcm_03b" value={formulario.bcm_03b} onChange={handleChange} /></div>
                <div className="input-group"><label>BCM-03R</label><input type="number" step="0.01" name="bcm_03r" value={formulario.bcm_03r} onChange={handleChange} /></div>
              </div>

              {/* Tanque TAC-01 */}
              <div className="form-seccion tanque-caja" style={{ borderTopColor: '#3498db' }}>
                <h4 style={{ color: '#3498db', margin: '0 0 10px 0' }}>Nivel TAC-01 (m)</h4>
                <div className="input-group"><label>Inicio (m)</label><input type="number" step="0.01" name="tac_inicio" value={formulario.tac_inicio} onChange={handleChange} required /></div>
                <div className="input-group"><label>Término (m)</label><input type="number" step="0.01" name="tac_termino" value={formulario.tac_termino} onChange={handleChange} required /></div>
                <div className="input-group"><label>Volumen (m3)</label><input type="number" step="0.001" name="volumen_usado" value={formulario.volumen_usado} onChange={handleChange} required style={{ backgroundColor: '#1a1a2e', color: '#4da8da', fontWeight: 'bold' }} /></div>
              </div>

              {/* Detalles */}
              <div className="form-seccion tanque-caja" style={{ borderTopColor: '#3498db', gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div className="input-group" style={{ flex: '1' }}><label>Responsable</label><input type="text" name="responsable" value={formulario.responsable} onChange={handleChange} required placeholder="Ej. ORM" /></div>
                  <div className="input-group" style={{ flex: '2' }}><label>Observaciones</label><input type="text" name="observaciones" value={formulario.observaciones} onChange={handleChange} /></div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button type="submit" className="btn-guardar w-100" style={{ backgroundColor: editandoId ? '#f0ad4e' : '#3498db', color: editandoId ? '#000' : '#fff' }}>
                {editandoId ? 'Actualizar Registro F01' : 'Guardar en Bitácora F01'}
              </button>
              {editandoId && <button type="button" className="btn-guardar" onClick={() => {setFormulario(estadoInicial); setEditandoId(null);}} style={{ backgroundColor: '#555', flexBasis: '20%' }}>Cancelar</button>}
            </div>
          </form>
        </div>

        {/* PANEL DERECHO: ZONAS Y SIMULADOR */}
        <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {esAdmin && (
            <div className="panel-oscuro">
              <h3 style={{color: '#e74c3c'}}>Gestión de Zonas</h3>
              <form onSubmit={handleCrearZona}>
                <div className="input-group">
                  <label>Nueva Zona</label>
                  <input type="text" value={nuevaZona.nombre_zona} onChange={e => setNuevaZona({...nuevaZona, nombre_zona: e.target.value})} required placeholder="Ej. Campo Norte" />
                </div>
                <button type="submit" className="btn-guardar w-100 mt-2" style={{backgroundColor: '#e74c3c'}}>Añadir Zona</button>
              </form>
              
              <div className="lista-zonas mt-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                {zonas.map(z => (
                  <div key={z.id_zona} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px', borderBottom: '1px solid #fbf9f9' }}>
                    <span>{z.nombre_zona}</span>
                    <button onClick={() => eliminarZona(z.id_zona)} style={{background:'transparent', color:'#e74c3c', border:'none', cursor:'pointer'}}>X</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel-oscuro">
            <h3 style={{color: '#2ecc71'}}>Simulador I.O.</h3>
            <p style={{fontSize: '0.85rem', color: '#ccc'}}>Calcula distribución óptima.</p>
            <div className="input-group">
              <label>Volumen a Distribuir (L)</label>
              <input type="number" value={volumenSimulacion} onChange={(e) => setVolumenSimulacion(e.target.value)} placeholder="Ej. 500" />
            </div>
            <button className="btn-guardar w-100 mt-2" onClick={ejecutarSimulacion} type="button" style={{backgroundColor: '#2ecc71', color: '#000', fontWeight: 'bold'}}>Ejecutar Optimización</button>

            {resultadosSimulacion && (
              <div className="mt-2" style={{ padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '5px' }}>
                <p style={{margin: '0 0 5px 0', fontSize: '0.9rem'}}>Ingresado: <b>{resultadosSimulacion.volumen_total_ingresado} L</b></p>
                <p style={{margin: '0 0 10px 0', fontSize: '0.9rem'}}>Distribuido: <b style={{color:'#2ecc71'}}>{resultadosSimulacion.volumen_distribuido} L</b></p>
                {resultadosSimulacion.distribucion.map((res) => (
                  <div key={res.id_zona} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px dotted #555', padding: '3px 0' }}>
                    <span>{res.nombre_zona}</span>
                    <span style={{color: '#2ecc71'}}>{res.volumen_asignado} L <small>({res.porcentaje_cubierto}%)</small></span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* TABLA GIGANTE INFERIOR */}
      <div className="panel-oscuro mt-2">
        <h3>Historial Formato F01-PTAR-15</h3>
        <div className="tabla-responsive mt-2" style={{ overflowX: 'auto' }}>
          <table className="tabla-historial tabla-completa" style={{ fontSize: '0.8rem' }}>
            <thead>
              <tr>
                <th rowSpan="2" className="borde-derecho">Fecha</th>
                <th colSpan="2" className="borde-derecho text-center">Hora</th>
                <th rowSpan="2" className="borde-derecho">Zona a Regar</th>
                <th colSpan="3" className="borde-derecho text-center" style={{color:'#3498db'}}>Bomba / Presión</th>
                <th colSpan="2" className="borde-derecho text-center" style={{color:'#3498db'}}>Nivel TAC-01</th>
                <th rowSpan="2" className="borde-derecho">Volumen Usado<br/>(m3)</th>
                <th rowSpan="2" className="borde-derecho">Observaciones</th>
                <th rowSpan="2" className="borde-derecho">Responsable</th>
                {esAdmin && <th rowSpan="2">Acciones</th>}
              </tr>
              <tr>
                <th>Inicio</th><th className="borde-derecho">Término</th>
                <th>BCM-03A</th><th>BCM-03B</th><th className="borde-derecho">BCM-03R</th>
                <th>Inicio (m)</th><th className="borde-derecho">Término (m)</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(reg => (
                <tr key={reg.id_registro} style={{ backgroundColor: editandoId === reg.id_registro ? 'rgba(52, 152, 219, 0.2)' : 'transparent' }}>
                  <td className="borde-derecho">{reg.fecha}</td>
                  <td>{reg.hora_inicio.substring(0,5)}</td>
                  <td className="borde-derecho">{reg.hora_termino.substring(0,5)}</td>
                  <td className="borde-derecho">{reg.zona_regar}</td>
                  
                  <td>{reg.bcm_03a ?? '-'}</td><td>{reg.bcm_03b ?? '-'}</td><td className="borde-derecho">{reg.bcm_03r ?? '-'}</td>
                  <td>{reg.tac_inicio}</td><td className="borde-derecho">{reg.tac_termino}</td>
                  
                  <td className="borde-derecho" style={{fontWeight: 'bold', color: '#3498db'}}>{reg.volumen_usado}</td>
                  <td className="borde-derecho">{reg.observaciones || '-'}</td>
                  <td className="borde-derecho" style={{color: '#888', fontWeight: 'bold'}}>{reg.responsable}</td>
                  
                  {esAdmin && (
                    <td style={{ minWidth: '160px' }}>
                      <button onClick={() => cargarParaEditar(reg)} style={{ backgroundColor: '#f0ad4e', color: '#000', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', marginRight: '5px', fontWeight: 'bold' }}>Mod</button>
                      <button onClick={() => eliminarRegistro(reg.id_registro)} style={{ backgroundColor: '#c92a2a', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>Del</button>
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