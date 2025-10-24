import { Resend } from "resend";
import "server-only";

// Normaliza variables de entorno para aceptar EMAIL_* o MAIL_*
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.MAIL_FROM;
const EMAIL_LOGISTICA = process.env.EMAIL_LOGISTICA || process.env.MAIL_LOGISTICA;
const EMAIL_ADMINISTRACION =
  process.env.EMAIL_ADMINISTRACION || process.env.MAIL_ADMIN || process.env.MAIL_ADMINISTRACION;
const EMAIL_TEST = process.env.MAIL_TEST || process.env.EMAIL_TEST; // opcional para fallback local

const resend = new Resend(RESEND_API_KEY);

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

    // Enviar email
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
