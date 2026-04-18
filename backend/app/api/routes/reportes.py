from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import os
import csv
import codecs
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.models.laboratorio import RegistroMuestreo
from app.models.riego import RegistroRiego
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario

# ReportLab para PDF
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image as RLImage, PageBreak
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

# Matplotlib para generar gráficas
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

router = APIRouter()

class ImportacionMasivaRequest(BaseModel):
    datos: list

# --- FUNCION MEJORADA PARA DIBUJAR LÍNEAS, BARRAS Y PASTEL ---
def generar_grafica_png(x_data, y_data, titulo, color_principal, tipo='linea'):
    plt.figure(figsize=(9, 4))
    
    if tipo == 'linea':
        plt.plot(x_data, y_data, marker='o', color=color_principal, linewidth=2)
        plt.xticks(rotation=45, ha='right', fontsize=8)
        plt.grid(axis='y', linestyle='--', alpha=0.7)
    elif tipo == 'barra':
        plt.bar(x_data, y_data, color=color_principal, alpha=0.8)
        plt.xticks(rotation=45, ha='right', fontsize=8)
        plt.grid(axis='y', linestyle='--', alpha=0.7)
    elif tipo == 'pastel':
        # Para pastel, x_data son las etiquetas y y_data los valores
        colores = ['#3498db', '#2ecc71', '#e74c3c', '#f1c40f', '#9b59b6', '#34495e']
        plt.pie(y_data, labels=x_data, autopct='%1.1f%%', startangle=140, colors=colores)
        plt.axis('equal') # Para que sea un círculo perfecto
        
    plt.title(titulo, fontsize=14, fontweight='bold', color='#333333')
    plt.tight_layout()
    
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150)
    buf.seek(0)
    plt.close()
    return buf

