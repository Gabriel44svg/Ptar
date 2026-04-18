# backend/app/api/routes/predictivo.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
from app.db.database import get_db
from app.models.laboratorio import RegistroMuestreo 
from app.services.markov import clasificar_estado, calcular_matriz_transicion
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario

router = APIRouter()

# Conectamos los IDs del frontend con la columna real de tu hoja F02-PTAR-02
# Usamos las columnas de salida (CSC) o del reactor aerobio (REC) que son los datos finales.
PARAMETROS_MAP = {
    1: {"col": RegistroMuestreo.csc_ph, "nombre": "pH (Salida Clarificador)", "min": 6.5, "max": 8.5},
    2: {"col": RegistroMuestreo.csc_t, "nombre": "Temperatura (Salida)", "min": 15.0, "max": 35.0},
    3: {"col": RegistroMuestreo.csc_dqo, "nombre": "DQO (Salida)", "min": 0.0, "max": 150.0},
    4: {"col": RegistroMuestreo.rec_ssed, "nombre": "SSED (Reactor Aerobio)", "min": 0.0, "max": 5.0},
    5: {"col": RegistroMuestreo.rec_od, "nombre": "OD (Reactor Aerobio)", "min": 2.0, "max": 8.0},
}

@router.get("/graficas")
def obtener_datos_graficas(
    id_proceso: int = Query(..., description="ID del parámetro químico"),
    dias: int = Query(30, description="Rango de días"),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if id_proceso not in PARAMETROS_MAP:
        return []

    mapa = PARAMETROS_MAP[id_proceso]
    columna = mapa["col"]
    
    # Iniciamos la consulta base
    query = db.query(RegistroMuestreo).filter(columna.isnot(None))
    
    # Si 'dias' es mayor a 0, aplicamos el filtro de fecha. Si es 0, trae todo.
    if dias > 0:
        fecha_limite = datetime.now().date() - timedelta(days=dias)
        query = query.filter(RegistroMuestreo.fecha >= fecha_limite)
        
    registros = query.order_by(RegistroMuestreo.fecha.asc(), RegistroMuestreo.hora.asc()).all()

    datos = []
    for r in registros:
        valor = getattr(r, columna.key)
        datos.append({
            "fecha": f"{r.fecha.strftime('%m-%d')} {r.hora.strftime('%H:%M')}", 
            "valor": float(valor)
        })
    return datos

@router.get("/markov")
def obtener_modelo_markov(
    id_proceso: int = Query(..., description="ID del parámetro"),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if id_proceso not in PARAMETROS_MAP:
        return {"error": "Parámetro no disponible"}

    mapa = PARAMETROS_MAP[id_proceso]
    columna = mapa["col"]

    # Extraer todo el histórico cronológico que no sea nulo
    registros = db.query(RegistroMuestreo).filter(
        columna.isnot(None)
    ).order_by(RegistroMuestreo.fecha.asc(), RegistroMuestreo.hora.asc()).all()

    valores = [float(getattr(r, columna.key)) for r in registros]

    if len(valores) < 2:
        return {
            "mensaje": "Se requieren al menos 2 registros secuenciales para calcular la matriz.", 
            "matriz_transicion": []
        }

    # Clasificamos usando los umbrales normativos que definimos arriba
    secuencia_estados = [
        clasificar_estado(val, mapa["min"], mapa["max"])
        for val in valores
    ]

    matriz = calcular_matriz_transicion(secuencia_estados)
    
    estado_actual_idx = secuencia_estados[-1]
    nombres_estados = ["Bajo", "Óptimo", "Alto"]

    return {
        "parametro": mapa["nombre"],
        "espacio_estados": nombres_estados,
        "matriz_transicion": matriz,
        "total_transiciones_analizadas": len(secuencia_estados) - 1,
        "estado_actual": nombres_estados[estado_actual_idx],                  
        "prediccion_manana": matriz[estado_actual_idx]       
    }