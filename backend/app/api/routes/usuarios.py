# backend/app/models/usuarios.py
import enum
from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.sql import func
from app.db.database import Base

# 1. Definimos el Enum estricto para Python
class RolUsuario(str, enum.Enum):
    SUPER_ADMIN = "Super Admin"
    ADMINISTRADOR = "Administrador"
    USUARIO_REGISTRO = "Usuario de registro"
    USUARIO_LECTOR = "Usuario lector"

# 2. Definimos el modelo de la tabla
class Usuario(Base):
    __tablename__ = "usuarios"

    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(150), nullable=False)
    correo = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Mapeamos el Enum. 
    rol = Column(Enum(RolUsuario, name="rol_usuario", create_type=False), nullable=False)
    
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    