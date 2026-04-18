from pydantic import BaseModel, EmailStr
from datetime import datetime
from app.models.usuarios import RolUsuario

# Propiedades compartidas
class UsuarioBase(BaseModel):
    nombre_completo: str
    correo: EmailStr
    rol: RolUsuario

# Propiedades para crear un usuario (recibe contraseña)
class UsuarioCreate(UsuarioBase):
    password: str

# Propiedades para devolver al frontend (oculta la contraseña, incluye ID)
class UsuarioResponse(UsuarioBase):
    id_usuario: int
    fecha_creacion: datetime

    class Config:
        from_attributes = True  # Permite que Pydantic lea los modelos de SQLAlchemy