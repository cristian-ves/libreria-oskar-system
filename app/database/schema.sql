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
    sucursal_id UUID NOT NULL REFERENCES sucursales(id) ON DELETE RESTRICT,
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
    dos_factores_secreto VARCHAR(128), -- Secreto TOTP cifrado con AES-256-GCM (formato v1, máx. 86 caracteres); compatible con cualquier app TOTP estándar
    token_recuperacion VARCHAR(255), -- SHA-256 hexadecimal del token de recuperación (nunca el token en claro)
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    dos_factores_intentos INTEGER NOT NULL DEFAULT 0, -- Fallos 2FA consecutivos (TOTP y respaldo)
    dos_factores_bloqueado_hasta TIMESTAMPTZ, -- Bloqueo temporal tras el máximo de fallos
    dos_factores_ultimo_paso BIGINT, -- Último paso TOTP aceptado (anti-reutilización)
    token_recuperacion_expira TIMESTAMPTZ, -- Vencimiento del enlace de recuperación (hora de la BD)
    password_cambiada_en TIMESTAMPTZ -- Último restablecimiento; invalida los JWT emitidos antes
);

-- Códigos de respaldo 2FA de un solo uso; solo se guarda su HMAC-SHA256.
CREATE TABLE IF NOT EXISTS codigos_respaldo_2fa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_hash VARCHAR(128) NOT NULL,
    usado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_codigos_respaldo_2fa_usuario_hash UNIQUE (usuario_id, codigo_hash)
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

CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS libros (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    autor_id UUID REFERENCES autores(id) ON DELETE SET NULL,
    editorial_id UUID REFERENCES editoriales(id) ON DELETE SET NULL,
    categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
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
    bodega_id UUID NOT NULL REFERENCES bodegas(id) ON DELETE RESTRICT,
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

-- Módulo de ventas: documento de venta y sus líneas.
-- El correlativo (numero) lo asigna la BD con una secuencia; puede haber huecos.
CREATE SEQUENCE IF NOT EXISTS ventas_numero_seq AS INTEGER;

CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero INTEGER NOT NULL UNIQUE DEFAULT nextval('ventas_numero_seq'),
    bodega_id UUID NOT NULL REFERENCES bodegas(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, -- Vendedor
    cliente_nombre VARCHAR(150) NOT NULL DEFAULT 'Consumidor final',
    cliente_nit VARCHAR(20),
    metodo_pago VARCHAR(20) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0), -- Monto fijo sobre el subtotal
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    notas TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'Completada',
    anulada_en TIMESTAMPTZ,
    anulada_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo_anulacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha de la venta
    CONSTRAINT ck_ventas_metodo_pago CHECK (metodo_pago IN ('Efectivo', 'Transferencia')),
    CONSTRAINT ck_ventas_total CHECK (total = subtotal - descuento),
    CONSTRAINT ck_ventas_estado CHECK (estado IN ('Completada', 'Anulada')),
    CONSTRAINT ck_ventas_anulacion CHECK (
        (estado = 'Anulada' AND anulada_en IS NOT NULL AND anulada_por IS NOT NULL)
        OR (estado = 'Completada' AND anulada_en IS NULL AND anulada_por IS NULL)
    )
);

ALTER SEQUENCE ventas_numero_seq OWNED BY ventas.numero;

CREATE TABLE IF NOT EXISTS venta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario > 0), -- Snapshot del precio al vender
    subtotal NUMERIC(10, 2) NOT NULL,
    CONSTRAINT ck_venta_detalles_subtotal CHECK (subtotal = cantidad * precio_unitario),
    CONSTRAINT uq_venta_libro UNIQUE (venta_id, libro_id)
);

