import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Riego.css';
import fondo from '../../assets/img/fondo.png';

export const Riego = () => {
  const [zonas, setZonas] = useState([]);
  const [registros, setRegistros] = useState([]);
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  
  const [formRiego, setFormRiego] = useState({
    fecha: new Date().toISOString().split('T')[0],
    hora_inicio: '', hora_termino: '', id_zona: '', volumen_usado: ''
  });

  const [nuevaZona, setNuevaZona] = useState({ nombre_zona: '', demanda_agua: 0, costo_distribucion: 1 });
  const [volumenSimulacion, setVolumenSimulacion] = useState('');
  const [resultadosSimulacion, setResultadosSimulacion] = useState(null);

  const usuarioRol = localStorage.getItem('usuarioRol');
  const esAdmin = usuarioRol === 'Super Admin' || usuarioRol === 'Administrador';

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };
    try {
      const [resZonas, resRegistros] = await Promise.all([
        axios.get('http://127.0.0.1:8000/api/riego/zonas', config),
        axios.get('http://127.0.0.1:8000/api/riego/registros', config)
      ]);
      setZonas(resZonas.data);
      setRegistros(resRegistros.data);
    } catch (error) {
      console.error("Error al cargar datos", error);
    }
  };

  const handleRegistroSubmit = async (e) => {
    e.preventDefault();
    setMensaje({ texto: '', tipo: '' });
    if (!formRiego.id_zona) return setMensaje({ texto: 'Selecciona una zona.', tipo: 'error' });

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/api/riego/registros', formRiego, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ texto: 'Evento registrado.', tipo: 'exito' });
      setFormRiego({ ...formRiego, hora_inicio: '', hora_termino: '', volumen_usado: '' });
      cargarDatos();
    } catch (error) {
      setMensaje({ texto: 'Error al guardar evento.', tipo: 'error' });
    }
  };

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

  // --- NUEVAS FUNCIONES DE ELIMINACIÓN ---
  const eliminarRegistroRiego = async (id_operacion) => {
    if (!window.confirm('¿Seguro que deseas eliminar este evento de riego?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/riego/registros/${id_operacion}`, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ texto: 'Registro eliminado.', tipo: 'exito' });
      cargarDatos();
    } catch (error) {
      setMensaje({ texto: 'Error al eliminar registro.', tipo: 'error' });
    }
  };

  const eliminarZona = async (id_zona) => {
    if (!window.confirm('¿Eliminar esta zona?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://127.0.0.1:8000/api/riego/zonas/${id_zona}`, { headers: { Authorization: `Bearer ${token}` } });
      setMensaje({ texto: 'Zona eliminada.', tipo: 'exito' });
      cargarDatos();
    } catch (error) {
      if (error.response && error.response.status === 400) {
        setMensaje({ texto: error.response.data.detail, tipo: 'error' });
      } else {
        setMensaje({ texto: 'Error al eliminar zona.', tipo: 'error' });
      }
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
      setMensaje({ texto: 'Error en la simulación.', tipo: 'error' });
    }
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
        <h2 className="modulo-title">Módulo de Riego y Optimización</h2>
      </div>

      {mensaje.texto && <div className={`mensaje-alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

      <div className="riego-grid">
        {/* Panel Izquierdo: Registro */}
        <div className="panel-oscuro">
          <h3>Registro de Eventos</h3>
          <p className="instrucciones">Captura los detalles del riego realizado.</p>
          <form onSubmit={handleRegistroSubmit} className="captura-form">
            <div className="input-group-vertical">
              <label>Fecha</label>
              <input type="date" value={formRiego.fecha} onChange={e => setFormRiego({...formRiego, fecha: e.target.value})} required />
            </div>
            <div className="input-row">
              <div className="input-group-vertical w-50">
                <label>Hora Inicio</label>
                <input type="time" value={formRiego.hora_inicio} onChange={e => setFormRiego({...formRiego, hora_inicio: e.target.value})} required />
              </div>
              <div className="input-group-vertical w-50">
                <label>Hora Término</label>
                <input type="time" value={formRiego.hora_termino} onChange={e => setFormRiego({...formRiego, hora_termino: e.target.value})} />
              </div>
            </div>
            <div className="input-group-vertical">
              <label>Zona de Riego</label>
              <select value={formRiego.id_zona} onChange={e => setFormRiego({...formRiego, id_zona: e.target.value})} required>
                <option value="">-- Seleccionar Zona --</option>
                {zonas.map(z => <option key={z.id_zona} value={z.id_zona}>{z.nombre_zona}</option>)}
              </select>
            </div>
            <div className="input-group-vertical">
              <label>Volumen Usado (Litros Cúbicos)</label>
              <input type="number" step="0.01" value={formRiego.volumen_usado} onChange={e => setFormRiego({...formRiego, volumen_usado: e.target.value})} required />
            </div>
            <button type="submit" className="btn-guardar mt-2">Registrar Evento</button>
          </form>
        </div>

        {/* Panel Derecho: Zonas y Simulador */}
        <div className="riego-column-right">
          
          {esAdmin && (
            <div className="panel-oscuro mb-2">
              <h3>Gestión de Zonas (Admin)</h3>
              <form onSubmit={handleCrearZona} className="captura-form">
                <div className="input-group-vertical">
                  <label>Nombre de la nueva zona</label>
                  <input type="text" value={nuevaZona.nombre_zona} onChange={e => setNuevaZona({...nuevaZona, nombre_zona: e.target.value})} required />
                </div>
                <button type="submit" className="btn-guardar mt-2">Agregar Zona</button>
              </form>
              
              {/* Lista para eliminar zonas */}
              <div className="lista-zonas mt-2">
                {zonas.map(z => (
                  <div key={z.id_zona} className="zona-item">
                    <span>{z.nombre_zona}</span>
                    <button className="btn-eliminar-sm" onClick={() => eliminarZona(z.id_zona)}>X</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel-oscuro simulador-panel">
            <h3>Simulador de Distribución (I.O.)</h3>
            <p className="instrucciones">Calcula la distribución óptima de agua basándose en el volumen disponible y las demandas de las zonas.</p>
            <div className="input-group-vertical">
              <label>Volumen Total Disponible (Litros)</label>
              <input type="number" value={volumenSimulacion} onChange={(e) => setVolumenSimulacion(e.target.value)} />
            </div>
            <button className="btn-optimizar mt-2" onClick={ejecutarSimulacion} type="button">Ejecutar Optimización</button>

            {resultadosSimulacion && (
              <div className="resultados-simulacion">
                <div className="resumen-simulacion">
                  <p>Volumen Ingresado: <strong>{resultadosSimulacion.volumen_total_ingresado} L</strong></p>
                  <p>Total Distribuido: <strong>{resultadosSimulacion.volumen_distribuido} L</strong></p>
                </div>
                {resultadosSimulacion.distribucion.length > 0 ? (
                  <ul className="lista-resultados">
                    {resultadosSimulacion.distribucion.map((res) => (
                      <li key={res.id_zona}>
                        <span className="zona-nombre">{res.nombre_zona}</span>
                        <span className="zona-volumen">{res.volumen_asignado} L <small>({res.porcentaje_cubierto}%)</small></span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="alerta-demanda"><p>⚠️ No se asignó agua.</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historial con botón de eliminar */}
      <div className="panel-oscuro mt-2">
        <h3>Últimos Riegos Registrados</h3>
        <div className="tabla-responsive">
          <table className="tabla-historial">
            <thead>
              <tr>
                <th>Fecha</th><th>Zona</th><th>Volumen (L)</th><th>Horario</th>
                {esAdmin && <th>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {registros.slice(0, 5).map(reg => (
                <tr key={reg.id_operacion}>
                  <td>{reg.fecha}</td>
                  <td>{zonas.find(z => z.id_zona === reg.id_zona)?.nombre_zona || 'Desconocida'}</td>
                  <td>{reg.volumen_usado}</td>
                  <td>{reg.hora_inicio} - {reg.hora_termino || 'N/A'}</td>
                  {esAdmin && (
                    <td>
                      <button className="btn-eliminar" onClick={() => eliminarRegistroRiego(reg.id_operacion)}>Eliminar</button>
                    </td>
                  )}
                </tr>
              ))}
              {registros.length === 0 && <tr><td colSpan={esAdmin ? "5" : "4"} className="text-center">No hay registros de riego.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};