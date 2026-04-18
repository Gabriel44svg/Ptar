# backend/app/api/routes/predictivo.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
from app.db.database import get_db
from app.models.laboratorio import RegistroMuestreo 
from app.services.markov import clasificar_estado, calcular_matriz_transicion
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario
from sqlalchemy import func
from app.models.riego import RegistroRiego

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
    id_proceso: str = Query(..., description="ID del parámetro o 'riego'"),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    agrupacion: str = Query("dias", description="dias, meses, anos"), # <--- NUEVO PARÁMETRO
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    # --- 1. CASO RIEGO (Suma de volúmenes) ---
    if id_proceso == 'riego':
        query = db.query(RegistroRiego)
        if fecha_inicio: query = query.filter(RegistroRiego.fecha >= fecha_inicio)
        if fecha_fin: query = query.filter(RegistroRiego.fecha <= fecha_fin)
        registros = query.order_by(RegistroRiego.fecha.asc()).all()

        agrupados = {}
        for r in registros:
            # Extraemos la fecha según lo que el usuario quiera ver
            if agrupacion == 'anos': key = r.fecha.strftime('%Y')
            elif agrupacion == 'meses': key = r.fecha.strftime('%Y-%m')
            else: key = r.fecha.strftime('%Y-%m-%d')
            
            # Sumamos los volúmenes
            agrupados[key] = agrupados.get(key, 0.0) + float(r.volumen_usado)
        
        return [{"fecha": k, "valor": round(v, 2)} for k, v in agrupados.items()]

    # --- 2. CASO LABORATORIO (Promedio de lecturas químicas) ---
    id_proceso_int = int(id_proceso)
    if id_proceso_int not in PARAMETROS_MAP: return []
    
    mapa = PARAMETROS_MAP[id_proceso_int]
    columna = mapa["col"]
    
    query = db.query(RegistroMuestreo).filter(columna.isnot(None))
    if fecha_inicio: query = query.filter(RegistroMuestreo.fecha >= fecha_inicio)
    if fecha_fin: query = query.filter(RegistroMuestreo.fecha <= fecha_fin)
    registros = query.order_by(RegistroMuestreo.fecha.asc(), RegistroMuestreo.hora.asc()).all()

    # Si quiere ver meses o años, hacemos PROMEDIOS
    if agrupacion in ['meses', 'anos']:
        agrupados = {}
        for r in registros:
            val = getattr(r, columna.key)
            key = r.fecha.strftime('%Y') if agrupacion == 'anos' else r.fecha.strftime('%Y-%m')
            
            if key not in agrupados: agrupados[key] = []
            agrupados[key].append(float(val))
            
        return [{"fecha": k, "valor": round(sum(v)/len(v), 2)} for k, v in agrupados.items()]
    
    # Si quiere ver días, mostramos cada lectura exacta con su hora
    else:
        datos = []
        for r in registros:
            datos.append({
                "fecha": f"{r.fecha.strftime('%Y-%m-%d')} {r.hora.strftime('%H:%M')}", 
                "valor": float(getattr(r, columna.key))
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