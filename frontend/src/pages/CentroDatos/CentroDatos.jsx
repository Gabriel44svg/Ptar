import React, { useState } from 'react';
import api from '../../services/api'
import './CentroDatos.css';
import fondo from '../../assets/img/fondo.png';

export const CentroDatos = () => {
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const [tipoReporte, setTipoReporte] = useState('laboratorio'); // Toggle para elegir reporte
  const [archivoCSV, setArchivoCSV] = useState(null);
  const [datosPrevisualizacion, setDatosPrevisualizacion] = useState(null);
  const [cargando, setCargando] = useState(false);

  // Descarga Dinámica (CSV o PDF) enviando el Tipo de Reporte
  const descargarDocumento = async (formato) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('tipo', tipoReporte); // Enviamos si es laboratorio o riego
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      
      const url = `http://127.0.0.1:8000/api/reportes/exportar/${formato}?${params.toString()}`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });

      const extension = formato === 'pdf' ? 'application/pdf' : 'text/csv';
      const urlBlob = window.URL.createObjectURL(new Blob([response.data], { type: extension }));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `Reporte_${tipoReporte.toUpperCase()}_${new Date().toISOString().split('T')[0]}.${formato}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMensaje({ texto: `Reporte ${formato.toUpperCase()} descargado con éxito.`, tipo: 'exito' });
    } catch (error) {
      setMensaje({ texto: `Error al generar el documento ${formato.toUpperCase()}.`, tipo: 'error' });
    }
  };

  const procesarCSV = async () => {
    if (!archivoCSV) return setMensaje({ texto: 'Selecciona un archivo CSV.', tipo: 'error' });
    setCargando(true);
    const formData = new FormData();
    formData.append('file', archivoCSV);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://127.0.0.1:8000/api/reportes/importar/previsualizar', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
      });
      setDatosPrevisualizacion(response.data);
      setMensaje({ texto: `Se extrajeron ${response.data.total_encontrados} filas del CSV.`, tipo: 'exito' });
    } catch (error) {
      setMensaje({ texto: 'Error al procesar. Asegúrate de que sea un CSV con la misma estructura que el exportado.', tipo: 'error' });
    } finally {
      setCargando(false);
    }
  };

  const guardarImportacionMasiva = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://127.0.0.1:8000/api/reportes/importar/guardar', { datos: datosPrevisualizacion.datos_extraidos }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensaje({ texto: '¡Historial importado a la Base de Datos!', tipo: 'exito' });
      setDatosPrevisualizacion(null);
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      setArchivoCSV(null);
    } catch (error) {
      setMensaje({ texto: 'Error al guardar los datos.', tipo: 'error' });
    }
  };

  return (
    <div style={{ backgroundImage: `url(${fondo})`, backgroundSize: 'cover', backgroundPosition: 'center', minHeight: '100%', padding: '2rem', borderRadius: '8px', color: 'white', boxShadow: 'inset 0 0 0 2000px rgba(0,0,0,0.55)' }}>
      <div className="header-modulo"><h2 className="modulo-title">Centro de Datos y Reportes</h2></div>
      {mensaje.texto && <div className={`mensaje-alerta ${mensaje.tipo}`}>{mensaje.texto}</div>}

      <div className="reportes-grid">
        
        {/* PANEL IZQUIERDO: IMPORTACIÓN MASIVA */}
        <div className="panel-oscuro">
          <h3>Importación Masiva (Excel / CSV)</h3>
          <p className="instrucciones">Sube un archivo <b>.csv</b> con el formato exacto F02-PTAR-02 para cargar datos de laboratorio masivamente.</p>
          <div className="upload-container">
            <input type="file" accept=".csv" className="file-input" id="file-upload" onChange={(e) => setArchivoCSV(e.target.files[0])} />
            <label htmlFor="file-upload" className="btn-upload">Seleccionar Archivo CSV</label>
            <p className="file-name">{archivoCSV ? archivoCSV.name : 'Ningún archivo seleccionado'}</p>
          </div>
          <button className="btn-guardar mt-2" onClick={procesarCSV} disabled={!archivoCSV || cargando}>
            {cargando ? 'Analizando...' : 'Leer y Previsualizar Datos'}
          </button>
        </div>

        {/* PANEL DERECHO: GENERADOR DE REPORTES PDF Y CSV */}
        <div className="panel-oscuro">
          <h3 style={{ color: '#aa863a' }}>Generación de Reportes Oficiales</h3>
          <p className="instrucciones">Elige el área, filtra por fechas y descarga un documento PDF con tablas y gráficas incrustadas automáticamente.</p>
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '15px 0' }}>
            <button onClick={() => setTipoReporte('laboratorio')} style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: tipoReporte === 'laboratorio' ? '#aa863a' : '#333', color: tipoReporte === 'laboratorio' ? '#000' : '#aaa' }}>
               Laboratorio (F02)
            </button>
            <button onClick={() => setTipoReporte('riego')} style={{ padding: '8px 15px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontWeight: 'bold', backgroundColor: tipoReporte === 'riego' ? '#3498db' : '#333', color: tipoReporte === 'riego' ? '#fff' : '#aaa' }}>
               Riego (F01)
            </button>
          </div>

          <div className="controles-fecha mb-2">
            <div className="input-group-vertical"><label>Inicio:</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-fecha" /></div>
            <div className="input-group-vertical"><label>Fin:</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input-fecha" /></div>
          </div>

          <div className="botones-exportacion" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="btn-exportar pdf" onClick={() => descargarDocumento('pdf')} style={{ backgroundColor: tipoReporte === 'laboratorio' ? '#e74c3c' : '#2980b9', border: 'none', color: 'white' }}>
               Descargar Reporte PDF (Tablas y Gráficas)
            </button>
            <button className="btn-exportar csv" onClick={() => descargarDocumento('csv')} style={{ backgroundColor: '#2ecc71', border: 'none', color: 'black' }}>
               Descargar Sábana de Datos (Excel/CSV)
            </button>
          </div>
        </div>

      </div>

      {/* TABLA PREVISUALIZACIÓN DE IMPORTACIÓN MASIVA */}
      {datosPrevisualizacion && datosPrevisualizacion.datos_extraidos.length > 0 && (
        <div className="panel-oscuro mt-2">
          <h3>Vista Previa de Importación</h3>
          <div className="tabla-responsive mt-2">
            <table className="tabla-historial" style={{ fontSize: '0.8rem' }}>
              <thead>
                <tr>
                  <th>Fecha</th><th>Hora</th><th>Muestra</th>
                  <th style={{color:'#aa863a'}}>pH TEC</th>
                  <th style={{color:'#82ca9d'}}>pH RAC</th>
                  <th style={{color:'#ffc658'}}>pH REC</th>
                  <th style={{color:'#ff7300'}}>pH CSC</th>
                  <th>Realizó</th>
                </tr>
              </thead>
              <tbody>
                {datosPrevisualizacion.datos_extraidos.map((dato, i) => (
                  <tr key={i}>
                    <td>{dato.fecha}</td><td>{dato.hora}</td><td>{dato.no_muestra}</td>
                    <td>{dato.tec_ph ?? '-'}</td><td>{dato.rac_ph ?? '-'}</td><td>{dato.rec_ph ?? '-'}</td><td>{dato.csc_ph ?? '-'}</td>
                    <td>{dato.realizo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn-guardar mt-2" style={{ backgroundColor: '#2b8a3e', width:'100%' }} onClick={guardarImportacionMasiva}>
            Confirmar y Guardar Todo en la Base de Datos
          </button>
        </div>
      )}
    </div>
  );
};