# Cambios para Envío de Email en Autorizaciones

## Archivo: src/app/api/viajes/autorizaciones/route.ts

### 1. Agregar imports al inicio del archivo

Después de las líneas 1-3, agregar:

```typescript
import { sendNegocioEmail, type NegocioEmailData } from "@/lib/email";
import { generateNegocioPDF } from "@/lib/pdf";
```

### 2. Modificar el método POST - Obtener datos del negocio

Después de la línea 112 (`const ecpIdEcp = viajeRows[0].ENT_IdEnt;`), agregar esta consulta para obtener todos los datos del negocio:

```typescript
// ============================================
// Obtener datos completos del negocio para email/PDF
// ============================================
const [negocioRows] = await connection.query<RowDataPacket[]>(
  `SELECT
    ent.ENT_Numero AS numeroNegocio,
    ent.ENT_Fecha AS fecha,
    ent.ENT_FechaVencimiento AS fechaVencimiento,
    ent.TER_RazonSocialTer AS proveedor,
    ent.LOC_NomLocalidadOrig AS procedencia,
    ent.LOC_NomLocalidadDest AS destino,
    ent.TVP_Caracteristicas AS articulo,
    ent.ENT_Tarifa AS tarifa,
    ent.ENT_CantCupos AS cupos,
    ecp.ECP_IdEcp AS ecpId,
    ter_chofer.TER_RazonSocialTer AS choferNombre,
    ter_chofer.TER_CUITTer AS choferCuit,
    tvp.TER_IDTercero AS transportistaId,
    ter_trans.TER_RazonSocialTer AS transportistaNombre,
    ter_trans.TER_CUITTer AS transportistaCuit,
    ter_trans.TER_EMailTer AS transportistaEmail,
    tvp.TVP_Patente AS patenteChasis,
    tvp.TVP_PatenteAcoplado AS patenteAcoplado,
    ven.VEN_NomVen AS vendedorNombre,
    -- Intermediarios de sige_icp_intcarpor
    (SELECT GROUP_CONCAT(TER_RazonSocialTerTic SEPARATOR ', ')
     FROM sige_icp_intcarpor
     WHERE ECP_IdEcp = ecp.ECP_IdEcp
       AND TIC_DescripcionTic = 'Intermediario'
     LIMIT 1) AS intermediarios
  FROM sige_ent_encnegtra ent
  INNER JOIN sige_ecp_enccarpor ecp ON ecp.ENT_IdEnt = ent.ENT_IdEnt
  LEFT JOIN sige_ter_tercero ter_chofer ON ter_chofer.TER_IDTercero = ?
  LEFT JOIN sige_tvp_terveipat tvp ON tvp.TER_IDTerceroAsoc = ?
  LEFT JOIN sige_ter_tercero ter_trans ON ter_trans.TER_IDTercero = tvp.TER_IDTercero
  LEFT JOIN sige_ven_vendedor ven ON ven.VEN_IDVendedor = ent.VEN_IdVendPostula
  WHERE ent.ENT_IdEnt = ?
  LIMIT 1`,
  [choferId, choferId, viajeId]
);

if (!Array.isArray(negocioRows) || negocioRows.length === 0) {
  console.warn('[DEBUG API] No se encontraron datos completos del negocio para email');
}

const negocioData = negocioRows?.[0];
```

### 3. Modificar el método POST - Enviar email después del commit

Reemplazar las líneas 212-227 (desde `console.log('[DEBUG API] Haciendo commit...')` hasta antes del `return NextResponse.json(response)`) con:

```typescript
console.log('[DEBUG API] Haciendo commit de la transacción...');
await connection.commit();
console.log('[DEBUG API] Commit exitoso');

// ============================================
// Enviar email con PDF después del commit exitoso
// ============================================
let emailSent = false;
let pdfGenerated = false;
let emailError = null;

if (negocioData) {
  try {
    console.log('[EMAIL] Iniciando generación de PDF y envío de email...');

    // Preparar datos para email/PDF
    const emailData: NegocioEmailData = {
      numeroNegocio: negocioData.numeroNegocio || String(viajeId),
      fecha: negocioData.fecha || new Date().toISOString(),
      fechaVencimiento: negocioData.fechaVencimiento || negocioData.fecha || new Date().toISOString(),
      proveedor: negocioData.proveedor || 'N/A',
      proveedorCuit: negocioData.proveedorCuit,
      procedencia: negocioData.procedencia || 'N/A',
      destino: negocioData.destino || 'N/A',
      intermediario: negocioData.intermediarios || undefined,
      transportista: negocioData.transportistaNombre || undefined,
      transportistaCuit: negocioData.transportistaCuit || undefined,
      chofer: negocioData.choferNombre || undefined,
      choferCuit: negocioData.choferCuit || undefined,
      patenteChasis: negocioData.patenteChasis || undefined,
      patenteAcoplado: negocioData.patenteAcoplado || undefined,
      articulo: negocioData.articulo || 'N/A',
      tarifa: Number(negocioData.tarifa) || 0,
      cupos: negocioData.cupos ? Number(negocioData.cupos) : undefined,
      vendedor: negocioData.vendedorNombre || undefined,
    };

    // Generar PDF
    const pdfBuffer = await generateNegocioPDF(emailData);
    pdfGenerated = true;
    console.log('[EMAIL] PDF generado exitosamente');

    // Preparar destinatarios (incluir email del transportista si existe)
    const emailResult = await sendNegocioEmail(emailData, pdfBuffer);

    if (emailResult.success) {
      emailSent = true;
      console.log('[EMAIL] Email enviado exitosamente:', emailResult.messageId);
    } else {
      emailError = emailResult.error;
      console.error('[EMAIL] Error al enviar email:', emailResult.error);
    }
  } catch (error: any) {
    emailError = error?.message || 'Error desconocido';
    console.error('[EMAIL] Error al generar PDF o enviar email:', error);
    // No lanzamos el error para no fallar toda la autorización
    // Solo lo registramos
  }
} else {
  console.warn('[EMAIL] No se pudo enviar email: datos del negocio incompletos');
}

const response = {
  success: true,
  message: "Autorizaciones guardadas exitosamente",
  data: { viajeId, choferId, estacionId, ecpIdEcp },
  renglones: {
    adelantos: adelantosIds,
    combustibles: combustiblesIds,
  },
  email: {
    sent: emailSent,
    pdfGenerated,
    error: emailError,
  },
};

console.log('[DEBUG API] Respuesta a enviar:', response);

return NextResponse.json(response);
```

## Resumen de los Cambios

1. **Imports**: Se agregan las funciones de email y PDF
2. **Consulta de datos**: Se obtienen todos los datos del negocio necesarios para el email/PDF incluyendo:
   - Datos del negocio (número, fechas, tarifa)
   - Proveedor
   - Ubicaciones (procedencia/destino)
   - Chofer y transportista
   - Vehículos (patentes)
   - Intermediarios
   - Vendedor

3. **Generación de PDF**: Se genera el PDF con todos los datos del negocio
4. **Envío de email**: Se envía el email con el PDF adjunto a:
   - Logística (EMAIL_LOGISTICA de .env)
   - Administración (EMAIL_ADMINISTRACION de .env)
   - Transportista (si tiene email en TER_EMailTer)

5. **Manejo de errores**: Si falla el envío de email o la generación del PDF, se registra pero no falla la autorización completa

## Notas Importantes

- El email se envía **después** del commit exitoso de la transacción
- Si falla el email, la autorización se guarda igual
- El response incluye información sobre si el email fue enviado exitosamente
- Los datos del transportista (incluyendo email) se obtienen de la relación chofer-transportista-vehículo
