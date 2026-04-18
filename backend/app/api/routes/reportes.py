from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
import io
import os
import csv
import codecs
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, date, time
from app.db.database import get_db
from app.models.laboratorio import RegistroMuestreo
from app.core.security import get_usuario_actual
from app.models.usuarios import Usuario


# ReportLab para PDF
from reportlab.lib.pagesizes import letter, landscape
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image 
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

router = APIRouter()

# --- ESQUEMAS PARA IMPORTACIÓN MASIVA (F02-PTAR-02) ---
class RegistroImportacion(BaseModel):
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
    realizo: str

class ImportacionMasivaRequest(BaseModel):
    datos: List[RegistroImportacion]


# --- 1. EXPORTAR A CSV (Plantilla F02-PTAR-02) ---
@router.get("/exportar/csv")
def exportar_datos_csv(
    fecha_inicio: Optional[str] = Query(None), 
    fecha_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    query = db.query(RegistroMuestreo)
    if fecha_inicio:
        query = query.filter(RegistroMuestreo.fecha >= fecha_inicio)
    if fecha_fin:
        query = query.filter(RegistroMuestreo.fecha <= fecha_fin)

    registros = query.order_by(RegistroMuestreo.fecha.desc(), RegistroMuestreo.hora.desc()).all()

    stream = io.StringIO()
    writer = csv.writer(stream)
    
    # Cabeceras exactas para que sirvan de plantilla
    writer.writerow([
        "Fecha", "Hora", "No. Muestra", 
        "TEC_Nivel", "TEC_pH", "TEC_DQO", "TEC_T",
        "RAC_DQO", "RAC_pH", "RAC_T",
        "REC_SSED", "REC_OD", "REC_pH", "REC_T",
        "CSC_DQO", "CSC_pH", "CSC_T",
        "Observaciones", "Realizó"
    ])
    
    for r in registros:
        writer.writerow([
            r.fecha, r.hora.strftime("%H:%M"), r.no_muestra,
            r.tec_nivel, r.tec_ph, r.tec_dqo, r.tec_t,
            r.rac_dqo, r.rac_ph, r.rac_t,
            r.rec_ssed, r.rec_od, r.rec_ph, r.rec_t,
            r.csc_dqo, r.csc_ph, r.csc_t,
            r.observaciones, r.realizo
        ])
    
    output = stream.getvalue()
    stream.close()
    response = StreamingResponse(io.StringIO(output), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=Bitacora_PTAR_{datetime.now().strftime('%Y%m%d')}.csv"
    return response


# --- 2. EXPORTAR A PDF (Formato Horizontal con Logos) ---
@router.get("/exportar/pdf")
def exportar_datos_pdf(
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    query = db.query(RegistroMuestreo)
    if fecha_inicio: query = query.filter(RegistroMuestreo.fecha >= fecha_inicio)
    if fecha_fin: query = query.filter(RegistroMuestreo.fecha <= fecha_fin)
    registros = query.order_by(RegistroMuestreo.fecha.desc(), RegistroMuestreo.hora.desc()).all()

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=landscape(letter), rightMargin=20, leftMargin=20, topMargin=20, bottomMargin=20)
    elementos = []
    estilos = getSampleStyleSheet()

    # --- INICIO DE NUEVA CABECERA CON LOGOS ---
    # 1. Buscamos la ruta absoluta de las imágenes en el backend
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__))) # Apunta a backend/app
    logo_fes_path = os.path.join(base_dir, "assets", "logofes.png")
    logo_ptar_path = os.path.join(base_dir, "assets", "ptar.png")

    # 2. Cargamos las imágenes (con validación por si no se encuentran)
    img_fes = Image(logo_fes_path, width=70, height=70) if os.path.exists(logo_fes_path) else ""
    img_ptar = Image(logo_ptar_path, width=70, height=70) if os.path.exists(logo_ptar_path) else ""

    # 3. Textos centrados
    titulo = Paragraph("<p align='center'><b>Registro de Muestreo en la PTAR (F02-PTAR-02)</b></p>", estilos['Title'])
    subtitulo = Paragraph(f"<p align='center'>Generado por: {usuario_actual.nombre_completo} - {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>", estilos['Normal'])

    # 4. Tabla invisible para alinear: [Logo Izquierdo] [Textos] [Logo Derecho]
    tabla_encabezado = Table(
        [[img_fes, [titulo, Spacer(1, 5), subtitulo], img_ptar]], 
        colWidths=[100, 500, 100]
    )
    tabla_encabezado.setStyle(TableStyle([
        ('ALIGN', (0, 0), (0, 0), 'LEFT'),
        ('ALIGN', (1, 0), (1, 0), 'CENTER'),
        ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))

    elementos.append(tabla_encabezado)
    elementos.append(Spacer(1, 15))
    # --- FIN DE CABECERA ---

    # Construir Tabla de Datos (Se queda exactamente igual)
    datos_tabla = [
        ["Fecha", "Hora", "No.", "TEC-01", "", "", "", "RAC-01", "", "", "REC-01", "", "", "", "CSC-01", "", "", "Obs.", "Realizó"],
        ["", "", "Mue", "Niv", "pH", "DQO", "T", "DQO", "pH", "T", "SSED", "OD", "pH", "T", "DQO", "pH", "T", "", ""]
    ]
    
    for r in registros:
        datos_tabla.append([
            str(r.fecha), r.hora.strftime("%H:%M"), str(r.no_muestra),
            r.tec_nivel or "-", r.tec_ph or "-", r.tec_dqo or "-", r.tec_t or "-",
            r.rac_dqo or "-", r.rac_ph or "-", r.rac_t or "-",
            r.rec_ssed or "-", r.rec_od or "-", r.rec_ph or "-", r.rec_t or "-",
            r.csc_dqo or "-", r.csc_ph or "-", r.csc_t or "-",
            r.observaciones or "-", r.realizo
        ])

    tabla = Table(datos_tabla, repeatRows=2)
    tabla.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 1), colors.HexColor("#1a1a5a")),
        ('TEXTCOLOR', (0, 0), (-1, 1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 7), 
        ('SPAN', (0, 0), (0, 1)), 
        ('SPAN', (1, 0), (1, 1)), 
        ('SPAN', (2, 0), (2, 1)), 
        ('SPAN', (3, 0), (6, 0)), 
        ('SPAN', (7, 0), (9, 0)), 
        ('SPAN', (10, 0), (13, 0)), 
        ('SPAN', (14, 0), (16, 0)),
        ('SPAN', (17, 0), (17, 1)),
        ('SPAN', (18, 0), (18, 1)),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
    ]))
    
    elementos.append(tabla)
    doc.build(elementos)
    
    pdf_value = buffer.getvalue()
    buffer.close()
    return StreamingResponse(io.BytesIO(pdf_value), media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=Reporte_F02.pdf"})

# --- 3. PREVISUALIZAR IMPORTACIÓN (Desde CSV) ---
def parse_float(val):
    if not val or str(val).strip() == "" or str(val).strip() == "-": return None
    try: return float(val)
    except: return None

@router.post("/importar/previsualizar")
async def previsualizar_csv(file: UploadFile = File(...), usuario_actual: Usuario = Depends(get_usuario_actual)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="El archivo debe ser un CSV.")
    
    csv_reader = csv.reader(codecs.iterdecode(file.file, 'utf-8'))
    next(csv_reader, None) # Saltar cabeceras
    
    resultados = []
    for row in csv_reader:
        if len(row) < 19: continue # Ignorar filas incompletas
        resultados.append({
            "fecha": row[0], "hora": row[1], "no_muestra": int(row[2]),
            "tec_nivel": parse_float(row[3]), "tec_ph": parse_float(row[4]), "tec_dqo": parse_float(row[5]), "tec_t": parse_float(row[6]),
            "rac_dqo": parse_float(row[7]), "rac_ph": parse_float(row[8]), "rac_t": parse_float(row[9]),
            "rec_ssed": parse_float(row[10]), "rec_od": parse_float(row[11]), "rec_ph": parse_float(row[12]), "rec_t": parse_float(row[13]),
            "csc_dqo": parse_float(row[14]), "csc_ph": parse_float(row[15]), "csc_t": parse_float(row[16]),
            "observaciones": row[17] if row[17] else None, "realizo": row[18]
        })

    return {
        "nombre_archivo": file.filename, 
        "total_encontrados": len(resultados),
        "datos_extraidos": resultados
    }


# --- 4. GUARDAR MASIVAMENTE ---
@router.post("/importar/guardar")
def guardar_importacion_masiva(
    peticion: ImportacionMasivaRequest, db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)
):
    nuevas_lecturas = []
    for item in peticion.datos:
        nueva_lectura = RegistroMuestreo(**item.dict(), id_usuario_captura=usuario_actual.id_usuario)
        nuevas_lecturas.append(nueva_lectura)
    
    db.add_all(nuevas_lecturas)
    db.commit()
    return {"mensaje": f"Se insertaron {len(nuevas_lecturas)} registros exitosamente."}