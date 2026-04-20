from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time
from app.db.database import get_db
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario

# Importamos los modelos de la base de datos
from app.models.riego import RegistroRiego, ZonaRiego

router = APIRouter()

# ==========================================
# ESQUEMAS PYDANTIC (Validación de Datos)
# ==========================================
class ZonaCreate(BaseModel):
    nombre_zona: str
    demanda_agua: float = 0.0
    costo_distribucion: float = 1.0

class RegistroRiegoCreate(BaseModel):
    fecha: date
    hora_inicio: time
    hora_termino: time
    zona_regar: str
    bcm_03a: Optional[float] = None
    bcm_03b: Optional[float] = None
    bcm_03r: Optional[float] = None
    tac_inicio: float
    tac_termino: float
    volumen_usado: float
    observaciones: Optional[str] = None
    responsable: str

class SimulacionRequest(BaseModel):
    volumen_disponible: float

# ==========================================
# RUTAS PARA ZONAS DE RIEGO
# ==========================================
@router.get("/zonas")
def obtener_zonas(db: Session = Depends(get_db)):
    return db.query(ZonaRiego).all()

@router.post("/zonas")
def crear_zona(zona: ZonaCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    nueva_zona = ZonaRiego(**zona.dict())
    db.add(nueva_zona)
    db.commit()
    db.refresh(nueva_zona)
    return nueva_zona

@router.delete("/zonas/{id_zona}")
def eliminar_zona(id_zona: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    zona = db.query(ZonaRiego).filter(ZonaRiego.id_zona == id_zona).first()
    if not zona:
        raise HTTPException(status_code=404, detail="Zona no encontrada")
    db.delete(zona)
    db.commit()
    return {"mensaje": "Zona eliminada exitosamente"}

# ==========================================
# RUTAS PARA REGISTROS DE RIEGO (F01-PTAR-15)
# ==========================================
@router.get("/registros")
def obtener_registros(db: Session = Depends(get_db)):
    return db.query(RegistroRiego).order_by(RegistroRiego.fecha.desc(), RegistroRiego.hora_inicio.desc()).all()

@router.post("/registros")
def crear_registro(registro: RegistroRiegoCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    nuevo_registro = RegistroRiego(**registro.dict(), id_usuario_captura=usuario_actual.id_usuario)
    db.add(nuevo_registro)
    db.commit()
    db.refresh(nuevo_registro)
    return nuevo_registro

@router.put("/registros/{id_registro}")
def actualizar_registro(id_registro: int, registro: RegistroRiegoCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    registro_db = db.query(RegistroRiego).filter(RegistroRiego.id_registro == id_registro).first()
    if not registro_db:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    
    for key, value in registro.dict().items():
        setattr(registro_db, key, value)
        
    db.commit()
    db.refresh(registro_db)
    return registro_db

@router.delete("/registros/{id_registro}")
def eliminar_registro(id_registro: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    registro_db = db.query(RegistroRiego).filter(RegistroRiego.id_registro == id_registro).first()
    if not registro_db:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    db.delete(registro_db)
    db.commit()
    return {"mensaje": "Registro eliminado exitosamente"}

# ==========================================
# SIMULADOR MATEMÁTICO (Investigación de Operaciones)
# ==========================================
@router.post("/simular")
def simular_distribucion(datos: SimulacionRequest, db: Session = Depends(get_db)):
    zonas = db.query(ZonaRiego).all()
    if not zonas:
        raise HTTPException(status_code=400, detail="No hay zonas registradas para simular.")
    
    volumen_restante = datos.volumen_disponible
    resultados = []
    
    # Lógica de distribución proporcional
    demanda_total = sum(z.demanda_agua for z in zonas if z.demanda_agua > 0)
    
    for zona in zonas:
        if demanda_total > 0:
            porcion = (zona.demanda_agua / demanda_total) * datos.volumen_disponible
            vol_asignado = min(porcion, zona.demanda_agua)
        else:
            vol_asignado = 0
            
        porcentaje = (vol_asignado / zona.demanda_agua * 100) if zona.demanda_agua > 0 else 100
        
        resultados.append({
            "id_zona": zona.id_zona,
            "nombre_zona": zona.nombre_zona,
            "volumen_asignado": round(vol_asignado, 2),
            "porcentaje_cubierto": round(porcentaje, 1)
        })
        volumen_restante -= vol_asignado
        
    return {
        "volumen_total_ingresado": datos.volumen_disponible,
        "volumen_distribuido": round(datos.volumen_disponible - volumen_restante, 2),
        "distribucion": resultados
    }