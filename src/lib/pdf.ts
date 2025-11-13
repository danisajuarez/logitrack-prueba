import type { NegocioEmailData } from "./email";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Genera un HTML completo para el PDF (puede ser el mismo que el email o personalizado)
 */
function generatePDFHTML(data: NegocioEmailData): string {
  const format = (d: string) => {
    try {
      return new Intl.DateTimeFormat("es-AR").format(new Date(d));
    } catch {
      return d;
    }
  };

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 13px;
      color: #000;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
    }

    .logo {
      width: 260px;
    }

    .firma-box {
      width: 120px;
      height: 80px;
      border: 2px solid #008000;
      margin-top: 10px;
      text-align: center;
      font-size: 22px;
      font-weight: bold;
    }

    .fecha {
      font-size: 15px;
      margin-top: 10px;
      font-weight: bold;
    }

    .datos-empresa {
      text-align: left;
      font-size: 12px;
      margin-top: 10px;
      line-height: 1.4;
    }

    .linea-verde {
      height: 3px;
      background-color: #008000;
      width: 100%;
      margin: 12px 0;
    }

    .section-label {
      font-weight: bold;
      margin-right: 4px;
      font-size: 14px;
    }

    .section-row {
      display: flex;
      margin-bottom: 4px;
      font-size: 14px;
    }

    .tabla {
      width: 100%;
      border-collapse: collapse;
      margin-top: 18px;
      font-size: 13px;
    }

    .tabla th {
      text-align: left;
      font-weight: bold;
      padding-bottom: 6px;
    }

    .tabla td {
      padding: 4px 0;
    }
  </style>
</head>

<body>

  <!-- ENCABEZADO -->
  <div class="row">
    <img src="https://i.imgur.com/AuVYhFt.png" class="logo" />

    <div>
      <div class="firma-box">X</div>
      <div class="fecha">FECHA: ${format(data.fecha)}</div>

      <div class="datos-empresa">
        <strong>LOGITRACK S.A.S.</strong><br>
        I.V.A.: Responsable Inscripto<br>
        C.U.I.T.: 30-71895249-9<br>
        Ing.Brutos: 30-71895249-9<br>
        Inicio Actividades: 01/05/2025
      </div>
    </div>
  </div>

  <div class="linea-verde"></div>

  <!-- PROVEEDOR -->
  <div class="section-row">
    <span class="section-label">PROVEEDOR:</span> ${data.proveedor || ""}
  </div>
  <div class="section-row">
    <span class="section-label">DOMICILIO:</span> ${data.procedencia || ""}
  </div>
  <div class="section-row">
    <span class="section-label">CUIT:</span> ${data.proveedorCuit || ""}
  </div>

  <div class="linea-verde"></div>

  <h3 style="margin-top: 25px;">Detalle de Transportes, Choferes y Camiones</h3>

  <table class="tabla">
    <thead>
      <tr>
        <th>Intermediario</th>
        <th>CUIT Inter.</th>
        <th>Transporte</th>
        <th>CUIT Trans.</th>
        <th>Chofer</th>
        <th>CUIT Chofer</th>
        <th>Pat.Camión</th>
        <th>Pat.Acop.</th>
        <th>Procedencia</th>
        <th>Destino</th>
        <th>Tarifa</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${data.intermediario || "LOGITRACK"}</td>
        <td>${data.transportistaCuit || ""}</td>
        <td>${data.transportista || ""}</td>
        <td>${data.transportistaCuit || ""}</td>
        <td>${data.chofer || ""}</td>
        <td>${data.choferCuit || ""}</td>
        <td>${data.patenteChasis || ""}</td>
        <td>${data.patenteAcoplado || ""}</td>
        <td>${data.procedencia || ""}</td>
        <td>${data.destino || ""}</td>
        <td>${data.tarifa || ""}</td>
      </tr>
    </tbody>
  </table>

