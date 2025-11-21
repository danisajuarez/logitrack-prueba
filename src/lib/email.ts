import { Resend } from "resend";
import "server-only";

// Normaliza variables de entorno para aceptar EMAIL_* o MAIL_*
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.MAIL_FROM;
const EMAIL_LOGISTICA =
  process.env.EMAIL_LOGISTICA || process.env.MAIL_LOGISTICA;
const EMAIL_ADMINISTRACION =
  process.env.EMAIL_ADMINISTRACION ||
  process.env.MAIL_ADMIN ||
  process.env.MAIL_ADMINISTRACION;
const EMAIL_TEST = process.env.MAIL_TEST || process.env.EMAIL_TEST; // opcional para fallback local

export interface NegocioEmailData {
  // Datos del negocio
  numeroNegocio: string;
  fecha: string;
  fechaVencimiento: string;

  // Proveedor
  proveedor: string;
  proveedorCuit?: string;

  // Ubicaciones
  procedencia: string;
  destino: string;

  // Transporte
  intermediario?: string;
  transportista?: string;
  transportistaCuit?: string;
  chofer?: string;
  choferCuit?: string;

  // Vehículos
  patenteChasis?: string;
  patenteAcoplado?: string;

  // Artículo y tarifa
  articulo: string;
  tarifa: number;

  // Opcional: datos adicionales
  cupos?: number;
  vendedor?: string;
}

/**
 * Genera el HTML del email para el resumen del negocio
 */
