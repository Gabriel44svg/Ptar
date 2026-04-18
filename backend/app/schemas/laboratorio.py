# backend/app/schemas/laboratorio.py
from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from decimal import Decimal

class LecturaBase(BaseModel):
    id_tipo_proceso: int = Field(..., description="ID del parámetro (1=pH, 2=Temp, 3=DQO, 4=SSED, 5=OD, 6=SST, 7=DBO5)")
    valor_medido: Decimal = Field(..., description="Valor numérico de la muestra química")

    # RF-02: Validación estricta de límites lógicos
    @field_validator('valor_medido')
    @classmethod
    def validar_logica_medicion(cls, v, info):
        tipo = info.data.get('id_tipo_proceso')
        
        # El pH (ID 1) debe estar estrictamente en el rango de 0 a 14
        if tipo == 1 and (v < 0 or v > 14):
            raise ValueError('Error de validación: El pH debe estar estrictamente en el rango de 0 a 14.')
        
        # Para las concentraciones y demandas (DQO, SSED, OD, SST, DBO5), no existen valores negativos
        if tipo in [3, 4, 5, 6, 7] and v < 0:
            raise ValueError('Error de validación: Las concentraciones no pueden tener valores negativos.')
            
        return v

class LecturaCreate(LecturaBase):
    # Ya no pedimos el id_usuario_registro aquí. Lo extraeremos del token JWT por seguridad.
    pass

class LecturaResponse(LecturaBase):
    id_lectura: int
    fecha_hora_registro: datetime
    id_usuario_registro: int

    class Config:
        from_attributes = True

class LecturaBatch(BaseModel):
    lecturas: list[LecturaCreate]

# Esquema para el catálogo dinámico de procesos (para el botón de agregar a futuro)
class CatProcesoBase(BaseModel):
    nombre_proceso: str
    umbral_minimo: float | None = None
    umbral_maximo: float | None = None

class CatProcesoCreate(CatProcesoBase):
    pass

class CatProcesoResponse(CatProcesoBase):
    id_tipo_proceso: int

    class Config:
        from_attributes = True