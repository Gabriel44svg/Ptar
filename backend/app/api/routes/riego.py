# backend/app/api/routes/riego.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.database import get_db
from app.models.laboratorio import CatProceso 
from sqlalchemy import Column, Integer, String, Numeric, Date, Time, ForeignKey
from app.db.database import Base
from app.schemas.riego import ZonaRiegoCreate, ZonaRiegoResponse, RegistroRiegoCreate, RegistroRiegoResponse
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario, RolUsuario
from app.schemas.riego import SimulacionRequest, SimulacionResponse
from app.services.optimizacion import calcular_optimo_riego

# Mapeo rápido de modelos de SQLAlchemy para Riego (Puedes moverlos a app/models/riego.py luego)
class ZonaRiego(Base):
    __tablename__ = "zonas_riego"
    id_zona = Column(Integer, primary_key=True, index=True)
    nombre_zona = Column(String(255), nullable=False)
    demanda_agua = Column(Numeric(10, 4), default=0.0)
    costo_distribucion = Column(Numeric(10, 4), default=1.0)

class RegistroOperacionRiego(Base):
    __tablename__ = "registro_operacion_riego"
    id_operacion = Column(Integer, primary_key=True, index=True)
    fecha = Column(Date, nullable=False)
    hora_inicio = Column(Time, nullable=False)
    hora_termino = Column(Time, nullable=True)
    id_zona = Column(Integer, ForeignKey("zonas_riego.id_zona", ondelete="RESTRICT"), nullable=False)
    volumen_usado = Column(Numeric(10, 5), nullable=True)
    id_usuario_responsable = Column(Integer, ForeignKey("usuarios.id_usuario", ondelete="RESTRICT"), nullable=False)


router = APIRouter()

# --- RUTAS PARA ZONAS DE RIEGO ---
@router.get("/zonas", response_model=List[ZonaRiegoResponse])
def obtener_zonas(db: Session = Depends(get_db)):
    return db.query(ZonaRiego).all()

@router.post("/zonas", response_model=ZonaRiegoResponse)
def crear_zona(
    zona: ZonaRiegoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Solo los administradores pueden agregar zonas de riego.")
        
    nueva_zona = ZonaRiego(**zona.model_dump())
    db.add(nueva_zona)
    db.commit()
    db.refresh(nueva_zona)
    return nueva_zona

# --- RUTAS PARA REGISTRO DE RIEGO ---
@router.post("/registros", response_model=RegistroRiegoResponse)
def registrar_riego(
    registro: RegistroRiegoCreate, 
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    zona = db.query(ZonaRiego).filter(ZonaRiego.id_zona == registro.id_zona).first()
    if not zona:
        raise HTTPException(status_code=404, detail="La zona de riego no existe.")

    nuevo_registro = RegistroOperacionRiego(
        **registro.model_dump(),
        id_usuario_responsable=usuario_actual.id_usuario
    )
    
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro

@router.get("/registros", response_model=List[RegistroRiegoResponse])
def obtener_registros_riego(db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    return db.query(RegistroOperacionRiego).order_by(RegistroOperacionRiego.fecha.desc(), RegistroOperacionRiego.hora_inicio.desc()).all()

   
@router.post("/simular", response_model=SimulacionResponse)
def simular_distribucion(
    peticion: SimulacionRequest, 
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    # 1. Obtener todas las zonas disponibles desde la base de datos
    zonas_db = db.query(ZonaRiego).all()
    
    # 2. Ejecutar el modelo matemático
    resultados_optimizacion = calcular_optimo_riego(peticion.volumen_disponible, zonas_db)
    
    # 3. Calcular totales para la respuesta
    volumen_distribuido = sum(item["volumen_asignado"] for item in resultados_optimizacion)
    
    return {
        "volumen_total_ingresado": peticion.volumen_disponible,
        "volumen_distribuido": volumen_distribuido,
        "distribucion": resultados_optimizacion
    }

# --- RUTAS DE ELIMINACIÓN (Solo Admin/Super Admin) ---
@router.delete("/registros/{id_operacion}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_registro_riego(
    id_operacion: int, 
    db: Session = Depends(get_db), 
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Privilegios insuficientes para eliminar registros.")
        
    registro = db.query(RegistroOperacionRiego).filter(RegistroOperacionRiego.id_operacion == id_operacion).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")
        
    db.delete(registro)
    db.commit()
    return None

@router.delete("/zonas/{id_zona}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_zona(
    id_zona: int, 
    db: Session = Depends(get_db), 
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Privilegios insuficientes para eliminar zonas.")
        
    zona = db.query(ZonaRiego).filter(ZonaRiego.id_zona == id_zona).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada.")
        
    try:
        db.delete(zona)
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar la zona porque ya tiene eventos de riego asociados en el historial."
        )
    return None