-- =============================================================
-- CREAR TABLA: viajes_nuevos
-- Uso: ejecutar en la base de datos configurada (DB_NAME)
-- Objetivo: almacenar viajes creados manualmente desde la app
-- =============================================================

CREATE TABLE IF NOT EXISTS viajes_nuevos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME NOT NULL,
  numero VARCHAR(32) NOT NULL,
  razonSocial VARCHAR(255) NOT NULL,
  origen VARCHAR(255),
  destino VARCHAR(255),
  articulo VARCHAR(255),
  equipo VARCHAR(255),
  cupos INT,
  cuposReservados INT,
  cuposPendientes INT,
  tarifa DECIMAL(12,2),
  vendedor VARCHAR(255),
  proveedorId INT NULL,
  proveedorNombre VARCHAR(255) NULL,
  INDEX idx_fecha (fecha),
  INDEX idx_numero (numero)
);
