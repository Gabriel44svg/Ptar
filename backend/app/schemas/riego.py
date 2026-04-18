# backend/app/schemas/riego.py
from pydantic import BaseModel
from datetime import date, time
from typing import Optional

# Esquemas para Zonas de Riego
class ZonaRiegoBase(BaseModel):
    nombre_zona: str
    demanda_agua: float = 0.0
    costo_distribucion: float = 1.0

class ZonaRiegoCreate(ZonaRiegoBase):
    pass

class ZonaRiegoResponse(ZonaRiegoBase):
    id_zona: int

    class Config:
        from_attributes = True

# Esquemas para Registro de Riego
class RegistroRiegoBase(BaseModel):
    fecha: date
    hora_inicio: time
    hora_termino: Optional[time] = None
    id_zona: int
    volumen_usado: float

class RegistroRiegoCreate(RegistroRiegoBase):
    pass

class RegistroRiegoResponse(RegistroRiegoBase):
    id_operacion: int
    id_usuario_responsable: int

    class Config:
        from_attributes = True

class SimulacionRequest(BaseModel):
    volumen_disponible: float

class SimulacionResultado(BaseModel):
    id_zona: int
    nombre_zona: str
    volumen_asignado: float
    porcentaje_cubierto: float

class SimulacionResponse(BaseModel):
    volumen_total_ingresado: float
    volumen_distribuido: float
    distribucion: list[SimulacionResultado]