-- Crear tabla sige_dnt_detnegtra si no existe
-- Esta tabla almacena el detalle de los negocios/negociaciones

CREATE TABLE IF NOT EXISTS sige_dnt_detnegtra (
  DNT_IdDnt INT AUTO_INCREMENT PRIMARY KEY COMMENT 'ID interno del detalle',
  ENT_IdEnt INT NOT NULL COMMENT 'FK a sige_ent_encnegtra - ID del encabezado del negocio',
  DNT_Renglon INT NOT NULL DEFAULT 1 COMMENT 'Número de renglón del detalle',
  ART_IdArticulo VARCHAR(20) COMMENT 'ID del artículo',
  DNT_Detalle VARCHAR(255) COMMENT 'Descripción del detalle',
  DNT_Cosecha VARCHAR(50) DEFAULT '' COMMENT 'Cosecha (puede estar en blanco)',

  -- Indices
  INDEX idx_ent_idEnt (ENT_IdEnt),
  INDEX idx_articulo (ART_IdArticulo),

  -- Foreign key constraint (si existe la tabla padre)
  CONSTRAINT fk_dnt_ent FOREIGN KEY (ENT_IdEnt)
    REFERENCES sige_ent_encnegtra(ENT_IdEnt)
    ON DELETE CASCADE
    ON UPDATE CASCADE

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Detalle de negociaciones de transporte';

-- Verificar si la tabla se creó correctamente
SELECT
    'Tabla sige_dnt_detnegtra verificada/creada exitosamente' AS mensaje,
    COUNT(*) AS cantidad_registros
FROM sige_dnt_detnegtra;
