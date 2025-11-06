# Instrucciones de Instalación - Funcionalidad de Email y PDF

## 1. Instalar Dependencias

Ejecutar en la terminal:

```bash
npm install resend puppeteer
```

O si usas yarn:

```bash
yarn add resend puppeteer
```

## 2. Configurar Variables de Entorno

Crear o actualizar el archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Resend API Key (obtener desde https://resend.com/api-keys)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxx

# Emails destino fijos
EMAIL_LOGISTICA=logistica@tuempresa.com
EMAIL_ADMINISTRACION=administracion@tuempresa.com

# Email "from" (debe ser un dominio verificado en Resend)
EMAIL_FROM=notificaciones@tudominio.com
```

## 3. Aplicar Migraciones SQL

Ejecutar el script de migración en tu base de datos MySQL:

```bash
mysql -h 190.188.150.107 -P 3307 -u tu_usuario -p lt < migrations/001_add_ent_fechavencimiento.sql
```

## 4. Aplicar Cambios en Código

Revisar y aplicar los cambios documentados en:
- `CAMBIOS_PENDIENTES.md` - Para POST /viajes
- `CAMBIOS_VALIDACION_POSTULACION.md` - Para validación de eliminación de postulaciones

## 5. Verificar Tabla sige_dnt_detnegtra

Asegúrate de que la tabla `sige_dnt_detnegtra` existe con la siguiente estructura:

```sql
CREATE TABLE IF NOT EXISTS sige_dnt_detnegtra (
  DNT_IdDnt INT AUTO_INCREMENT PRIMARY KEY,
  ENT_IdEnt INT NOT NULL,
  DNT_Renglon INT NOT NULL DEFAULT 1,
  ART_IdArticulo VARCHAR(20),
  DNT_Detalle VARCHAR(255),
  DNT_Cosecha VARCHAR(50),
  FOREIGN KEY (ENT_IdEnt) REFERENCES sige_ent_encnegtra(ENT_IdEnt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

## 6. Reiniciar Servidor de Desarrollo

Después de instalar las dependencias y aplicar los cambios:

```bash
npm run dev
```

O con yarn:

```bash
yarn dev
```

## 7. Probar la Funcionalidad

1. Crear un nuevo viaje
2. Postular un chofer
3. Crear una autorización de carga
4. Verificar que se envíe el email con el PDF adjunto

## Notas Importantes

- **Puppeteer** descargará Chromium automáticamente (~170MB). Esto es normal.
- Asegúrate de tener suficiente espacio en disco.
- El campo `TER_Mayorista` en la tabla `terceros` debe agregarse si aún no existe:
  ```sql
  ALTER TABLE sige_ter_tercero ADD COLUMN TER_Mayorista CHAR(1) DEFAULT 'N' COMMENT 'Mayorista: S o N';
  ```
