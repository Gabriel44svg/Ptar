import React, { useState, useEffect } from 'react';
import axios from 'axios';
import html2canvas from 'html2canvas';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import './Predictivo.css';
import fondo from '../../assets/img/fondo.png';

// Catálogo ajustado a F02-PTAR-02 y el nuevo parámetro de Riego
const parametros = [
  { id: '1', nombre: 'pH (Salida Clarificador)' },
  { id: '2', nombre: 'Temperatura (Salida)' },
  { id: '3', nombre: 'DQO (Salida)' },
  { id: '4', nombre: 'SSED (Aerobio)' },
  { id: '5', nombre: 'OD (Aerobio)' },
  { id: 'riego', nombre: 'Agua de Riego (m³)' } 
];

const COLORES_PASTEL = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const Predictivo = () => {
  const [parametroActivo, setParametroActivo] = useState('riego');
  const [tipoGrafica, setTipoGrafica] = useState('barra'); // linea, barra, pastel
  
  // Por defecto, mostrar los últimos 30 días
  const [fechaInicio, setFechaInicio] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  
  const [agrupacion, setAgrupacion] = useState('dias'); // NUEVO ESTADO: dias, meses, anos

  const [datosGrafica, setDatosGrafica] = useState([]);
  const [datosMarkov, setDatosMarkov] = useState(null);
  const [cargando, setCargando] = useState(false);

  useEffect(() => { 
    cargarDatosPredictivos(); 
  }, [parametroActivo, fechaInicio, fechaFin, agrupacion]);

  const cargarDatosPredictivos = async () => {
    setCargando(true);
    const token = localStorage.getItem('token');
    const config = { headers: { Authorization: `Bearer ${token}` } };

    try {
      // 1. Cargar datos para la gráfica (ahora enviamos la 'agrupacion')
      const urlGrafica = `http://127.0.0.1:8000/api/predictivo/graficas?id_proceso=${parametroActivo}&fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}&agrupacion=${agrupacion}`;
      const resGrafica = await axios.get(urlGrafica, config);
      setDatosGrafica(resGrafica.data);

      // 2. Cargar Matriz de Markov (Solo aplica para parámetros químicos, no para Riego)
      if (parametroActivo !== 'riego') {
        const resMarkov = await axios.get(`http://127.0.0.1:8000/api/predictivo/markov?id_proceso=${parametroActivo}`, config);
        setDatosMarkov(resMarkov.data);
      } else {
        setDatosMarkov(null);
      }
    } catch (error) {
      console.error("Error al cargar datos predictivos", error);
    } finally {
      setCargando(false);
    }
  };

  const descargarImagen = () => {
    const node = document.getElementById('contenedor-exportar');
    html2canvas(node, { backgroundColor: '#1a1a1a' }).then(canvas => {
      const link = document.createElement('a');
      link.download = `Grafica_${parametros.find(p => p.id === parametroActivo)?.nombre}_${fechaInicio}_al_${fechaFin}.png`;
      link.href = canvas.toDataURL();
      link.click();
    });
  };

  // Cálculos dinámicos para las tarjetas KPI
  const sumaTotal = datosGrafica.reduce((acc, curr) => acc + curr.valor, 0);
  const promedio = datosGrafica.length > 0 ? (sumaTotal / datosGrafica.length) : 0;

  // Etiqueta dinámica para el cuadro verde
  const textoPromedio = agrupacion === 'meses' ? 'Promedio Mensual' : agrupacion === 'anos' ? 'Promedio Anual' : 'Promedio del Periodo';

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
        boxShadow: 'inset 0 0 0 2000px rgba(27, 27, 27, 0.7)',
        color: 'white'
      }}
    >
      <div className="header-modulo">
        <h2 className="modulo-title">Análisis y Visualización Dinámica</h2>
      </div>

      {/* CONTROLES SUPERIORES */}
      <div className="panel-oscuro" style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', justifyContent: 'space-between' }}>
        
        <div style={{ flex: '1 1 100%' }}>
          <h4 style={{ color: '#aa863a', marginBottom: '10px' }}>Parámetro a Analizar:</h4>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {parametros.map(param => (
              <button key={param.id} 
                onClick={() => setParametroActivo(param.id)}
                style={{ 
                  padding: '8px 15px', 
                  borderRadius: '20px', 
                  border: '1px solid #aa863a', 
                  backgroundColor: parametroActivo === param.id ? '#aa863a' : 'transparent', 
                  color: parametroActivo === param.id ? '#000' : '#aa863a', 
                  cursor: 'pointer', 
                  fontWeight: 'bold' 
                }}
              >
                {param.nombre}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#ccc' }}>Fecha Inicio:</label>
            <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#ccc' }}>Fecha Fin:</label>
            <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }} />
          </div>
          
          {/* NUEVO SELECTOR DE AGRUPACIÓN */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', color: '#ccc' }}>Agrupar por:</label>
            <select value={agrupacion} onChange={(e) => setAgrupacion(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#1a1a2e', color: '#4da8da', border: '1px solid #4da8da', fontWeight: 'bold' }}>
              <option value="dias">Días (Exacto)</option>
              <option value="meses">Meses</option>
              <option value="anos">Años</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#ccc' }}>Tipo de Gráfica:</label>
          <select value={tipoGrafica} onChange={(e) => setTipoGrafica(e.target.value)} style={{ padding: '8px', borderRadius: '4px', backgroundColor: '#333', color: 'white', border: '1px solid #555' }}>
            <option value="linea">Líneas (Tendencia)</option>
            <option value="barra">Barras (Comparación)</option>
            <option value="pastel">Pastel (Proporción)</option>
          </select>
        </div>

      </div>

      {/* TARJETAS KPI (ESTILO EXCEL) */}
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <div style={{ flex: 1, backgroundColor: 'rgba(52, 152, 219, 0.2)', borderLeft: '4px solid #3498db', padding: '15px', borderRadius: '5px' }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#3498db' }}>Suma Total del Periodo</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>
            {parametroActivo === 'riego' 
              ? `${sumaTotal.toLocaleString('en-US')} m³` 
              : sumaTotal.toFixed(2)}
          </p>
          {parametroActivo === 'riego' && <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc' }}>Equivale a {(sumaTotal * 1000).toLocaleString('en-US')} Litros de agua salvados</p>}
        </div>
        
        <div style={{ flex: 1, backgroundColor: 'rgba(46, 204, 113, 0.2)', borderLeft: '4px solid #2ecc71', padding: '15px', borderRadius: '5px' }}>
          <h4 style={{ margin: '0 0 5px 0', color: '#2ecc71' }}>{textoPromedio}</h4>
          <p style={{ fontSize: '1.5rem', fontWeight: 'bold', margin: 0 }}>{promedio.toFixed(2)}</p>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#ccc' }}>Basado en {datosGrafica.length} barras/puntos mostrados</p>
        </div>
      </div>

      {/* ÁREA DE GRÁFICA EXPORTABLE */}
      <div className="panel-oscuro mt-2" style={{ position: 'relative' }}>
        <button onClick={descargarImagen} style={{ position: 'absolute', top: '15px', right: '15px', padding: '8px 15px', backgroundColor: '#aa863a', color: 'black', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', zIndex: 10 }}>
           Descargar Gráfica
        </button>

        <div id="contenedor-exportar" style={{ padding: '20px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '20px', color: '#fff' }}>
            Comportamiento Histórico - {parametros.find(p => p.id === parametroActivo)?.nombre}
          </h3>
          <p style={{ textAlign: 'center', color: '#888', marginTop: '-15px', marginBottom: '20px', fontSize: '0.9rem' }}>
            Periodo: {fechaInicio} al {fechaFin} (Agrupado por {agrupacion})
          </p>
          
          {cargando ? <p className="text-center">Generando visualización...</p> : 
           datosGrafica.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              
              {tipoGrafica === 'linea' && (
                <LineChart data={datosGrafica}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis dataKey="fecha" stroke="#ccc" tick={{fontSize: 10}} angle={-45} textAnchor="end" />
                  <YAxis stroke="#ccc" />
                  <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #aa863a', borderRadius: '5px' }} />
                  <Line type="monotone" dataKey="valor" stroke="#aa863a" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              )}

              {tipoGrafica === 'barra' && (
                <BarChart data={datosGrafica} margin={{ top: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
                  <XAxis dataKey="fecha" stroke="#ccc" tick={{fontSize: 10}} angle={-45} textAnchor="end" />
                  <YAxis stroke="#ccc" />
                  <Tooltip cursor={{fill: '#333'}} contentStyle={{ backgroundColor: '#222', border: '1px solid #aa863a', borderRadius: '5px' }} />
                  <Bar dataKey="valor" fill={parametroActivo === 'riego' ? '#3498db' : '#aa863a'} radius={[5, 5, 0, 0]} label={{ position: 'top', fill: '#fff', fontSize: 10 }} />
                </BarChart>
              )}

              {tipoGrafica === 'pastel' && (
                <PieChart>
                  <Pie data={datosGrafica} dataKey="valor" nameKey="fecha" cx="50%" cy="50%" outerRadius={150} label>
                    {datosGrafica.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORES_PASTEL[index % COLORES_PASTEL.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#222', border: '1px solid #aa863a', borderRadius: '5px' }} />
                  <Legend />
                </PieChart>
              )}

            </ResponsiveContainer>
          ) : (
            <p className="text-center" style={{ padding: '50px 0', color: '#888' }}>No hay datos registrados en este rango de fechas.</p>
          )}
        </div>
      </div>

      {/* BLOQUE DE CADENAS DE MARKOV (Se oculta si el parámetro es Riego) */}
      {parametroActivo !== 'riego' && (
        <div className="panel-oscuro mt-2">
          <h3>Proyecciones Analíticas (Cadenas de Markov)</h3>

          {datosMarkov && datosMarkov.matriz_transicion && datosMarkov.matriz_transicion.length > 0 ? (
            <div className="markov-container" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '15px' }}>
              
              <div className="markov-info" style={{ flex: '1 1 250px', backgroundColor: 'rgba(0,0,0,0.3)', padding: '15px', borderRadius: '8px', borderLeft: '3px solid #aa863a' }}>
                <p><strong>Parámetro:</strong> {datosMarkov.parametro}</p>
                <p><strong>Transiciones Evaluadas:</strong> {datosMarkov.total_transiciones_analizadas}</p>
                <p><strong>Espacio de Estados:</strong> {datosMarkov.espacio_estados.join(', ')}</p>
              </div>

              {/* MATRIZ DE TRANSICIÓN */}
              <div className="matriz-wrapper" style={{ flex: '2 1 400px' }}>
                <h4 style={{ textAlign: 'center', color: '#aa863a', marginBottom: '10px' }}>Matriz de Probabilidades de Transición (P)</h4>
                <table className="tabla-matriz" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '10px', borderBottom: '2px solid #aa863a' }}>Estado \ Futuro</th>
                      {datosMarkov.espacio_estados.map(e => <th key={e} style={{ padding: '10px', borderBottom: '2px solid #aa863a' }}>{e}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {datosMarkov.matriz_transicion.map((fila, i) => (
                      <tr key={i}>
                        <th style={{ padding: '10px', borderBottom: '1px solid #444', color: '#aa863a' }}>{datosMarkov.espacio_estados[i]}</th>
                        {fila.map((p, j) => (
                          <td key={j} style={{ padding: '10px', borderBottom: '1px solid #444' }}>{p.toFixed(4)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* INTERPRETACIÓN Y ALERTAS */}
              <div className="interpretacion-markov" style={{ flex: '1 1 100%', backgroundColor: '#1a1a2e', padding: '20px', borderRadius: '8px', marginTop: '10px' }}>
                <h4 style={{ color: '#4da8da', marginBottom: '10px' }}>Pronóstico Estocástico para la Siguiente Lectura</h4>
                <p>
                  Actualmente el parámetro está en un nivel <strong>{datosMarkov.estado_actual}</strong>. 
                  Basado en la convergencia histórica, la distribución de probabilidad para el día de mañana es:
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-around', margin: '20px 0' }}>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '5px', width: '30%' }}>
                    <h5 style={{ margin: '0 0 5px 0', color: '#e74c3c' }}>Bajo</h5>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(datosMarkov.prediccion_manana[0] * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '5px', width: '30%' }}>
                    <h5 style={{ margin: '0 0 5px 0', color: '#2ecc71' }}>Óptimo</h5>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(datosMarkov.prediccion_manana[1] * 100).toFixed(1)}%</span>
                  </div>
                  <div style={{ textAlign: 'center', padding: '10px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '5px', width: '30%' }}>
                    <h5 style={{ margin: '0 0 5px 0', color: '#e74c3c' }}>Alto</h5>
                    <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{(datosMarkov.prediccion_manana[2] * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {(datosMarkov.prediccion_manana[0] > 0.4 || datosMarkov.prediccion_manana[2] > 0.4) && (
                  <div style={{ padding: '15px', backgroundColor: 'rgba(231, 76, 60, 0.2)', borderLeft: '5px solid #e74c3c', borderRadius: '4px' }}>
                    <strong> Alerta Predictiva:</strong> Existe una probabilidad superior al 40% de que el agua salga de los parámetros normativos en el próximo ciclo de muestreo. Se recomienda ajuste preventivo en válvulas o dosificación.
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div style={{ padding: '20px', backgroundColor: 'rgba(241, 196, 15, 0.1)', borderLeft: '4px solid #f1c40f', borderRadius: '4px', marginTop: '15px' }}>
              <p style={{ margin: 0 }}>Se requieren al menos 2 registros cronológicos en el periodo seleccionado para poder computar la Matriz de Transición de Markov.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};