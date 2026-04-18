# backend/crear_super_usuario.py
from app.db.database import SessionLocal
from app.models.usuarios import Usuario, RolUsuario
from app.core.security import get_password_hash

def crear_super_usuario():
    db = SessionLocal()
    correo_super = "super@unam.mx"
    
    # Verificamos si ya existe para no duplicarlo
    usuario_existente = db.query(Usuario).filter(Usuario.correo == correo_super).first()
    if usuario_existente:
        print("El superusuario ya existe.")
        return

    # Contraseña en texto plano (la que ingresarás en el frontend)
    password_plano = "admin123" 
    
    nuevo_usuario = Usuario(
        nombre_completo="Gabriel Villafuerte",
        correo=correo_super,
        rol=RolUsuario.SUPER_ADMIN,
        password_hash=get_password_hash(password_plano) # Encriptación real
    )
    
    db.add(nuevo_usuario)
    db.commit()
    print(f"Superusuario {correo_super} creado con éxito.")
    db.close()

if __name__ == "__main__":
    crear_super_usuario()