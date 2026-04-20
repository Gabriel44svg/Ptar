import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Canvas } from '@react-three/fiber';
import { useGLTF, OrbitControls, Environment, Float } from '@react-three/drei';
import fondo from '../../assets/img/fondo.png';
import './Dashboard.css'; // Asegúrate de renombrar tu CSS a este nombre

// --- COMPONENTE QUE CARGA TU MODELO 3D ---
const ModeloGota = () => {
  // Carga el archivo directamente desde la carpeta public/gotaG.glb
  const { scene } = useGLTF('/gotaG.glb'); 
  return (
    // Si la gota se ve muy grande o pequeña, ajusta el valor de 'scale'
    <primitive object={scene} scale={1.5} position={[0, -1, 0]} />
  );
};

export const Dashboard = () => {
  const [totalAgua, setTotalAgua] = useState(0);
  const [promedios, setPromedios] = useState({ ph: 0, dqo: 0, od: 0 });
  const [nivelTanque, setNivelTanque] = useState(0);

  useEffect(() => {
    cargarIndicadores();
  }, []);

  const cargarIndicadores = async () => {
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };

      // 1. Obtener datos de Riego (Para la Gota y Nivel de Tanque)
      const resRiego = await axios.get('http://127.0.0.1:8000/api/riego/registros', config);
      const datosRiego = resRiego.data;
      
      if (datosRiego.length > 0) {
        const sumaVolumen = datosRiego.reduce((acc, curr) => acc + Number(curr.volumen_usado), 0);
        setTotalAgua(sumaVolumen * 1000); // Convertimos de m3 a Litros
        setNivelTanque(datosRiego[0].tac_termino); // Último nivel del tanque
      }

      // 2. Obtener datos Químicos (Para los KPIs de calidad)
      const resLab = await axios.get('http://127.0.0.1:8000/api/laboratorio/registros', config);
      const datosLab = resLab.data;

      if (datosLab.length > 0) {
        const sumPh = datosLab.reduce((acc, curr) => acc + Number(curr.csc_ph || 0), 0);
        const sumDqo = datosLab.reduce((acc, curr) => acc + Number(curr.csc_dqo || 0), 0);
        const sumOd = datosLab.reduce((acc, curr) => acc + Number(curr.rec_od || 0), 0);
        
        setPromedios({
          ph: (sumPh / datosLab.filter(d => d.csc_ph).length).toFixed(2),
          dqo: (sumDqo / datosLab.filter(d => d.csc_dqo).length).toFixed(1),
          od: (sumOd / datosLab.filter(d => d.rec_od).length).toFixed(2),
        });
      }
    } catch (error) {
      console.error("Error al cargar KPIs", error);
    }
  };

  return (
    <div style={{ 
        backgroundImage: `url(${fondo})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        minHeight: '100%', 
        borderRadius: '8px',
        padding: '2rem',
        color: 'white',
        boxShadow: 'inset 0 0 0 2000px rgba(0, 0, 0, 0.65)' // Oscurecido ligeramente para que resalte el 3D
      }}>
      
      <h2 style={{ textAlign: 'center', marginBottom: '10px', color: '#aa863a', textTransform: 'uppercase', letterSpacing: '2px' }}>
        Panel de Monitoreo en Tiempo Real
      </h2>
      <p style={{ textAlign: 'center', color: '#ccc', marginBottom: '40px' }}>
        Indicadores Clave de Rendimiento y Volumen de Agua Salvada (PTAR FES Acatlán)
      </p>

      <div className="kpi-dashboard-container">
        
        {/* TARJETAS IZQUIERDAS (Calidad del Agua) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="kpi-card kpi-ph">
            <span className="kpi-titulo">pH Promedio (Salida)</span>
            <span className="kpi-numero">{promedios.ph}</span>
          </div>
          <div className="kpi-card kpi-dqo">
            <span className="kpi-titulo">DQO Promedio (mg/L)</span>
            <span className="kpi-numero">{promedios.dqo}</span>
          </div>
        </div>

        {/* --- CONTENEDOR DEL MODELO 3D (LA GOTA) --- */}
        <div style={{ position: 'relative', width: '350px', height: '350px', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 20px' }}>
          
          {/* El Lienzo 3D de React Three Fiber */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[10, 10, 10]} intensity={1.5} />
              {/* Le da un reflejo realista al modelo 3D */}
              <Environment preset="city" /> 
              
              <Float speed={2.5} rotationIntensity={0.6} floatIntensity={1.2}>
                <ModeloGota />
              </Float>
              
              <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={2.5} />
            </Canvas>
          </div>

          {/* Textos sobrepuestos al modelo 3D */}
          <div style={{ position: 'absolute', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', textShadow: '0px 2px 10px rgba(0,0,0,0.9)' }}>
            <span style={{ fontSize: '3rem', fontWeight: '900', color: 'white', margin: 0, lineHeight: '1' }}>
              {totalAgua > 1000000 
                ? `${(totalAgua / 1000000).toFixed(2)}M` 
                : totalAgua.toLocaleString('en-US')}
            </span>
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#4da8da', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Litros Salvados
            </span>
          </div>
        </div>

        {/* TARJETAS DERECHAS (Operación) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="kpi-card kpi-tanque">
            <span className="kpi-titulo">Nivel Actual TAC-01</span>
            <span className="kpi-numero">{nivelTanque} m</span>
          </div>
          <div className="kpi-card kpi-od">
            <span className="kpi-titulo">Oxígeno Disuelto (OD)</span>
            <span className="kpi-numero">{promedios.od} mg/L</span>
          </div>
        </div>

      </div>
    </div>
  );
};