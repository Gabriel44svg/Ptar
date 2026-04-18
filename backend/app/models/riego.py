# backend/app/models/riego.py
from sqlalchemy import Column, Integer, Float, String, Date, Time, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

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