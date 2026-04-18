# backend/app/models/usuarios.py
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
import enum
from app.db.database import Base

class RolUsuario(str, enum.Enum):
    SUPER_ADMIN = "Super Admin"
    ADMINISTRADOR = "Administrador"
    EDITOR = "Editor"  
    LECTOR = "Lector"
    
class Usuario(Base):
    __tablename__ = "usuarios"
    
    id_usuario = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(100), nullable=False)
    correo = Column(String(255), unique=True, index=True, nullable=False)
    
    # ¡AQUÍ ESTÁ EL CAMBIO CLAVE! 
    # Añadimos values_callable para que SQLAlchemy use el .value ('Super Admin') y no el .name ('SUPER_ADMIN')
    rol = Column(Enum(RolUsuario, name="rol_usuario", create_type=False, values_callable=lambda obj: [e.value for e in obj]), nullable=False)
    
    password_hash = Column(String(255), nullable=False)
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())