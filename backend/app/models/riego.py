# backend/app/models/riego.py
from sqlalchemy import Column, Integer, Float, String, Date, Time, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

# --- NUEVA TABLA PARA EL SIMULADOR DE I.O. ---
class ZonaRiego(Base):
    __tablename__ = "zonas_riego"
    id_zona = Column(Integer, primary_key=True, index=True)
    nombre_zona = Column(String(255), nullable=False)
    demanda_agua = Column(Float, default=0.0)
    costo_distribucion = Column(Float, default=1.0)

# --- TU TABLA F01-PTAR-15 INTACTA ---
class RegistroRiego(Base):
    __tablename__ = "registros_riego"

    id_registro = Column(Integer, primary_key=True, autoincrement=True)
    
    # Tiempos
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_termino = Column(Time, nullable=False)
    
    # Zona a regar (Ej. Prácticas, Polvorín, Estadio)
    zona_regar = Column(String(100), nullable=False)
    
    # Bomba / Presión (kg/cm2)
    bcm_03a = Column(Float, nullable=True)
    bcm_03b = Column(Float, nullable=True)
    bcm_03r = Column(Float, nullable=True)
    
    # Nivel de TAC-01 (m)
    tac_inicio = Column(Float, nullable=False)
    tac_termino = Column(Float, nullable=False)
    
    # Volumen usado (m3)
    volumen_usado = Column(Float, nullable=False)
    
    # Metadatos
    observaciones = Column(Text, nullable=True)
    responsable = Column(String(100), nullable=False)
    
    # Auditoría (quién lo tecleó en el sistema)
    id_usuario_captura = Column(Integer, ForeignKey("usuarios.id_usuario"))
    capturista = relationship("Usuario", foreign_keys=[id_usuario_captura])