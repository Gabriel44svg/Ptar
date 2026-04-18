import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import './Predictivo.css';
import fondo from '../../assets/img/fondo.png';

// Catálogo básico para los botones
// Catálogo ajustado a la hoja F02-PTAR-02
const parametros = [
  { id: 1, nombre: 'pH (Salida)' },
  { id: 2, nombre: 'Temperatura (Salida)' },
  { id: 3, nombre: 'DQO (Salida)' },
  { id: 4, nombre: 'SSED (Aerobio)' },
  { id: 5, nombre: 'OD (Aerobio)' }
];

export const Predictivo = () => {
  const [parametroActivo, setParametroActivo] = useState(1);
  const [rangoDias, setRangoDias] = useState(30);
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [datosMarkov, setDatosMarkov] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    cargarDatosPredictivos();
  }, [parametroActivo, rangoDias]);

  const cargarDatosPredictivos = async () => {
    setCargando(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      const [resGrafica, resMarkov] = await Promise.all([
        axios.get(`http://127.0.0.1:8000/api/predictivo/graficas?id_proceso=${parametroActivo}&dias=${rangoDias}`, config),
        axios.get(`http://127.0.0.1:8000/api/predictivo/markov?id_proceso=${parametroActivo}`, config)
      ]);
      
      setDatosGrafica(resGrafica.data);
      setDatosMarkov(resMarkov.data);
    } catch (error) {
      console.error("Error al cargar datos predictivos", error);
    } finally {
      setCargando(false);
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
        <h2 className="modulo-title">Análisis Predictivo y Gráficas</h2>
      </div>

      {/* FILTROS */}
      <div className="panel-oscuro controles-filtros">
        <div className="tabs-container">
          {parametros.map(param => (
            <button 
              key={param.id}
              className={`tab-btn ${parametroActivo === param.id ? 'active' : ''}`}
              onClick={() => setParametroActivo(param.id)}
            >
              {param.nombre}
            </button>
          ))}
        </div>
        
        <div className="selector-fecha">
          <label>Periodo:</label>
          <select value={rangoDias} onChange={(e) => setRangoDias(Number(e.target.value))}>
            <option value={1}>Diario (Últimas 24h)</option>
            <option value={7}>Semanal</option>
            <option value={15}>Quincenal</option>
            <option value={30}>Mensual</option>
            <option value={365}>Anual</option>
            <option value={0}>Todo el Histórico</option>
          </select>
        </div>
      </div>

      {/* GRÁFICA */}
      <div className="panel-oscuro mt-2">
        <h3>Comportamiento Histórico ({parametros.find(p => p.id === parametroActivo)?.nombre})</h3>
        {cargando ? (
          <p className="text-center">Cargando visualizaciones...</p>
        ) : datosGrafica.length > 0 ? (
          <div className="contenedor-grafica">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={datosGrafica}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="fecha" stroke="#ccc" />
                <YAxis stroke="#ccc" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#222', border: '1px solid #aa863a' }}
                  itemStyle={{ color: '#aa863a' }}
                />
                <Line type="monotone" dataKey="valor" stroke="#aa863a" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center">No hay datos suficientes.</p>
        )}
      </div>

      {/* MARKOV */}
      <div className="panel-oscuro mt-2">
        <h3>Proyecciones (Cadenas de Markov)</h3>

        {datosMarkov && datosMarkov.matriz_transicion.length > 0 ? (
          <div className="markov-container">
            
            <div className="markov-info">
              <p><strong>Parámetro:</strong> {datosMarkov.parametro}</p>
              <p><strong>Transiciones:</strong> {datosMarkov.total_transiciones_analizadas}</p>
              <p><strong>Estados:</strong> {datosMarkov.espacio_estados.join(', ')}</p>
            </div>

            {/* MATRIZ */}
            <div className="matriz-wrapper">
              <table className="tabla-matriz">
                <thead>
                  <tr>
                    <th>Estado \ Futuro</th>
                    {datosMarkov.espacio_estados.map(e => <th key={e}>{e}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {datosMarkov.matriz_transicion.map((fila, i) => (
                    <tr key={i}>
                      <th>{datosMarkov.espacio_estados[i]}</th>
                      {fila.map((p, j) => (
                        <td key={j}>{p.toFixed(4)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/*  NUEVO BLOQUE DE INTERPRETACIÓN */}
            <div className="interpretacion-markov">
              <h4>Pronóstico para la siguiente lectura</h4>
              <p>
                Actualmente el parámetro está en un nivel <strong>{datosMarkov.estado_actual}</strong>. 
                Basado en el comportamiento histórico, la probabilidad de transición es:
              </p>

              <ul className="lista-probabilidades">
                <li>
                   <strong>Bajo:</strong> {(datosMarkov.prediccion_manana[0] * 100).toFixed(1)}%
                </li>
                <li>
                   <strong>Óptimo:</strong> {(datosMarkov.prediccion_manana[1] * 100).toFixed(1)}%
                </li>
                <li>
                   <strong>Alto:</strong> {(datosMarkov.prediccion_manana[2] * 100).toFixed(1)}%
                </li>
              </ul>

              {(datosMarkov.prediccion_manana[0] > 0.4 || datosMarkov.prediccion_manana[2] > 0.4) && (
                <div className="alerta-demanda mt-2">
                   <strong>Atención:</strong> Alta probabilidad de salir de la norma. Se recomienda revisión preventiva.
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="alerta-demanda">
            <p>Se requieren más datos para calcular la matriz.</p>
          </div>
        )}
      </div>
    </div>
  );
};