# --- 1. EXPORTAR A CSV ---
@router.get("/exportar/csv")
def exportar_datos_csv(tipo: str = Query(...), fecha_inicio: Optional[str] = Query(None), fecha_fin: Optional[str] = Query(None), db: Session = Depends(get_db)):
    stream = io.StringIO()
    writer = csv.writer(stream)

    if tipo == "laboratorio":
        query = db.query(RegistroMuestreo)
        if fecha_inicio: query = query.filter(RegistroMuestreo.fecha >= fecha_inicio)
        if fecha_fin: query = query.filter(RegistroMuestreo.fecha <= fecha_fin)
        registros = query.order_by(RegistroMuestreo.fecha.asc()).all()

        writer.writerow(["Fecha", "Hora", "No. Muestra", "TEC_Nivel", "TEC_pH", "TEC_DQO", "TEC_T", "RAC_DQO", "RAC_pH", "RAC_T", "REC_SSED", "REC_OD", "REC_pH", "REC_T", "CSC_DQO", "CSC_pH", "CSC_T", "Observaciones", "Realizó"])
        for r in registros: writer.writerow([r.fecha, r.hora.strftime("%H:%M"), r.no_muestra, r.tec_nivel, r.tec_ph, r.tec_dqo, r.tec_t, r.rac_dqo, r.rac_ph, r.rac_t, r.rec_ssed, r.rec_od, r.rec_ph, r.rec_t, r.csc_dqo, r.csc_ph, r.csc_t, r.observaciones, r.realizo])
        nombre = f"Bitacora_Laboratorio_{datetime.now().strftime('%Y%m%d')}.csv"

    elif tipo == "riego":
        query = db.query(RegistroRiego)
        if fecha_inicio: query = query.filter(RegistroRiego.fecha >= fecha_inicio)
        if fecha_fin: query = query.filter(RegistroRiego.fecha <= fecha_fin)
        registros = query.order_by(RegistroRiego.fecha.asc()).all()

        writer.writerow(["Fecha", "Hora Inicio", "Hora Término", "Zona", "BCM-03A", "BCM-03B", "BCM-03R", "TAC Inicio", "TAC Término", "Volumen (m3)", "Observaciones", "Responsable"])
        for r in registros: writer.writerow([r.fecha, r.hora_inicio.strftime("%H:%M"), r.hora_termino.strftime("%H:%M"), r.zona_regar, r.bcm_03a, r.bcm_03b, r.bcm_03r, r.tac_inicio, r.tac_termino, r.volumen_usado, r.observaciones, r.responsable])
        nombre = f"Bitacora_Riego_{datetime.now().strftime('%Y%m%d')}.csv"

    output = stream.getvalue()
    stream.close()
    return StreamingResponse(io.StringIO(output), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename={nombre}"})

# --- 2. EXPORTAR A PDF (CON GRÁFICAS DE PASTEL Y BARRAS) ---
@router.get("/exportar/pdf")
def exportar_datos_pdf(tipo: str = Query(...), fecha_inicio: Optional[str] = Query(None), fecha_fin: Optional[str] = Query(None), db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
    elementos = []
    estilos = getSampleStyleSheet()

    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
    img_fes = RLImage(os.path.join(base_dir, "assets", "logofes.png"), width=70, height=70) if os.path.exists(os.path.join(base_dir, "assets", "logofes.png")) else ""
    img_ptar = RLImage(os.path.join(base_dir, "assets", "ptar.png"), width=70, height=70) if os.path.exists(os.path.join(base_dir, "assets", "ptar.png")) else ""

    titulo = Paragraph(f"<p align='center'><b>Registro Oficial PTAR - {'F02-PTAR-02 (Laboratorio)' if tipo == 'laboratorio' else 'F01-PTAR-15 (Riego)'}</b></p>", estilos['Title'])
    subtitulo = Paragraph(f"<p align='center'>Generado por: {usuario_actual.nombre_completo} - {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>", estilos['Normal'])
    elementos.extend([Table([[img_fes, [titulo, Spacer(1, 5), subtitulo], img_ptar]], colWidths=[100, 500, 100], style=[('ALIGN', (0,0), (-1,-1), 'CENTER'), ('VALIGN', (0,0), (-1,-1), 'MIDDLE')]), Spacer(1, 15)])

    if tipo == "laboratorio":
        query = db.query(RegistroMuestreo)
        if fecha_inicio: query = query.filter(RegistroMuestreo.fecha >= fecha_inicio)
        if fecha_fin: query = query.filter(RegistroMuestreo.fecha <= fecha_fin)
        registros = query.order_by(RegistroMuestreo.fecha.asc()).all()

        datos_tabla = [["Fecha", "Hora", "No.", "TEC-01", "", "", "", "RAC-01", "", "", "REC-01", "", "", "", "CSC-01", "", "", "Obs", "Realizó"], ["", "", "Mue", "Niv", "pH", "DQO", "T", "DQO", "pH", "T", "SSED", "OD", "pH", "T", "DQO", "pH", "T", "", ""]]
        fechas_grafica, ph_salida, dqo_salida = [], [], []

        for r in registros:
            datos_tabla.append([str(r.fecha), r.hora.strftime("%H:%M"), str(r.no_muestra), r.tec_nivel or "-", r.tec_ph or "-", r.tec_dqo or "-", r.tec_t or "-", r.rac_dqo or "-", r.rac_ph or "-", r.rac_t or "-", r.rec_ssed or "-", r.rec_od or "-", r.rec_ph or "-", r.rec_t or "-", r.csc_dqo or "-", r.csc_ph or "-", r.csc_t or "-", r.observaciones or "-", r.realizo])
            fechas_grafica.append(f"{r.fecha.strftime('%m-%d')} {r.hora.strftime('%H:%M')}")
            ph_salida.append(r.csc_ph if r.csc_ph else 0)
            dqo_salida.append(r.csc_dqo if r.csc_dqo else 0)

        tabla = Table(datos_tabla, repeatRows=2)
        tabla.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 1), colors.HexColor("#1a1a5a")), ('TEXTCOLOR', (0, 0), (-1, 1), colors.white), ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 7), ('SPAN', (0,0), (0,1)), ('SPAN', (1,0), (1,1)), ('SPAN', (2,0), (2,1)), ('SPAN', (3,0), (6,0)), ('SPAN', (7,0), (9,0)), ('SPAN', (10,0), (13,0)), ('SPAN', (14,0), (16,0)), ('SPAN', (17,0), (17,1)), ('SPAN', (18,0), (18,1)), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)]))
        elementos.append(tabla)

        if len(fechas_grafica) > 1:
            elementos.append(PageBreak())
            elementos.append(Paragraph("<p align='center'><b>Anexo: Gráficas de Tendencia y Comparación</b></p>", estilos['Title']))
            
            # Gráfica de Línea
            elementos.append(RLImage(generar_grafica_png(fechas_grafica, ph_salida, "Evolución de pH en Salida (Tendencia)", "#aa863a", "linea"), width=500, height=200))
            # Gráfica de Barras
            elementos.append(RLImage(generar_grafica_png(fechas_grafica, dqo_salida, "Comparación DQO en Salida (Barras)", "#e74c3c", "barra"), width=500, height=200))

    elif tipo == "riego":
        query = db.query(RegistroRiego)
        if fecha_inicio: query = query.filter(RegistroRiego.fecha >= fecha_inicio)
        if fecha_fin: query = query.filter(RegistroRiego.fecha <= fecha_fin)
        registros = query.order_by(RegistroRiego.fecha.asc()).all()

        datos_tabla = [["Fecha", "Horario", "Zona a Regar", "Presión BCM-03", "TAC Inicio", "TAC Término", "Vol. Usado (m3)", "Realizó"]]
        fechas_grafica, volumenes = [], []
        zonas_agrupadas = {} # Para la gráfica de pastel

        for r in registros:
            datos_tabla.append([str(r.fecha), f"{r.hora_inicio.strftime('%H:%M')} - {r.hora_termino.strftime('%H:%M')}", r.zona_regar, f"A:{r.bcm_03a or '-'} B:{r.bcm_03b or '-'} R:{r.bcm_03r or '-'}", str(r.tac_inicio), str(r.tac_termino), str(r.volumen_usado), r.responsable])
            fechas_grafica.append(r.fecha.strftime('%m-%d'))
            volumenes.append(r.volumen_usado)
            
            # Sumar volumen por zona para el pastel
            if r.zona_regar in zonas_agrupadas: zonas_agrupadas[r.zona_regar] += r.volumen_usado
            else: zonas_agrupadas[r.zona_regar] = r.volumen_usado

        tabla = Table(datos_tabla, repeatRows=1)
        tabla.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#3498db")), ('TEXTCOLOR', (0, 0), (-1, 0), colors.white), ('ALIGN', (0, 0), (-1, -1), 'CENTER'), ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'), ('FONTSIZE', (0, 0), (-1, -1), 9), ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)]))
        elementos.append(tabla)

        if len(fechas_grafica) > 1:
            elementos.append(PageBreak())
            elementos.append(Paragraph("<p align='center'><b>Anexo: Gráficas de Consumo y Distribución</b></p>", estilos['Title']))
            
            # Gráfica de Barras (Histórico)
            elementos.append(RLImage(generar_grafica_png(fechas_grafica, volumenes, "Consumo Histórico de Agua (Barras)", "#3498db", "barra"), width=500, height=200))
            
            # Gráfica de Pastel (Distribución por Zona)
            etiquetas_pastel = list(zonas_agrupadas.keys())
            valores_pastel = list(zonas_agrupadas.values())
            elementos.append(RLImage(generar_grafica_png(etiquetas_pastel, valores_pastel, "Distribución de Riego por Zona (Pastel)", "", "pastel"), width=400, height=250))

    doc.build(elementos)
    pdf_value = buffer.getvalue()
    buffer.close()
    return StreamingResponse(io.BytesIO(pdf_value), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Reporte.pdf"})

# --- 3. PREVISUALIZAR IMPORTACIÓN MASIVA ---
def parse_float(val):
    if not val or str(val).strip() in ["", "-"]: return None
    try: return float(val)
    except: return None

@router.post("/importar/previsualizar")
async def previsualizar_csv(file: UploadFile = File(...), usuario_actual: Usuario = Depends(get_usuario_actual)):
    if not file.filename.endswith('.csv'): raise HTTPException(status_code=400, detail="El archivo debe ser un CSV.")
    
    csv_reader = csv.reader(codecs.iterdecode(file.file, 'utf-8'))
    next(csv_reader, None) # Saltar cabeceras
    
    resultados = []
    for row in csv_reader:
        if len(row) < 19: continue
        resultados.append({
            "fecha": row[0], "hora": row[1], "no_muestra": int(row[2]),
            "tec_nivel": parse_float(row[3]), "tec_ph": parse_float(row[4]), "tec_dqo": parse_float(row[5]), "tec_t": parse_float(row[6]),
            "rac_dqo": parse_float(row[7]), "rac_ph": parse_float(row[8]), "rac_t": parse_float(row[9]),
            "rec_ssed": parse_float(row[10]), "rec_od": parse_float(row[11]), "rec_ph": parse_float(row[12]), "rec_t": parse_float(row[13]),
            "csc_dqo": parse_float(row[14]), "csc_ph": parse_float(row[15]), "csc_t": parse_float(row[16]),
            "observaciones": row[17] if row[17] else None, "realizo": row[18]
        })

    return {"nombre_archivo": file.filename, "total_encontrados": len(resultados), "datos_extraidos": resultados}

# --- 4. GUARDAR IMPORTACIÓN MASIVA ---
@router.post("/importar/guardar")
def guardar_importacion_masiva(peticion: ImportacionMasivaRequest, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    nuevas_lecturas = [RegistroMuestreo(**item, id_usuario_captura=usuario_actual.id_usuario) for item in peticion.datos]
    db.add_all(nuevas_lecturas)
    db.commit()
    return {"mensaje": f"Se insertaron {len(nuevas_lecturas)} registros exitosamente."}