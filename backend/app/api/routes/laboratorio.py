from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, time
from pydantic import BaseModel
from app.db.database import get_db
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario, RolUsuario
from app.models.laboratorio import RegistroMuestreo

router = APIRouter()

class RegistroMuestreoCreate(BaseModel):
    fecha: date
    hora: time
    no_muestra: int
    tec_nivel: Optional[float] = None
    tec_ph: Optional[float] = None
    tec_dqo: Optional[float] = None
    tec_t: Optional[float] = None
    rac_dqo: Optional[float] = None
    rac_ph: Optional[float] = None
    rac_t: Optional[float] = None
    rec_ssed: Optional[float] = None
    rec_od: Optional[float] = None
    rec_ph: Optional[float] = None
    rec_t: Optional[float] = None
    csc_dqo: Optional[float] = None
    csc_ph: Optional[float] = None
    csc_t: Optional[float] = None
    observaciones: Optional[str] = None
    realizo: str # <--- Agregamos este campo como obligatorio

@router.post("/registros")
def crear_registro(registro: RegistroMuestreoCreate, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    try:
        nuevo_registro = RegistroMuestreo(
            **registro.dict(), 
            id_usuario_captura=usuario_actual.id_usuario # Guardamos silenciosamente quién lo tecleó
        )
        db.add(nuevo_registro)
        db.commit()
        db.refresh(nuevo_registro)
        return {"mensaje": "Registro guardado", "id": nuevo_registro.id_registro}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error en BD: {str(e)}")

@router.get("/registros")
def obtener_registros(db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    # Como 'realizo' ya es un texto directo en la tabla, la consulta vuelve a ser súper simple
    return db.query(RegistroMuestreo).order_by(RegistroMuestreo.fecha.desc(), RegistroMuestreo.hora.desc()).limit(50).all()

@router.delete("/registros/{id_registro}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_registro(id_registro: int, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="No tienes permisos para eliminar.")
    registro = db.query(RegistroMuestreo).filter(RegistroMuestreo.id_registro == id_registro).first()
    if not registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")
    db.delete(registro)
    db.commit()
    return None

# --- NUEVA RUTA PUT (Para modificar registros existentes) ---
@router.put("/registros/{id_registro}")
def actualizar_registro(
    id_registro: int, 
    registro: RegistroMuestreoCreate, 
    db: Session = Depends(get_db), 
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    # Verificamos permisos (igual que en eliminar)
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="No tienes permisos para modificar registros.")
        
    db_registro = db.query(RegistroMuestreo).filter(RegistroMuestreo.id_registro == id_registro).first()
    if not db_registro:
        raise HTTPException(status_code=404, detail="Registro no encontrado.")
        
    # Actualizamos los campos uno por uno
    for key, value in registro.dict().items():
        setattr(db_registro, key, value)
        
    # Guardamos silenciosamente quién fue el que hizo esta modificación
    db_registro.id_usuario_captura = usuario_actual.id_usuario
    
    db.commit()
    return {"mensaje": "Registro actualizado exitosamente"}