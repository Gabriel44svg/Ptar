from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.routes import auth, laboratorio, riego, predictivo, reportes, admin
from app.db.database import engine, Base

# Inicializamos la aplicación FastAPI
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="API REST para el monitoreo y control de la PTAR"
)

# -----------------------------------------------------------------------------
# CONFIGURACIÓN DE CORS (Para que React pueda conectarse sin bloqueos)
# -----------------------------------------------------------------------------
# Aquí definimos las URL de nuestro frontend. Vite usa el 5173 por defecto.
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Permite estas URLs
    allow_credentials=True, # Permite enviar cookies/tokens
    allow_methods=["*"],    # Permite todos los métodos (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],    # Permite todos los encabezados
)

# -----------------------------------------------------------------------------
# REGISTRO DE RUTAS (Endpoints)
# -----------------------------------------------------------------------------
# Conectamos el archivo auth.py al prefijo /api/auth
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


Base.metadata.create_all(bind=engine)