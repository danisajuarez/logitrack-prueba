import type { NegocioEmailData } from "./email";

/**
 * Genera un HTML completo para el PDF (puede ser el mismo que el email o personalizado)
 */
function generatePDFHTML(data: NegocioEmailData): string {
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
  <style>
    @page {
      size: A4;
      margin: 2cm;
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 100%;
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
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    .section-title {
      font-weight: 600;
      color: #1e40af;
      font-size: 16px;
      margin-bottom: 10px;
      padding-bottom: 5px;
      border-bottom: 2px solid #e2e8f0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    td {
      padding: 8px 5px;
      border-bottom: 1px solid #f1f5f9;
    }
    td.label {
      font-weight: 600;
      color: #475569;
      width: 140px;
    }
    td.value {
      color: #1e293b;
    }
    .tarifa {
      background-color: #dbeafe;
      padding: 15px;
      margin-top: 20px;
      page-break-inside: avoid;
    }
    .tarifa-label {
      font-weight: 600;
      color: #475569;
      margin-bottom: 5px;
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
      font-size: 11px;
      color: #64748b;
      text-align: center;
      page-break-inside: avoid;
    }
    .timestamp {
      text-align: right;
      font-size: 10px;
      color: #94a3b8;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Resumen de Negocio</h1>
      <p class="numero">Negocio N° ${data.numeroNegocio}</p>
    </div>

    <div class="section">
      <div class="section-title">Fechas</div>
      <table>
        <tr>
          <td class="label">Fecha:</td>
          <td class="value">${formatDate(data.fecha)}</td>
        </tr>
        <tr>
          <td class="label">Vencimiento:</td>
          <td class="value">${formatDate(data.fechaVencimiento)}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Proveedor</div>
      <table>
        <tr>
          <td class="label">Razón Social:</td>
          <td class="value">${data.proveedor}</td>
        </tr>
        ${
          data.proveedorCuit
            ? `
        <tr>
          <td class="label">CUIT:</td>
          <td class="value">${data.proveedorCuit}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>

    <div class="section">
      <div class="section-title">Ubicaciones</div>
      <table>
        <tr>
          <td class="label">Procedencia:</td>
          <td class="value">${data.procedencia}</td>
        </tr>
        <tr>
          <td class="label">Destino:</td>
          <td class="value">${data.destino}</td>
        </tr>
      </table>
    </div>

    ${
      data.intermediario || data.transportista || data.chofer
        ? `
    <div class="section">
      <div class="section-title">Transporte</div>
      <table>
        ${
          data.intermediario
            ? `
        <tr>
          <td class="label">Intermediario:</td>
          <td class="value">${data.intermediario}</td>
        </tr>
        `
            : ""
        }
        ${
          data.transportista
            ? `
        <tr>
          <td class="label">Transportista:</td>
          <td class="value">${data.transportista}</td>
        </tr>
        `
            : ""
        }
        ${
          data.transportistaCuit
            ? `
        <tr>
          <td class="label">CUIT Transportista:</td>
          <td class="value">${data.transportistaCuit}</td>
        </tr>
        `
            : ""
        }
        ${
          data.chofer
            ? `
        <tr>
          <td class="label">Chofer:</td>
          <td class="value">${data.chofer}</td>
        </tr>
        `
            : ""
        }
        ${
          data.choferCuit
            ? `
        <tr>
          <td class="label">CUIT Chofer:</td>
          <td class="value">${data.choferCuit}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>
    `
        : ""
    }

    ${
      data.patenteChasis || data.patenteAcoplado
        ? `
    <div class="section">
      <div class="section-title">Vehículos</div>
      <table>
        ${
          data.patenteChasis
            ? `
        <tr>
          <td class="label">Patente Camión:</td>
          <td class="value">${data.patenteChasis}</td>
        </tr>
        `
            : ""
        }
        ${
          data.patenteAcoplado
            ? `
        <tr>
          <td class="label">Patente Acoplado:</td>
          <td class="value">${data.patenteAcoplado}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>
    `
        : ""
    }

    <div class="section">
      <div class="section-title">Artículo</div>
      <table>
        <tr>
          <td class="label">Descripción:</td>
          <td class="value">${data.articulo}</td>
        </tr>
        ${
          data.cupos
            ? `
        <tr>
          <td class="label">Cupos:</td>
          <td class="value">${data.cupos}</td>
        </tr>
        `
            : ""
        }
      </table>
    </div>

    <div class="tarifa">
      <div class="tarifa-label">Tarifa</div>
      <div class="tarifa-value">${formatCurrency(data.tarifa)}</div>
    </div>

    ${
      data.vendedor
        ? `
    <div class="section">
      <table>
        <tr>
          <td class="label">Vendedor:</td>
          <td class="value">${data.vendedor}</td>
        </tr>
      </table>
    </div>
    `
        : ""
    }

    <div class="footer">
      <p>Documento generado automáticamente por el sistema de gestión de negocios.</p>
      <div class="timestamp">
        Generado el: ${new Date().toLocaleString("es-AR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Genera un PDF desde los datos del negocio usando Puppeteer
 *
 * @param data - Datos del negocio
 * @returns Buffer del PDF generado
 */
export async function generateNegocioPDF(
  data: NegocioEmailData
): Promise<Buffer> {
  let browser = null;

  try {
    console.log(
      "[PDF] Iniciando generación de PDF para negocio:",
      data.numeroNegocio
    );

    // Generar HTML
    const html = generatePDFHTML(data);

    // Importar puppeteer de forma diferida para evitar problemas en build/edge
    // @ts-ignore - puppeteer es opcional y se instala bajo demanda
    const { default: puppeteer } = await import("puppeteer");

    // Lanzar navegador headless
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    console.log("[PDF] Navegador lanzado exitosamente");

    const page = await browser.newPage();

    // Configurar contenido HTML
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    console.log("[PDF] Contenido HTML cargado");

    // Generar PDF
    const rawPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "2cm",
        right: "2cm",
        bottom: "2cm",
        left: "2cm",
      },
    });

    // Asegurar que devolvemos un Buffer de Node (page.pdf puede devolver Uint8Array)
    const pdfBuffer = Buffer.from(rawPdf);

    console.log(
      "[PDF] PDF generado exitosamente, tamaño:",
      pdfBuffer.length,
      "bytes"
    );

    return pdfBuffer;
  } catch (error) {
    console.error("[PDF] Error al generar PDF:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("[PDF] Navegador cerrado");
    }
  }
}

/**
 * Genera un PDF y lo devuelve como base64 (útil para APIs que requieren base64)
 */
export async function generateNegocioPDFBase64(
  data: NegocioEmailData
): Promise<string> {
  const buffer = await generateNegocioPDF(data);
  return buffer.toString("base64");
}
