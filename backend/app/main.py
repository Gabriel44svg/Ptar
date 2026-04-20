from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, laboratorio, predictivo, reportes, admin, riego
from app.db.database import engine, Base

# Inicializamos la aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.1-CORS-FIX", 
    description="API REST para el monitoreo y control de la PTAR"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# REGISTRO DE RUTAS (Endpoints)
# -----------------------------------------------------------------------------
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(laboratorio.router, prefix="/api/laboratorio", tags=["Módulo de Laboratorio"])
app.include_router(riego.router, prefix="/api/riego", tags=["Módulo de Riego"])
app.include_router(predictivo.router, prefix="/api/predictivo", tags=["Análisis Predictivo"])
app.include_router(reportes.router, prefix="/api/reportes", tags=["Centro de Reportes"])
app.include_router(admin.router, prefix="/api/admin", tags=["Administración"])

# -----------------------------------------------------------------------------
# RUTA RAÍZ (Comprobación de estado)
# -----------------------------------------------------------------------------
@app.get("/")
def read_root():
    return {
        "mensaje": "¡Bienvenido a la API del Sistema PTAR FES Acatlán!",
        "estado": "En línea",
        "version": settings.VERSION
    }

# Crea las tablas en PostgreSQL al iniciar (si es que no existen)
#Base.metadata.create_all(bind=engine)