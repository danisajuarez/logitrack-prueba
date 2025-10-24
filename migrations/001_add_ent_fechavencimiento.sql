-- Agregar campo ENT_FechaVencimiento a la tabla sige_ent_encnegtra
-- Este campo debe ser igual a la fecha del negocio (ENT_Fecha)

ALTER TABLE sige_ent_encnegtra
ADD COLUMN ENT_FechaVencimiento DATE NULL
COMMENT 'Fecha de vencimiento del negocio (igual a ENT_Fecha)';

-- Opcional: Actualizar registros existentes para que ENT_FechaVencimiento = ENT_Fecha
UPDATE sige_ent_encnegtra
SET ENT_FechaVencimiento = ENT_Fecha
WHERE ENT_FechaVencimiento IS NULL;
