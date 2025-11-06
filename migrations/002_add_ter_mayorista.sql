-- Agregar campo TER_Mayorista a la tabla sige_ter_tercero
-- Este campo indica si el tercero es mayorista o no
-- Valores: 'S' (Sí) o 'N' (No)

-- Verificar si la columna ya existe antes de agregarla
SET @column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sige_ter_tercero'
      AND COLUMN_NAME = 'TER_Mayorista'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE sige_ter_tercero ADD COLUMN TER_Mayorista CHAR(1) DEFAULT ''N'' COMMENT ''Mayorista: S (Si) o N (No)''',
    'SELECT ''La columna TER_Mayorista ya existe en sige_ter_tercero'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Opcional: Actualizar registros existentes con valor por defecto 'N'
UPDATE sige_ter_tercero
SET TER_Mayorista = 'N'
WHERE TER_Mayorista IS NULL;
