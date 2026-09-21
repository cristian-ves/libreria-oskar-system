-- ============================================================================
-- BASE DE DATOS: Librería Oskar
-- MOTOR: PostgreSQL (14+)
-- ARQUITECTO: database-architect
-- DESCRIPCIÓN: Esquema multi-sucursal con llaves primarias UUID v4, 
--              control transaccional de stock mediante triggers PL/pgSQL,
--              seguridad RBAC + 2FA, e índices optimizados (< 2 segundos).
-- ============================================================================

-- Habilitar extensión para generación de UUIDs nativos v4
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- Alternativa nativa en PostgreSQL 13+: pgcrypto
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. MÓDULO MULTI-SUCURSAL Y BODEGAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bodegas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sucursal_bodega UNIQUE (sucursal_id, nombre)
);

-- ============================================================================
-- 2. MÓDULO DE SEGURIDAD, ROLES Y AUTENTICACIÓN (RBAC + 2FA)
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL, -- 'Administrador', 'Empleado', 'Usuario'
    descripcion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol_id UUID NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Contraseñas cifradas con bcrypt/argon2
    dos_factores_activo BOOLEAN NOT NULL DEFAULT FALSE, -- Requisito 2FA
    dos_factores_secreto VARCHAR(128), -- Clave secreta TOTP en base32 (para Speakeasy/Google Authenticator)
    token_recuperacion VARCHAR(255),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. MÓDULO DE CATÁLOGO (AUTORES, EDITORIALES, LIBROS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) UNIQUE NOT NULL,
    biografia TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS editoriales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) UNIQUE NOT NULL,
    pais VARCHAR(100),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS libros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    autor_id UUID REFERENCES autores(id) ON DELETE SET NULL,
    editorial_id UUID REFERENCES editoriales(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    resena TEXT NOT NULL, -- Reseña descriptiva obligatoria para incentivar la compra
    imagen_url TEXT,      -- URL provista o portada externa (soporta URLs largas de Google Books)
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE, -- Permite descontinuar libros obsoletos del catálogo
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. MÓDULO DE INVENTARIO Y CONTROL DE STOCK
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    bodega_id UUID NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
    stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0), -- Umbral para alertas automáticas
    ultima_auditoria TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_libro_bodega UNIQUE (libro_id, bodega_id)
);

CREATE TABLE IF NOT EXISTS tipo_movimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL, -- 'Ingreso', 'Salida', 'Ajuste' (o 'Ajuste Auditoria')
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, -- Usuario/Empleado que registra
    tipo_movimiento_id UUID NOT NULL REFERENCES tipo_movimientos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad >= 0), -- Para ajuste puede ser 0; para ingreso/salida validado en trigger
    motivo_detalle TEXT, -- Justificación o motivo de la transacción o auditoría
    fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. TRIGGER PL/pgSQL: ACTUALIZACIÓN AUTOMÁTICA Y ATÓMICA DE STOCK
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_actualizar_stock_por_movimiento()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_nombre VARCHAR(50);
    v_stock_previo INT;
