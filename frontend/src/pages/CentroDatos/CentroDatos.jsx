import React, { useState } from 'react';
import axios from 'axios';
import './CentroDatos.css';
import fondo from '../../assets/img/fondo.png';

export const CentroDatos = () => {
  const [mensaje, setMensaje] = useState({ texto: '', tipo: '' });
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  
  const [archivoCSV, setArchivoCSV] = useState(null);
  const [datosPrevisualizacion, setDatosPrevisualizacion] = useState(null);
  const [cargando, setCargando] = useState(false);

  const descargarCSV = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      
      const url = `http://127.0.0.1:8000/api/reportes/exportar/csv${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });

      const urlBlob = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `Bitacora_PTAR_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMensaje({ texto: 'Archivo CSV (Plantilla F02) descargado.', tipo: 'exito' });
    } catch (error) {
      setMensaje({ texto: 'Error al generar CSV.', tipo: 'error' });
    }
  };

  const descargarPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (fechaInicio) params.append('fecha_inicio', fechaInicio);
      if (fechaFin) params.append('fecha_fin', fechaFin);
      
      const url = `http://127.0.0.1:8000/api/reportes/exportar/pdf${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await axios.get(url, { headers: { Authorization: `Bearer ${token}` }, responseType: 'blob' });

      const urlBlob = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = urlBlob;
      link.setAttribute('download', `Reporte_F02_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setMensaje({ texto: 'Reporte PDF generado exitosamente.', tipo: 'exito' });
    } catch (error) {
      setMensaje({ texto: 'Error al generar PDF.', tipo: 'error' });
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
      setMensaje({ texto: `Se extrajeron ${response.data.total_encontrados} filas del Excel/CSV.`, tipo: 'exito' });
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
        <div className="panel-oscuro">
          <h3>Importación Masiva (Excel / CSV)</h3>
          <p className="instrucciones">Sube un archivo <b>.csv</b> con el formato exacto F02-PTAR-02 para cargar datos masivamente.</p>
          <div className="upload-container">
            <input type="file" accept=".csv" className="file-input" id="file-upload" onChange={(e) => setArchivoCSV(e.target.files[0])} />
            <label htmlFor="file-upload" className="btn-upload">Seleccionar Archivo CSV</label>
            <p className="file-name">{archivoCSV ? archivoCSV.name : 'Ningún archivo seleccionado'}</p>
          </div>
          <button className="btn-guardar mt-2" onClick={procesarCSV} disabled={!archivoCSV || cargando}>
            {cargando ? 'Analizando...' : 'Leer y Previsualizar Datos'}
          </button>
        </div>

        <div className="panel-oscuro">
          <h3>Generación de Reportes</h3>
          <p className="instrucciones">Descarga la plantilla vacía o filtra por fechas para obtener tus reportes oficiales.</p>
          <div className="controles-fecha mb-2">
            <div className="input-group-vertical"><label>Inicio:</label><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="input-fecha" /></div>
            <div className="input-group-vertical"><label>Fin:</label><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="input-fecha" /></div>
          </div>
          <div className="botones-exportacion">
            <button className="btn-exportar csv" onClick={descargarCSV}>Descargar Sábana de Datos (CSV)</button>
            <button className="btn-exportar pdf" onClick={descargarPDF}>Descargar Reporte (PDF)</button>
          </div>
        </div>
      </div>

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
            Confirmar y Guardar Todo
          </button>
        </div>
      )}
    </div>
  );
};