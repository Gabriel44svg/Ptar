from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List
from app.db.database import get_db
from app.core.security import get_usuario_actual, get_password_hash # <--- Importamos el hash
from app.models.usuarios import Usuario, RolUsuario
from pydantic import BaseModel

router = APIRouter()

# --- ESQUEMAS ---
class UsuarioResponse(BaseModel):
    id_usuario: int
    nombre_completo: str
    correo: str
    rol: str
    activo: bool = True
    class Config:
        from_attributes = True

class UsuarioCreate(BaseModel):
    nombre_completo: str
    correo: str
    password: str
    rol: str

# --- RUTAS DE GESTIÓN DE USUARIOS ---
@router.get("/usuarios", response_model=List[UsuarioResponse])
def obtener_usuarios(db: Session = Depends(get_db), usuario_actual: Usuario = Depends(get_usuario_actual)):
    # Ahora ambos, Super Admin y Admin, pueden ver la lista
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Acceso denegado.")
    return db.query(Usuario).all()

@router.post("/usuarios", response_model=UsuarioResponse)
def crear_usuario(
    nuevo_usuario: UsuarioCreate, 
    db: Session = Depends(get_db), 
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="No tienes permisos para crear usuarios.")

    # Regla: Un Admin normal no puede crear Super Admins ni otros Admins (opcional, pero buena práctica)
    if usuario_actual.rol == RolUsuario.ADMINISTRADOR and nuevo_usuario.rol in [RolUsuario.SUPER_ADMIN.value, RolUsuario.ADMINISTRADOR.value]:
        raise HTTPException(status_code=403, detail="Un Administrador solo puede crear usuarios de nivel operativo o lector.")

    # Verificar que el correo no exista
    if db.query(Usuario).filter(Usuario.correo == nuevo_usuario.correo).first():
        raise HTTPException(status_code=400, detail="El correo ya está registrado.")

    usuario_db = Usuario(
        nombre_completo=nuevo_usuario.nombre_completo,
        correo=nuevo_usuario.correo,
        rol=nuevo_usuario.rol,
        password_hash=get_password_hash(nuevo_usuario.password) # Encriptamos la contraseña
    )
    
    db.add(usuario_db)
    db.commit()
    db.refresh(usuario_db)
    return usuario_db

@router.delete("/usuarios/{id_usuario}", status_code=status.HTTP_204_NO_CONTENT)
def eliminar_usuario(
    id_usuario: int, 
    db: Session = Depends(get_db), 
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    usuario_a_eliminar = db.query(Usuario).filter(Usuario.id_usuario == id_usuario).first()
    
    if not usuario_a_eliminar:
        raise HTTPException(status_code=404, detail="Usuario no encontrado.")

    # Regla 1: Nadie puede eliminarse a sí mismo
    if usuario_actual.id_usuario == usuario_a_eliminar.id_usuario:
        raise HTTPException(status_code=400, detail="No puedes eliminar tu propia cuenta.")

    # Regla 2: El Administrador no puede eliminar a un Super Admin ni a otro Administrador
    if usuario_actual.rol == RolUsuario.ADMINISTRADOR:
        if usuario_a_eliminar.rol in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
            raise HTTPException(status_code=403, detail="No tienes jerarquía suficiente para eliminar a este usuario.")
            
    # Si pasa todas las validaciones, eliminamos
    db.delete(usuario_a_eliminar)
    db.commit()
    return None

@router.get("/auditoria")
def obtener_bitacora(
    db: Session = Depends(get_db),
    usuario_actual: Usuario = Depends(get_usuario_actual)
):
    if usuario_actual.rol not in [RolUsuario.SUPER_ADMIN, RolUsuario.ADMINISTRADOR]:
        raise HTTPException(status_code=403, detail="Acceso denegado a la bitácora de auditoría.")
    
    # IMPORTANTE: Cambia "b.fecha_accion" por el nombre real de tu columna si es distinto
    query = text("""
        SELECT 
            ROW_NUMBER() OVER(ORDER BY b.fecha_accion DESC) AS id_auditoria, 
            b.tabla_afectada, 
            b.id_registro_afectado, 
            b.accion_realizada, 
            b.valor_anterior, 
            b.fecha_accion AS fecha_hora_accion, 
            u.nombre_completo AS responsable
        FROM Bitacora_Auditoria b
        JOIN Usuarios u ON b.id_usuario_responsable = u.id_usuario
        ORDER BY b.fecha_accion DESC
        LIMIT 100
    """)
    
    resultados = db.execute(query).mappings().all()
    return resultados