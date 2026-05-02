-- ============================================================
-- Cafetín DB — Estructura de tablas
-- Documentación de referencia. Este archivo NO se ejecuta
-- en ningún lado. La base de datos la genera Room
-- automáticamente cuando se instala la app Android.
-- ============================================================


-- Clientes registrados en el cafetín
CREATE TABLE personas (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre       TEXT    NOT NULL,
    descripcion  TEXT    NOT NULL DEFAULT '',
    enviadoHasta INTEGER NOT NULL DEFAULT 0,
    -- enviadoHasta: timestamp en ms hasta el cual la persona
    -- tiene estado "Enviado". 0 significa sin ese estado.
    UNIQUE (nombre, descripcion)
);


-- Fiados y pagos por persona
CREATE TABLE movimientos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    personaId  INTEGER NOT NULL,
    tipo       TEXT    NOT NULL, -- 'FIADO' o 'PAGO'
    monto      INTEGER NOT NULL, -- en centavos (ej: 150 = S/ 1.50)
    fecha      INTEGER NOT NULL, -- timestamp en milisegundos
    nota       TEXT    NOT NULL DEFAULT '',
    FOREIGN KEY (personaId) REFERENCES personas(id) ON DELETE CASCADE
);
CREATE INDEX idx_movimientos_personaId ON movimientos(personaId);


-- Categorías del catálogo de productos
CREATE TABLE catalogo_categorias (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT    NOT NULL,
    emoji  TEXT    NOT NULL,
    orden  INTEGER NOT NULL DEFAULT 0
);


-- Productos del catálogo por categoría
CREATE TABLE catalogo_productos (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    categoriaId    INTEGER NOT NULL,
    nombre         TEXT    NOT NULL,
    montoCentavos  INTEGER NOT NULL, -- en centavos (ej: 150 = S/ 1.50)
    orden          INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (categoriaId) REFERENCES catalogo_categorias(id) ON DELETE CASCADE
);
CREATE INDEX idx_productos_categoriaId ON catalogo_productos(categoriaId);