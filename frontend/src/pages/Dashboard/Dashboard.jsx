import React from 'react';
import fondo from '../../assets/img/fondo.png';

export const Dashboard = () => {
  return (
    <div style={{ 
        backgroundImage: `url(${fondo})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        height: '100%', 
        borderRadius: '8px',
        padding: '2rem',
        color: 'white',
        boxShadow: 'inset 0 0 0 2000px rgba(0, 0, 0, 0.5)' // Oscurece el fondo un poco
      }}>
      <h2>Panel de Monitoreo en Tiempo Real</h2>
      <p>Aquí integraremos la animación de la gota interactiva (gota.glb) y los KPIs rápidos.</p>
    </div>
  );
};