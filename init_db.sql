-- ====================================================================
-- SCRIPT DE INICIALIZACIÓN - PTAR FES ACATLÁN
-- Ejecutar en una base de datos vacía.
-- ====================================================================

-- 1. Tabla de Usuarios (RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol VARCHAR(50) NOT NULL DEFAULT 'Lector',
    activo BOOLEAN DEFAULT TRUE
);

-- 2. Tabla de Zonas de Riego (Simulador Matemático)
-- NOTA: Se agregó UNIQUE a nombre_zona para evitar duplicados
CREATE TABLE IF NOT EXISTS zonas_riego (
    id_zona SERIAL PRIMARY KEY,
    nombre_zona VARCHAR(255) UNIQUE NOT NULL,
    demanda_agua NUMERIC(10, 4) DEFAULT 0.0,
    costo_distribucion NUMERIC(10, 4) DEFAULT 1.0
);

-- 3. Tabla Bitácora F02-PTAR-02 (Laboratorio - Química)
CREATE TABLE IF NOT EXISTS registros_muestreo (
    id_registro SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora TIME NOT NULL,
    no_muestra INTEGER NOT NULL,
    
    -- TEC-01
    tec_nivel FLOAT,
    tec_ph FLOAT,
    tec_dqo FLOAT,
    tec_t FLOAT,
    
    -- RAC-01
    rac_dqo FLOAT,
    rac_ph FLOAT,
    rac_t FLOAT,
    
    -- REC-01
    rec_ssed FLOAT,
    rec_od FLOAT,
    rec_ph FLOAT,
    rec_t FLOAT,
    
    -- CSC-01
    csc_dqo FLOAT,
    csc_ph FLOAT,
    csc_t FLOAT,
    
    observaciones TEXT,
    realizo VARCHAR(100) NOT NULL,
    id_usuario_captura INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- 4. Tabla Bitácora F01-PTAR-15 (Riego Deportivo)
CREATE TABLE IF NOT EXISTS registros_riego (
    id_registro SERIAL PRIMARY KEY,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_termino TIME NOT NULL,
    zona_regar VARCHAR(100) NOT NULL,
    
    -- Bombas
    bcm_03a FLOAT,
    bcm_03b FLOAT,
    bcm_03r FLOAT,
    
    -- Tanque TAC-01
    tac_inicio FLOAT NOT NULL,
    tac_termino FLOAT NOT NULL,
    
    volumen_usado FLOAT NOT NULL,
    observaciones TEXT,
    responsable VARCHAR(100) NOT NULL,
    id_usuario_captura INTEGER REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

-- Insertar un usuario Super Admin por defecto
-- La contraseña por defecto de este hash es: admin123
INSERT INTO usuarios (nombre_completo, email, hashed_password, rol, activo) 
VALUES ('Super Administrador', 'admin@fes.unam.mx', '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'Super Admin', TRUE)
ON CONFLICT (email) DO NOTHING;

-- Insertar Zonas de Riego base
INSERT INTO zonas_riego (nombre_zona, demanda_agua, costo_distribucion) VALUES 
('Prácticas', 100.0, 1.0),
('Estadio', 250.0, 1.5),
('Polvorín', 150.0, 1.2)
ON CONFLICT (nombre_zona) DO NOTHING;

ALTER TABLE usuarios RENAME COLUMN email TO correo;

ALTER TABLE usuarios RENAME COLUMN password TO password_hash;

-- Cambiamos el nombre de la contraseña
ALTER TABLE usuarios RENAME COLUMN hashed_password TO password_hash;

-- Agregamos la columna de fecha que le faltaba a tu SQL
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

DELETE FROM usuarios WHERE correo = 'admin@fes.unam.mx';

-- Insertamos el usuario fresco y limpio
INSERT INTO usuarios (nombre_completo, correo, password_hash, rol, fecha_creacion) 
VALUES (
    'Super Administrador', 
    'admin@fes.unam.mx', 
    '$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 
    'Super Admin',
    CURRENT_TIMESTAMP
);
UPDATE usuarios 
SET password_hash = '$2b$12$Q0.oo49zpAeAVMgmmw1Q/OSNYE8JZ3plHGJqWXxD7qyX5x3Xiki9G' 
WHERE correo = 'admin@fes.unam.mx';


CREATE TABLE IF NOT EXISTS auditoria (
    id_auditoria SERIAL PRIMARY KEY,
    fecha_hora_accion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    responsable VARCHAR(255) NOT NULL,
    accion_realizada VARCHAR(50) NOT NULL,
    tabla_afectada VARCHAR(50) NOT NULL,
    id_registro_afectado INTEGER,
    valor_anterior TEXT
);