export function generateNegocioHTML(data: NegocioEmailData): string {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nuevo Negocio - ${data.numeroNegocio}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    .header {
      border-bottom: 3px solid #2563eb;
      padding-bottom: 15px;
      margin-bottom: 25px;
    }
    h1 {
      color: #1e40af;
      margin: 0 0 10px 0;
      font-size: 24px;
    }
    .numero {
      color: #64748b;
      font-size: 14px;
      margin: 0;
    }
    .section {
      margin-bottom: 25px;
    }
    .section-title {
      font-weight: 600;
      color: #1e40af;
      font-size: 16px;
      margin-bottom: 12px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e2e8f0;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 140px 1fr;
      gap: 10px;
    }
    .label {
      font-weight: 600;
      color: #475569;
    }
    .value {
      color: #1e293b;
    }
    .tarifa {
      background-color: #dbeafe;
      padding: 15px;
      border-radius: 6px;
      margin-top: 20px;
    }
    .tarifa-value {
      font-size: 24px;
      font-weight: 700;
      color: #1e40af;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Nuevo Negocio Registrado</h1>
      <p class="numero">Negocio N° ${data.numeroNegocio}</p>
    </div>

    <div class="section">
      <div class="section-title">📅 Fechas</div>
      <div class="info-grid">
        <span class="label">Fecha:</span>
        <span class="value">${formatDate(data.fecha)}</span>
        <span class="label">Vencimiento:</span>
        <span class="value">${formatDate(data.fechaVencimiento)}</span>
      </div>
    </div>

    <div class="section">
      <div class="section-title">🏢 Proveedor</div>
      <div class="info-grid">
        <span class="label">Razón Social:</span>
        <span class="value">${data.proveedor}</span>
        ${
          data.proveedorCuit
            ? `
        <span class="label">CUIT:</span>
        <span class="value">${data.proveedorCuit}</span>
        `
            : ""
        }
      </div>
    </div>

    <div class="section">
      <div class="section-title">📍 Ubicaciones</div>
      <div class="info-grid">
        <span class="label">Procedencia:</span>
        <span class="value">${data.procedencia}</span>
        <span class="label">Destino:</span>
        <span class="value">${data.destino}</span>
      </div>
    </div>

    ${
      data.intermediario || data.transportista || data.chofer
        ? `
    <div class="section">
      <div class="section-title">🚛 Transporte</div>
      <div class="info-grid">
        ${
          data.intermediario
            ? `
        <span class="label">Intermediario:</span>
        <span class="value">${data.intermediario}</span>
        `
            : ""
        }
        ${
          data.transportista
            ? `
        <span class="label">Transportista:</span>
        <span class="value">${data.transportista}</span>
        `
            : ""
        }
        ${
          data.transportistaCuit
            ? `
        <span class="label">CUIT Trans.:</span>
        <span class="value">${data.transportistaCuit}</span>
        `
            : ""
        }
        ${
          data.chofer
            ? `
        <span class="label">Chofer:</span>
        <span class="value">${data.chofer}</span>
        `
            : ""
        }
        ${
          data.choferCuit
            ? `
        <span class="label">CUIT Chofer:</span>
        <span class="value">${data.choferCuit}</span>
        `
            : ""
        }
      </div>
    </div>
    `
        : ""
    }

    ${
      data.patenteChasis || data.patenteAcoplado
        ? `
    <div class="section">
      <div class="section-title">🚚 Vehículos</div>
      <div class="info-grid">
        ${
          data.patenteChasis
            ? `
        <span class="label">Patente Camión:</span>
        <span class="value">${data.patenteChasis}</span>
        `
            : ""
        }
        ${
          data.patenteAcoplado
            ? `
        <span class="label">Patente Acoplado:</span>
        <span class="value">${data.patenteAcoplado}</span>
        `
            : ""
        }
      </div>
    </div>
    `
        : ""
    }

    <div class="section">
      <div class="section-title">📦 Artículo</div>
      <div class="info-grid">
        <span class="label">Descripción:</span>
        <span class="value">${data.articulo}</span>
        ${
          data.cupos
            ? `
        <span class="label">Cupos:</span>
        <span class="value">${data.cupos}</span>
        `
            : ""
        }
      </div>
    </div>

    <div class="tarifa">
      <div class="label">Tarifa</div>
      <div class="tarifa-value">${formatCurrency(data.tarifa)}</div>
    </div>

    ${
      data.vendedor
        ? `
    <div class="section" style="margin-top: 20px;">
      <div class="info-grid">
        <span class="label">Vendedor:</span>
        <span class="value">${data.vendedor}</span>
      </div>
    </div>
    `
        : ""
    }

    <div class="footer">
      <p>Este es un correo automático generado por el sistema de gestión de negocios.</p>
      <p>Por favor no responder a este correo.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Envía un email con el resumen del negocio
 */
export async function sendNegocioEmail(
  data: NegocioEmailData,
  pdfBuffer?: Buffer
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Validar que exista la API key
    if (!RESEND_API_KEY) {
      throw new Error(
        "RESEND_API_KEY no está configurada en las variables de entorno"
      );
    }

    if (!EMAIL_FROM) {
      throw new Error(
        "EMAIL_FROM no está configurada en las variables de entorno"
      );
    }

    // Preparar lista de destinatarios
    const to: string[] = [];

    // Agregar emails fijos
    if (EMAIL_LOGISTICA) {
      to.push(EMAIL_LOGISTICA);
    }
    if (EMAIL_ADMINISTRACION) {
      to.push(EMAIL_ADMINISTRACION);
    }

    // Fallback de prueba local si no hay destinatarios configurados
    if (to.length === 0 && EMAIL_TEST) {
      to.push(EMAIL_TEST);
    }

    // TODO: Agregar email del transportista si tiene (desde TER_EMailTer)
    // Esto se debe pasar como parámetro adicional cuando se llame a esta función

    if (to.length === 0) {
      throw new Error("No hay destinatarios configurados para el email");
    }

    // Generar HTML del email
    const htmlContent = generateNegocioHTML(data);

    // Preparar attachments
    const attachments = pdfBuffer
      ? [
          {
            filename: `negocio-${data.numeroNegocio}.pdf`,
            content: pdfBuffer.toString("base64"),
          },
        ]
      : undefined;

    // Enviar email (instancia diferida)
    const resend = new Resend(RESEND_API_KEY);
    const response = await resend.emails.send({
      from: EMAIL_FROM!,
      to,
      subject: `Nuevo Negocio Registrado - N° ${data.numeroNegocio}`,
      html: htmlContent,
      attachments,
    });

    if (response.error) {
      console.error("Error al enviar email:", response.error);
      return {
        success: false,
        error: response.error.message || "Error desconocido al enviar email",
      };
    }

    console.log("Email enviado exitosamente:", response.data?.id);

    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error: any) {
    console.error("Error al enviar email de negocio:", error);
    return {
      success: false,
      error: error?.message || "Error desconocido al enviar email",
    };
  }
}

/**
 * Función auxiliar para agregar email del transportista a la lista de destinatarios
 */
export function addTransportistaEmail(
  to: string[],
  transportistaEmail?: string
): string[] {
  if (transportistaEmail && transportistaEmail.includes("@")) {
    return [...to, transportistaEmail];
  }
  return to;
}

// ===== TODAS LAS FUNCIONES DE EMAIL AHORA USAN RESEND =====

interface EmailChoferPostulado {
  to: string; // Email del chofer
  choferNombre: string;
  viajeNumero: string;
  fecha: string;
  origen: string;
  destino: string;
  razonSocial: string;
  patChasis: string;
  patAcoplado: string | null;
}

/**
 * Envía email de notificación cuando un chofer es postulado a un viaje
 */
export async function enviarEmailChoferPostulado(data: EmailChoferPostulado) {
  const {
    to,
    choferNombre,
    viajeNumero,
    fecha,
    origen,
    destino,
    razonSocial,
    patChasis,
    patAcoplado,
  } = data;

  const fechaFormateada = new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Postulación a Viaje</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: #2563eb;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">LogiTrack</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">¡Hola ${choferNombre}!</h2>

              <p style="color: #4b5563; line-height: 1.6; margin: 20px 0;">
                Te confirmamos que has sido <strong style="color: #2563eb;">postulado exitosamente</strong> para el siguiente viaje:
              </p>

              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;">
                          <strong>Viaje #</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${viajeNumero}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Fecha</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${fechaFormateada}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Cliente</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${razonSocial}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Origen</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${origen}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Destino</strong>
                        </td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">
                          ${destino}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Chasis</strong>
                        </td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-family: monospace;">
                          ${patChasis}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">
                          <strong>Acoplado</strong>
                        </td>
                        <td style="padding: 8px 0; color: #3b82f6; font-size: 14px; font-family: monospace;">
                          ${patAcoplado || "Sin acoplado"}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="color: #4b5563; line-height: 1.6; margin: 20px 0;">
                Por favor, coordina con la oficina para confirmar los detalles del viaje.
              </p>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Este es un correo automático, por favor no respondas a este mensaje.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} LogiTrack. Todos los derechos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const textContent = `
Hola ${choferNombre},

Te confirmamos que has sido postulado exitosamente para el siguiente viaje:

Viaje #: ${viajeNumero}
Fecha: ${fechaFormateada}
Cliente: ${razonSocial}
Origen: ${origen}
Destino: ${destino}
Chasis: ${patChasis}
Acoplado: ${patAcoplado || "Sin acoplado"}

Por favor, coordina con la oficina para confirmar los detalles del viaje.

---
Este es un correo automático, por favor no respondas a este mensaje.

© ${new Date().getFullYear()} LogiTrack. Todos los derechos reservados.
  `.trim();

  try {
    if (!RESEND_API_KEY || !EMAIL_FROM) {
      console.error("[EMAIL] Faltan credenciales de Resend");
      throw new Error("Configuración de email incompleta");
    }

    const resend = new Resend(RESEND_API_KEY);
    const response = await resend.emails.send({
      from: `LogiTrack <${EMAIL_FROM}>`,
      to,
      subject: `Postulación confirmada - Viaje #${viajeNumero}`,
      html: htmlContent,
    });

    if (response.error) {
      console.error("[EMAIL] Error al enviar:", response.error);
      throw new Error(response.error.message);
    }

    console.log("[EMAIL] Email enviado exitosamente:", {
      messageId: response.data?.id,
      to,
      viaje: viajeNumero,
    });

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error("[EMAIL] Error al enviar email:", error);
    throw error;
  }
}

