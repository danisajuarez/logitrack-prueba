-- ===================================================================
-- MIGRACIÓN: Agregar campos de proveedor a la tabla viajes_nuevos
-- ===================================================================
-- IMPORTANTE: Ejecutar este script en la base de datos MySQL
-- para habilitar la funcionalidad de proveedores en los viajes
-- ===================================================================

-- Verificar si las columnas ya existen antes de agregarlas
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'viajes_nuevos' 
     AND COLUMN_NAME = 'proveedorId') = 0,
    'ALTER TABLE viajes_nuevos ADD COLUMN proveedorId INT NULL',
    'SELECT "La columna proveedorId ya existe" as mensaje'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
     WHERE TABLE_SCHEMA = DATABASE() 
     AND TABLE_NAME = 'viajes_nuevos' 
     AND COLUMN_NAME = 'proveedorNombre') = 0,
    'ALTER TABLE viajes_nuevos ADD COLUMN proveedorNombre VARCHAR(255) NULL',
    'SELECT "La columna proveedorNombre ya existe" as mensaje'
));
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar comentarios para documentar los nuevos campos
ALTER TABLE viajes_nuevos 
MODIFY COLUMN proveedorId INT NULL COMMENT 'ID del proveedor/transportista desde sige_ter_tercero',
MODIFY COLUMN proveedorNombre VARCHAR(255) NULL COMMENT 'Nombre del proveedor/transportista para evitar JOINs';

-- Verificar que las columnas se agregaron correctamente
SELECT 
    COLUMN_NAME as 'Columna',
    DATA_TYPE as 'Tipo',
    IS_NULLABLE as 'Permite NULL',
    COLUMN_COMMENT as 'Comentario'
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'viajes_nuevos' 
AND COLUMN_NAME IN ('proveedorId', 'proveedorNombre')
ORDER BY COLUMN_NAME;