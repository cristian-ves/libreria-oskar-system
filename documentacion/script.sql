-- Habilitar la extensión para generar UUIDs de forma nativa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. MÓDULO DE SUCURSALES Y UBICACIONES
-- ============================================================================

CREATE TABLE sucursales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) NOT NULL,
    direccion TEXT NOT NULL,
    telefono VARCHAR(20),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bodegas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_sucursal_bodega UNIQUE (sucursal_id, nombre)
);

-- ============================================================================
-- 2. MÓDULO DE USUARIOS Y ROLES (SEGURIDAD)
-- ============================================================================

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL, -- 'Administrador', 'Empleado', 'Usuario'
    descripcion TEXT,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rol_id UUID NOT NULL REFERENCES roles(id),
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Contraseñas cifradas
    dos_factores_activo BOOLEAN DEFAULT FALSE, -- Requisito 2FA
    token_recuperacion VARCHAR(255),
    activo BOOLEAN DEFAULT TRUE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. MÓDULO DE CATÁLOGO (PRODUCTOS Y RESEÑAS)
-- ============================================================================

CREATE TABLE autores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) UNIQUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE editoriales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(150) UNIQUE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE libros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    autor_id UUID REFERENCES autores(id) ON DELETE SET NULL,
    editorial_id UUID REFERENCES editoriales(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    isbn VARCHAR(20) UNIQUE,
    resena TEXT NOT NULL, -- Reseña informativa obligatoria para incentivar la compra
    imagen_url VARCHAR(255), -- URL provista por el cliente
    precio NUMERIC(10, 2) NOT NULL CHECK (precio >= 0),
    activo BOOLEAN DEFAULT TRUE, -- Permite descontinuar libros obsoletos del catálogo
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 4. MÓDULO DE INVENTARIO Y AUDITORÍA
-- ============================================================================

CREATE TABLE inventarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE CASCADE,
    bodega_id UUID NOT NULL REFERENCES bodegas(id) ON DELETE CASCADE,
    stock_actual INT NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo INT NOT NULL DEFAULT 5 CHECK (stock_minimo >= 0), -- Umbral para alertas automáticas
    ultima_auditoria TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_libro_bodega UNIQUE (libro_id, bodega_id)
);

CREATE TABLE tipo_movimientos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(50) UNIQUE NOT NULL, -- 'Ingreso', 'Salida', 'Ajuste Auditoria'
    descripcion TEXT
);

CREATE TABLE movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id), -- Empleado o Admin que registra
    tipo_movimiento_id UUID NOT NULL REFERENCES tipo_movimientos(id),
    cantidad INT NOT NULL CHECK (cantidad > 0),
    motivo_detalle TEXT, -- Razón del movimiento o auditoría
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. ÍNDICES OPTIMIZADOS PARA RENDIMIENTO (< 2 SEGUNDOS DE CARGA)
-- ============================================================================

-- Búsquedas rápidas en el catálogo público
CREATE INDEX idx_libros_titulo ON libros(titulo);
CREATE INDEX idx_libros_autor ON libros(autor_id);

-- Monitoreo rápido de alertas de stock mínimo
CREATE INDEX idx_inventario_alertas ON inventarios(stock_actual) WHERE (stock_actual <= stock_minimo);

-- Historial y auditoría eficientes
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento);

-- ============================================================================
-- 6. INSERCIÓN DE DATOS MAESTROS INICIALES
-- ============================================================================

INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Control total de inventario, usuarios, catálogo y reportes.'),
('Empleado', 'Encargado de registrar ingresos, salidas y auditorías de stock.'),
('Usuario', 'Clientes externos que navegan por el catálogo de productos.');

INSERT INTO tipo_movimientos (nombre, descripcion) VALUES
('Ingreso', 'Entrada de stock por compras o traspasos.'),
('Salida', 'Disminución de stock por venta presencial u obsolescencia.'),
('Ajuste Auditoria', 'Corrección manual de stock tras un conteo físico.');


-- ============================================================================
-- TRIGGER PARA AUTOMATIZAR EL CONTROL DE STOCK DESDE LOS MOVIMIENTOS
-- ============================================================================

CREATE OR REPLACE FUNCTION actualizar_stock_por_movimiento()
RETURNS TRIGGER AS $$
DECLARE
    v_tipo_movimiento VARCHAR(50);
BEGIN
    -- Obtener el nombre del tipo de movimiento (Ingreso, Salida, etc.)
    SELECT nombre INTO v_tipo_movimiento 
    FROM tipo_movimientos 
    WHERE id = NEW.tipo_movimiento_id;

    -- Si el movimiento es un INGRESO
    IF v_tipo_movimiento = 'Ingreso' THEN
        UPDATE inventarios 
        SET stock_actual = stock_actual + NEW.cantidad,
            ultima_auditoria = CURRENT_TIMESTAMP
        WHERE id = NEW.inventario_id;
        
    -- Si el movimiento es una SALIDA
    ELSIF v_tipo_movimiento = 'Salida' THEN
        -- Validar que no quede stock negativo
        IF (SELECT stock_actual FROM inventarios WHERE id = NEW.inventario_id) < NEW.cantidad THEN
            RAISE EXCEPTION 'Stock insuficiente para realizar esta salida.';
        END IF;

        UPDATE inventarios 
        SET stock_actual = stock_actual - NEW.cantidad,
            ultima_auditoria = CURRENT_TIMESTAMP
        WHERE id = NEW.inventario_id;
        
    -- Si es un AJUSTE DE AUDITORÍA (reemplaza el stock directamente)
    ELSIF v_tipo_movimiento = 'Ajuste Auditoria' THEN
        UPDATE inventarios 
        SET stock_actual = NEW.cantidad,
            ultima_auditoria = CURRENT_TIMESTAMP
        WHERE id = NEW.inventario_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear el trigger asociado a la tabla de movimientos
CREATE TRIGGER tg_movimientos_inventario_stock
AFTER INSERT ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION actualizar_stock_por_movimiento();