BEGIN
    -- Obtener el nombre del tipo de movimiento
    SELECT nombre INTO v_tipo_nombre
    FROM tipo_movimientos
    WHERE id = NEW.tipo_movimiento_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tipo de movimiento inválido o no encontrado (ID: %)', NEW.tipo_movimiento_id;
    END IF;

    -- Bloqueo pesimista de la fila de inventario para evitar race conditions en entornos concurrentes
    SELECT stock_actual INTO v_stock_previo
    FROM inventarios
    WHERE id = NEW.inventario_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'El registro de inventario indicado (ID: %) no existe.', NEW.inventario_id;
    END IF;

    -- Caso 1: INGRESO (+ stock)
    IF v_tipo_nombre = 'Ingreso' THEN
        IF NEW.cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad para un movimiento de Ingreso debe ser mayor a 0. Cantidad recibida: %', NEW.cantidad;
        END IF;

        UPDATE inventarios
        SET stock_actual = stock_actual + NEW.cantidad,
            ultima_auditoria = CURRENT_TIMESTAMP
        WHERE id = NEW.inventario_id;

    -- Caso 2: SALIDA (- stock con validación de no negatividad)
    ELSIF v_tipo_nombre = 'Salida' THEN
        IF NEW.cantidad <= 0 THEN
            RAISE EXCEPTION 'La cantidad para un movimiento de Salida debe ser mayor a 0. Cantidad recibida: %', NEW.cantidad;
        END IF;

        IF v_stock_previo < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para realizar la salida. Stock disponible: %, Cantidad solicitada: %', 
                            v_stock_previo, NEW.cantidad;
        END IF;

        UPDATE inventarios
        SET stock_actual = stock_actual - NEW.cantidad,
            ultima_auditoria = CURRENT_TIMESTAMP
        WHERE id = NEW.inventario_id;

    -- Caso 3: AJUSTE / AJUSTE AUDITORÍA (Establece directamente el stock al valor verificado)
    ELSIF v_tipo_nombre IN ('Ajuste', 'Ajuste Auditoria') THEN
        IF NEW.cantidad < 0 THEN
            RAISE EXCEPTION 'El stock resultante en un Ajuste no puede ser negativo. Cantidad recibida: %', NEW.cantidad;
        END IF;

        UPDATE inventarios
        SET stock_actual = NEW.cantidad,
            ultima_auditoria = CURRENT_TIMESTAMP
        WHERE id = NEW.inventario_id;

    ELSE
        RAISE EXCEPTION 'Operación de movimiento no soportada: %', v_tipo_nombre;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Asociar el trigger a la tabla movimientos_inventario
DROP TRIGGER IF EXISTS tg_movimientos_inventario_stock ON movimientos_inventario;
CREATE TRIGGER tg_movimientos_inventario_stock
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION fn_actualizar_stock_por_movimiento();

-- ============================================================================
-- 6. ÍNDICES OPTIMIZADOS (< 2 SEGUNDOS DE RESPUESTA)
-- ============================================================================

-- Búsquedas ultra rápidas en catálogo (título, autor, editorial, estado activo)
CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo);
CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn);
CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros(autor_id);
CREATE INDEX IF NOT EXISTS idx_libros_editorial ON libros(editorial_id);
CREATE INDEX IF NOT EXISTS idx_libros_catalogo_activo ON libros(activo, precio);

-- Monitoreo instantáneo de alertas de stock mínimo (Índice Parcial Condicional)
-- Acelera drásticamente la consulta: SELECT * FROM inventarios WHERE stock_actual <= stock_minimo;
CREATE INDEX IF NOT EXISTS idx_inventario_alertas ON inventarios(stock_actual, stock_minimo) 
WHERE (stock_actual <= stock_minimo);

-- Optimización de consultas de stock por bodega y libro
CREATE INDEX IF NOT EXISTS idx_inventarios_bodega ON inventarios(bodega_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_libro ON inventarios(libro_id);

-- Optimización de búsquedas de usuarios por correo (Auth y Login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Auditoría, trazabilidad y reportes de movimientos por fecha
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_id ON movimientos_inventario(inventario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos_inventario(usuario_id);

-- ============================================================================
-- 7. DATOS MAESTROS Y SEMILLAS INICIALES (SEEDS)
-- ============================================================================

-- Roles del sistema
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Control total de inventario, usuarios, catálogo, reportes y configuración multi-sucursal.'),
('Empleado', 'Encargado de registrar ingresos, salidas, conteos físicos y auditorías de stock.'),
('Usuario', 'Clientes y público externo que navegan y consultan el catálogo de libros.')
ON CONFLICT (nombre) DO NOTHING;

-- Tipos de movimientos reconocidos por el trigger
INSERT INTO tipo_movimientos (nombre, descripcion) VALUES
('Ingreso', 'Entrada de stock por compras de mercancía a proveedores o transferencias.'),
('Salida', 'Disminución de stock por venta a cliente presencial u obsolescencia/daño.'),
('Ajuste', 'Corrección de inventario tras auditoría o recuento físico directo.')
ON CONFLICT (nombre) DO NOTHING;