/**
 * Envía un email de prueba para verificar la configuración
 */
export async function enviarEmailPrueba(to: string) {
  try {
    if (!RESEND_API_KEY || !EMAIL_FROM) {
      throw new Error("Configuración de email incompleta");
    }

    const resend = new Resend(RESEND_API_KEY);
    const response = await resend.emails.send({
      from: `LogiTrack <${EMAIL_FROM}>`,
      to,
      subject: "Prueba de configuración - LogiTrack",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">✅ Configuración exitosa</h2>
          <p>Este es un email de prueba para verificar que la configuración de Resend está funcionando correctamente.</p>
          <p>Si recibiste este mensaje, significa que el sistema de emails está operativo.</p>
        </div>
      `,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log("[EMAIL] Email de prueba enviado:", response.data?.id);
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error("[EMAIL] Error al enviar email de prueba:", error);
    throw error;
  }
}
interface EmailVendedorPostulacion {
  to: string; // Email del vendedor
  vendedorNombre: string;
  choferNombre: string;
  viajeNumero: string;
  fecha: string;
  origen: string;
  destino: string;
  razonSocial: string;
  patChasis: string;
  patAcoplado: string | null;
}

/**
 * Envía email de notificación al vendedor cuando postula un chofer a un viaje
 */
export async function enviarEmailVendedorPostulacion(
  data: EmailVendedorPostulacion
) {
  const {
    to,
    vendedorNombre,
    choferNombre,
    viajeNumero,
    fecha,
    origen,
    destino,
    razonSocial,
    patChasis,
    patAcoplado,
  } = data;

  const fechaFormateada = new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chofer Postulado</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 20px 0; text-align: center; background-color: #2563eb;">
        <h1 style="color: #ffffff; margin: 0; font-size: 24px;">LogiTrack</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1f2937; margin-top: 0; font-size: 20px;">¡Hola ${vendedorNombre}!</h2>
              <p style="color: #4b5563; line-height: 1.6; margin: 20px 0;">
                Has postulado exitosamente al chofer <strong style="color: #2563eb;">${choferNombre}</strong> para el siguiente viaje:
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0; background-color: #f9fafb; border-radius: 6px; overflow: hidden;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px; width: 140px;"><strong>Viaje #</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${viajeNumero}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Fecha</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${fechaFormateada}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Cliente</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${razonSocial}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Origen</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${origen}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Destino</strong></td>
                        <td style="padding: 8px 0; color: #1f2937; font-size: 14px;">${destino}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Chofer</strong></td>
                        <td style="padding: 8px 0; color: #2563eb; font-size: 14px; font-weight: 600;">${choferNombre}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Chasis</strong></td>
                        <td style="padding: 8px 0; color: #10b981; font-size: 14px; font-family: monospace;">${patChasis}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; color: #6b7280; font-size: 14px;"><strong>Acoplado</strong></td>
                        <td style="padding: 8px 0; color: #3b82f6; font-size: 14px; font-family: monospace;">${
                          patAcoplado || "Sin acoplado"
                        }</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="color: #4b5563; line-height: 1.6; margin: 20px 0;">
                Recordá coordinar con el chofer para confirmar los detalles del viaje.
              </p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                  Este es un correo automático, por favor no respondas a este mensaje.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; margin: 0;">
          © ${new Date().getFullYear()} LogiTrack. Todos los derechos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  try {
    if (!RESEND_API_KEY || !EMAIL_FROM) {
      throw new Error("Configuración de email incompleta");
    }

    const resend = new Resend(RESEND_API_KEY);
    const response = await resend.emails.send({
      from: `LogiTrack <${EMAIL_FROM}>`,
      to,
      subject: `Chofer postulado - Viaje #${viajeNumero}`,
      html: htmlContent,
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log("[EMAIL] Email enviado al vendedor:", {
      messageId: response.data?.id,
      to,
    });
    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error("[EMAIL] Error al enviar email al vendedor:", error);
    throw error;
  }
}

interface EmailConPDFAdjunto {
  to: string; // Email del destinatario
  subject: string; // Asunto del email
  htmlContent: string; // Contenido HTML del email
  pdfBuffer: Buffer; // Buffer del PDF
  pdfNombre: string; // Nombre del archivo PDF
}

/**
 * Envía un email con un PDF adjunto
 */
export async function enviarEmailConPDFAdjunto(data: EmailConPDFAdjunto) {
  const { to, subject, htmlContent, pdfBuffer, pdfNombre } = data;

  try {
    if (!RESEND_API_KEY || !EMAIL_FROM) {
      throw new Error("Configuración de email incompleta");
    }

    const resend = new Resend(RESEND_API_KEY);
    const response = await resend.emails.send({
      from: `LogiTrack <${EMAIL_FROM}>`,
      to,
      subject,
      html: htmlContent,
      attachments: [
        {
          filename: pdfNombre,
          content: pdfBuffer,
        },
      ],
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    console.log("[EMAIL] Email con PDF enviado exitosamente:", {
      messageId: response.data?.id,
      to,
      archivo: pdfNombre,
    });

    return { success: true, messageId: response.data?.id };
  } catch (error) {
    console.error("[EMAIL] Error al enviar email con PDF:", error);
    throw error;
  }
}
