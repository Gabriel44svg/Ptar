# backend/app/models/laboratorio.py
from sqlalchemy import Column, Integer, Float, String, DateTime, Date, Time, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

# --- MODELOS ANTERIORES (No los borramos para que Predictivo y Riego sigan funcionando) ---
class CatProceso(Base):
    __tablename__ = 'cat_procesos'
    id_tipo_proceso = Column(Integer, primary_key=True, index=True)
    nombre_proceso = Column(String(50), nullable=False)
    unidad_medida = Column(String(20), nullable=False)
    rango_minimo = Column(Float, nullable=False)
    rango_maximo = Column(Float, nullable=False)

class LecturaProceso(Base):
    __tablename__ = 'lecturas_procesos'
    id_lectura = Column(Integer, primary_key=True, index=True)
    id_tipo_proceso = Column(Integer, ForeignKey('cat_procesos.id_tipo_proceso'))
    valor_medido = Column(Float, nullable=False)
    fecha_hora_registro = Column(DateTime, nullable=False)
    id_usuario_registro = Column(Integer, ForeignKey('usuarios.id_usuario'))

    proceso = relationship("CatProceso")
    usuario = relationship("Usuario")


# --- NUEVO MODELO (Para el formulario idéntico a la hoja F02-PTAR-02) ---
class RegistroMuestreo(Base):
    __tablename__ = "registros_muestreo"

    id_registro = Column(Integer, primary_key=True, autoincrement=True)
    fecha = Column(Date, nullable=False)
    hora = Column(Time, nullable=False)
    no_muestra = Column(Integer, nullable=False)
    
    # TEC-01 (Tanque Ecualización)
    tec_nivel = Column(Float, nullable=True)
    tec_ph = Column(Float, nullable=True)
    tec_dqo = Column(Float, nullable=True)
    tec_t = Column(Float, nullable=True)
    
    # RAC-01 (Reactor Anaerobio)
    rac_dqo = Column(Float, nullable=True)
    rac_ph = Column(Float, nullable=True)
    rac_t = Column(Float, nullable=True)
    
    # REC-01 (Reactor Aerobio)
    rec_ssed = Column(Float, nullable=True)
    rec_od = Column(Float, nullable=True)
    rec_ph = Column(Float, nullable=True)
    rec_t = Column(Float, nullable=True)
    
    # CSC-01 (Clarificador Secundario)
    csc_dqo = Column(Float, nullable=True)
    csc_ph = Column(Float, nullable=True)
    csc_t = Column(Float, nullable=True)
    
    # Metadatos
    observaciones = Column(Text, nullable=True)
    
    realizo = Column(String(50), nullable=False) 
    
    id_usuario_captura = Column(Integer, ForeignKey("usuarios.id_usuario"))