CREATE TABLE IF NOT EXISTS movimientos_inventario (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inventario_id UUID NOT NULL REFERENCES inventarios(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, -- Usuario/Empleado que registra
    tipo_movimiento_id UUID NOT NULL REFERENCES tipo_movimientos(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad >= 0), -- Para ajuste puede ser 0; para ingreso/salida validado en trigger
    motivo_detalle TEXT, -- Justificación o motivo de la transacción o auditoría
    fecha_movimiento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    venta_id UUID REFERENCES ventas(id) ON DELETE RESTRICT -- Venta que originó el movimiento (si aplica)
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

-- Reportes diarios y entregas idempotentes de alertas de stock mínimo.
CREATE TABLE IF NOT EXISTS alertas_inventario_reportes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_local DATE NOT NULL UNIQUE,
    estado VARCHAR(24) NOT NULL DEFAULT 'procesando'
        CHECK (estado IN ('procesando', 'completado', 'sin_alertas', 'sin_administradores', 'fallido', 'incierto')),
    snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    cantidad_alertas INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_alertas >= 0),
    iniciado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finalizado_en TIMESTAMPTZ,
    error TEXT,
    lease_token UUID,
    lease_hasta TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alertas_inventario_entregas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporte_id UUID NOT NULL REFERENCES alertas_inventario_reportes(id) ON DELETE CASCADE,
    administrador_id UUID NOT NULL,
    correo_electronico VARCHAR(254) NOT NULL,
    nombre_administrador VARCHAR(150) NOT NULL,
    estado VARCHAR(24) NOT NULL DEFAULT 'pendiente'
        CHECK (estado IN ('pendiente', 'procesando', 'enviado', 'fallido', 'incierto')),
    intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
    reintento_seguro BOOLEAN NOT NULL DEFAULT FALSE,
    enviado_en TIMESTAMPTZ,
    error TEXT,
    lease_token UUID,
    lease_hasta TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_alertas_entrega_reporte_admin UNIQUE (reporte_id, administrador_id)
);

-- ============================================================================
-- 6. ÍNDICES OPTIMIZADOS (< 2 SEGUNDOS DE RESPUESTA)
-- ============================================================================

-- Búsquedas ultra rápidas en catálogo (título, autor, editorial, estado activo)
CREATE INDEX IF NOT EXISTS idx_libros_titulo ON libros(titulo);
CREATE INDEX IF NOT EXISTS idx_libros_isbn ON libros(isbn);
CREATE INDEX IF NOT EXISTS idx_libros_autor ON libros(autor_id);
CREATE INDEX IF NOT EXISTS idx_libros_editorial ON libros(editorial_id);
CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros(categoria_id);
CREATE INDEX IF NOT EXISTS idx_libros_catalogo_activo ON libros(activo, precio);

-- Monitoreo instantáneo de alertas de stock mínimo (Índice Parcial Condicional)
-- Acelera drásticamente la consulta: SELECT * FROM inventarios WHERE stock_actual <= stock_minimo;
CREATE INDEX IF NOT EXISTS idx_inventario_alertas ON inventarios(stock_actual, stock_minimo) 
WHERE (stock_actual <= stock_minimo);

-- Optimización de consultas de stock por bodega y libro
CREATE INDEX IF NOT EXISTS idx_inventarios_bodega ON inventarios(bodega_id);
CREATE INDEX IF NOT EXISTS idx_inventarios_libro ON inventarios(libro_id);
CREATE INDEX IF NOT EXISTS idx_alertas_entregas_pendientes
    ON alertas_inventario_entregas (reporte_id, estado, lease_hasta);
CREATE INDEX IF NOT EXISTS idx_alertas_reportes_estado_fecha
    ON alertas_inventario_reportes (estado, fecha_local DESC);

-- Optimización de búsquedas de usuarios por correo (Auth y Login)
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_token_recuperacion ON usuarios (token_recuperacion)
WHERE token_recuperacion IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_codigos_respaldo_2fa_usuario_id ON codigos_respaldo_2fa(usuario_id);

-- Auditoría, trazabilidad y reportes de movimientos por fecha
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos_inventario(fecha_movimiento DESC);
CREATE INDEX IF NOT EXISTS idx_movimientos_inventario_id ON movimientos_inventario(inventario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos_inventario(usuario_id);

-- Ventas: listados y reportes por fecha, estado y vendedor; trazabilidad venta-movimientos
CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado_fecha ON ventas(estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_libro_id ON venta_detalles(libro_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_venta_id ON movimientos_inventario(venta_id) WHERE venta_id IS NOT NULL;

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

-- Categorías temáticas de libros
INSERT INTO categorias (nombre) VALUES
('Derecho Penal'),
('Derecho Civil'),
('Derecho Constitucional'),
('Derecho Mercantil'),
('Literatura'),
('Otros')
ON CONFLICT (nombre) DO NOTHING;

-- Categorías adicionales equivalentes a la migración 003_categorias_adicionales.sql
INSERT INTO categorias (nombre) VALUES
('Derecho Laboral'),
('Derecho Administrativo'),
('Derecho Procesal'),
('Derecho Tributario'),
('Derecho Notarial y Registral'),
('Derecho Internacional'),
('Ficción y Novela'),
('Cuento y Relatos'),
('Poesía y Teatro'),
('Ensayo y Filosofía'),
('Historia'),
('Infantil y Juvenil'),
('Ciencia y Tecnología'),
('Autoayuda y Desarrollo Personal')
ON CONFLICT (nombre) DO NOTHING;