</body>
</html>
  `;
}

/**
 * Genera un PDF simple con los datos del negocio usando pdf-lib.
 * Devuelve un Buffer con el contenido del PDF.
 */
export async function generateNegocioPDF(
  data: NegocioEmailData
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 portrait
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const margin = 50;
  let y = height - margin;

  const negro = rgb(0, 0, 0);
  const azul = rgb(0.15, 0.38, 0.92); // #2563eb aprox
  const gris = rgb(0.4, 0.45, 0.5);

  // Encabezado
  const title = "Nuevo Negocio Registrado";
  page.drawText(title, { x: margin, y, size: 20, font: fontBold, color: azul });
  y -= 18;
  const numero = `Negocio Nº ${data.numeroNegocio}`;
  page.drawText(numero, { x: margin, y, size: 12, font: fontRegular, color: gris });

  // Línea divisoria
  y -= 14;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 2, color: azul });

  // Utilidades
  const drawLabelValue = (label: string, value: string, gap = 90) => {
    y -= 16;
    page.drawText(label, { x: margin, y, size: 12, font: fontBold, color: negro });
    page.drawText(value || "", { x: margin + gap, y, size: 12, font: fontRegular, color: negro });
  };
  const formatDate = (d?: string) => {
    try {
      return d ? new Intl.DateTimeFormat("es-AR").format(new Date(d)) : "";
    } catch {
      return d || "";
    }
  };
  const formatCurrency = (v?: number) => {
    try {
      return typeof v === "number"
        ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(v)
        : "";
    } catch {
      return typeof v === "number" ? `$${v.toFixed(2)}` : "";
    }
  };

  // Fechas
  y -= 22;
  page.drawText("Fechas", { x: margin, y, size: 14, font: fontBold, color: azul });
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.88, 0.92, 1) });
  drawLabelValue("Fecha:", formatDate(data.fecha));
  drawLabelValue("Vencimiento:", formatDate(data.fechaVencimiento));

  // Proveedor
  y -= 22;
  page.drawText("Proveedor", { x: margin, y, size: 14, font: fontBold, color: azul });
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.88, 0.92, 1) });
  drawLabelValue("Razón Social:", data.proveedor || "");
  if (data.proveedorCuit) drawLabelValue("CUIT:", data.proveedorCuit);

  // Ubicaciones
  y -= 22;
  page.drawText("Ubicaciones", { x: margin, y, size: 14, font: fontBold, color: azul });
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.88, 0.92, 1) });
  drawLabelValue("Procedencia:", data.procedencia || "");
  drawLabelValue("Destino:", data.destino || "");

  // Transporte
  if (data.intermediario || data.transportista || data.chofer) {
    y -= 22;
    page.drawText("Transporte", { x: margin, y, size: 14, font: fontBold, color: azul });
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.88, 0.92, 1) });
    if (data.intermediario) drawLabelValue("Intermediario:", data.intermediario);
    if (data.transportista) drawLabelValue("Transportista:", data.transportista);
    if (data.transportistaCuit) drawLabelValue("CUIT Transp.:", data.transportistaCuit);
    if (data.chofer) drawLabelValue("Chofer:", data.chofer);
    if (data.choferCuit) drawLabelValue("CUIT Chofer:", data.choferCuit);
  }

  // Vehículos
  if (data.patenteChasis || data.patenteAcoplado) {
    y -= 22;
    page.drawText("Vehículos", { x: margin, y, size: 14, font: fontBold, color: azul });
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.88, 0.92, 1) });
    if (data.patenteChasis) drawLabelValue("Chasis:", (data.patenteChasis || "").toUpperCase());
    if (data.patenteAcoplado) drawLabelValue("Acoplado:", (data.patenteAcoplado || "").toUpperCase());
  }

  // Artículo y tarifa
  y -= 22;
  page.drawText("Negocio", { x: margin, y, size: 14, font: fontBold, color: azul });
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.88, 0.92, 1) });
  drawLabelValue("Artículo:", data.articulo || "");
  drawLabelValue("Tarifa:", formatCurrency(data.tarifa));
  if (typeof data.cupos !== "undefined") drawLabelValue("Cupos:", String(data.cupos));
  if (data.vendedor) drawLabelValue("Vendedor:", data.vendedor);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export { generatePDFHTML };
