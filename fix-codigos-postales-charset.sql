-- Cambiar charset del campo TER_CodPostalTer a UTF8MB4
-- Esto asegura compatibilidad total con cualquier carácter

-- IMPORTANTE: Hacer backup antes de ejecutar

-- Cambiar el campo a UTF8MB4
ALTER TABLE sige_ter_tercero
MODIFY COLUMN TER_CodPostalTer VARCHAR(15)
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
NULL;

-- Verificar el cambio
SHOW FULL COLUMNS FROM sige_ter_tercero WHERE Field = 'TER_CodPostalTer';
