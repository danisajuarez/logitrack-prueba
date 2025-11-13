import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

interface DatosOrdenEntrega {
  numero: string; // Número de orden (ej: "0001-00001814")
  fecha: string; // Fecha ISO
  proveedor: string; // Razón social del proveedor
  transportista: string; // Nombre del transportista
  transportistaCuit: string; // CUIT del transportista
  chofer: string; // Nombre del chofer
  choferCuit: string; // CUIT del chofer
  patente: string; // Patentes (ej: "OBU 859 AE300SR")
  tipo: "combustible" | "adelanto"; // Tipo de autorización
  cantidad: number; // Litros o monto en pesos
  importe: number; // Siempre 0 según el ejemplo
}

/**
 * Genera el PDF de Orden de Entrega para autorizaciones
 * Retorna un Buffer con el PDF generado
 */
export async function generarPDFOrdenEntrega(
  datos: DatosOrdenEntrega
): Promise<Buffer> {
  // Crear nuevo documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 en puntos

  // Cargar fuentes
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const margin = 50;

  // Formatear fecha
  const fechaFormateada = new Date(datos.fecha).toLocaleDateString("es-AR");

  // Color verde para logo
  const colorVerde = rgb(0, 0.66, 0.35); // #00A859
  const colorGris = rgb(0.4, 0.4, 0.4);
  const colorNegro = rgb(0, 0, 0);

  let yPos = height - margin;

  // ===== HEADER =====

  // Logo texto "LOGITRACK"
  page.drawText("LOGITRACK", {
    x: margin,
    y: yPos,
    size: 24,
    font: fontBold,
    color: colorVerde,
  });

  yPos -= 20;

  // Subtítulo
  page.drawText("TRANSPORTE Y LOGÍSTICA", {
    x: margin,
    y: yPos,
    size: 10,
    font: fontRegular,
    color: colorGris,
  });

  // Título derecha "ORDEN DE ENTREGA"
  const tituloAncho = fontBold.widthOfTextAtSize("ORDEN DE ENTREGA", 18);
  page.drawText("ORDEN DE ENTREGA", {
    x: width - margin - tituloAncho,
    y: height - margin,
    size: 18,
    font: fontBold,
    color: colorNegro,
  });

  // Número y fecha (derecha)
  const numeroTexto = `NUMERO: ${datos.numero}`;
  const numeroAncho = fontRegular.widthOfTextAtSize(numeroTexto, 10);
  page.drawText(numeroTexto, {
    x: width - margin - numeroAncho,
    y: height - margin - 25,
    size: 10,
    font: fontRegular,
    color: colorNegro,
  });

  const fechaTexto = `FECHA: ${fechaFormateada}`;
  const fechaAncho = fontRegular.widthOfTextAtSize(fechaTexto, 10);
  page.drawText(fechaTexto, {
    x: width - margin - fechaAncho,
    y: height - margin - 40,
    size: 10,
    font: fontRegular,
    color: colorNegro,
  });

  // Cuadro empresa (derecha)
  const empresaX = width - margin - 150;
  const empresaY = height - margin - 105;
  const empresaWidth = 150;
  const empresaHeight = 50;

  page.drawRectangle({
    x: empresaX,
    y: empresaY,
    width: empresaWidth,
    height: empresaHeight,
    borderColor: colorNegro,
    borderWidth: 1,
  });

  // Textos dentro del cuadro empresa
  page.drawText("LOGITRACK S.A.S.", {
    x: empresaX + 5,
    y: empresaY + empresaHeight - 15,
    size: 7,
    font: fontRegular,
    color: colorNegro,
  });

  page.drawText("I.V.A.: Responsable Inscripto", {
    x: empresaX + 5,
    y: empresaY + empresaHeight - 27,
    size: 7,
    font: fontRegular,
    color: colorNegro,
  });

  page.drawText("C.U.I.T.: 30-71995249-9", {
    x: empresaX + 5,
    y: empresaY + empresaHeight - 39,
    size: 7,
    font: fontRegular,
    color: colorNegro,
  });

  // ===== PROVEEDOR =====
  yPos = height - 230;

  page.drawText("PROVEEDOR:", {
    x: margin,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  page.drawText(datos.proveedor, {
    x: margin + 100,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  // Línea separadora
  yPos -= 30;
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: width - margin, y: yPos },
    thickness: 1,
    color: colorNegro,
  });

  // ===== TRANSPORTISTA, CHOFER, PATENTE =====
  yPos -= 20;

  page.drawText("TRANSPORTISTA:", {
    x: margin,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  page.drawText(datos.transportista, {
    x: margin + 130,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  const cuitTranspAncho = fontRegular.widthOfTextAtSize(
    datos.transportistaCuit,
    11
  );
  page.drawText(datos.transportistaCuit, {
    x: width - margin - cuitTranspAncho,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  yPos -= 20;

  page.drawText("CHOFER:", {
    x: margin,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  page.drawText(datos.chofer, {
    x: margin + 130,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  const cuitChoferAncho = fontRegular.widthOfTextAtSize(datos.choferCuit, 11);
  page.drawText(datos.choferCuit, {
    x: width - margin - cuitChoferAncho,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  yPos -= 20;

  page.drawText("PATENTE:", {
    x: margin,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  page.drawText(datos.patente, {
    x: margin + 130,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  // ===== TABLA =====
  yPos -= 40;

  // Headers de la tabla
  page.drawText("DETALLE", {
    x: margin,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  const cantidadHeader = "CANTIDAD";
  const cantidadHeaderAncho = fontBold.widthOfTextAtSize(cantidadHeader, 11);
  page.drawText(cantidadHeader, {
    x: width - margin - 200 - cantidadHeaderAncho,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  const importeHeader = "IMPORTE";
  const importeHeaderAncho = fontBold.widthOfTextAtSize(importeHeader, 11);
  page.drawText(importeHeader, {
    x: width - margin - importeHeaderAncho,
    y: yPos,
    size: 11,
    font: fontBold,
    color: colorNegro,
  });

  // Línea debajo del header
  yPos -= 10;
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: width - margin, y: yPos },
    thickness: 1,
    color: colorNegro,
  });

  // Datos de la tabla
  yPos -= 20;

  const detalleTipo =
    datos.tipo === "combustible" ? "COMBUSTIBLE" : "ADELANTO";
  const cantidadTexto =
    datos.tipo === "combustible"
      ? `${datos.cantidad.toFixed(2)}`
      : `$${datos.cantidad.toFixed(2)}`;

  page.drawText(detalleTipo, {
    x: margin,
    y: yPos,
    size: 10,
    font: fontRegular,
    color: colorNegro,
  });

  const cantidadAncho = fontRegular.widthOfTextAtSize(cantidadTexto, 10);
  page.drawText(cantidadTexto, {
    x: width - margin - 200 - cantidadAncho,
    y: yPos,
    size: 10,
    font: fontRegular,
    color: colorNegro,
  });

  const importeTexto = datos.importe.toFixed(2);
  const importeAncho = fontRegular.widthOfTextAtSize(importeTexto, 10);
  page.drawText(importeTexto, {
    x: width - margin - importeAncho,
    y: yPos,
    size: 10,
    font: fontRegular,
    color: colorNegro,
  });

  // Generar y retornar el PDF como buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Genera el nombre del archivo PDF según el tipo y datos
 */
export function generarNombrePDF(datos: DatosOrdenEntrega): string {
  const tipo = datos.tipo === "combustible" ? "COMBUSTIBLE" : "ADELANTO";
  const choferLimpio = datos.chofer.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
  const cantidad =
    datos.tipo === "combustible"
      ? `${datos.cantidad.toFixed(0)}LTS`
      : `${datos.cantidad.toFixed(0)}PESOS`;

  return `${choferLimpio}_${cantidad}_${tipo}.pdf`;
}

// ================================================
// Nuevo formato: Autorización de Asignación
// Similar al ejemplo provisto con cabecera verde y tabla detallada
// ================================================

export interface DatosAutorizacionAsignacion {
  fecha: string;
  proveedor: string;
  proveedorDomicilio?: string | null;
  proveedorCuit?: string | null;

  intermediarioNombre?: string; // default: LOGITRACK
  intermediarioCuit?: string | null;

  transportista?: string | null;
  transportistaCuit?: string | null;

  chofer?: string | null;
  choferCuit?: string | null;

  patChasis?: string | null;
  patAcoplado?: string | null;

  procedencia?: string | null;
  destino?: string | null;
  tarifa?: number | null;
}

function formatCurrencyArs(n: number | null | undefined): string {
  const v = typeof n === "number" && Number.isFinite(n) ? n : 0;
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(v);
  } catch {
    // Fallback simple
    return `$${v.toFixed(2)}`;
  }
}

export async function generarPDFAutorizacionAsignacion(
  datos: DatosAutorizacionAsignacion
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([842, 595]); // A4 apaisado similar al ejemplo

  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const margin = 40;

  const fechaFormateada = new Date(datos.fecha || new Date()).toLocaleDateString(
    "es-AR"
  );

  const verde = rgb(0, 0.52, 0.34); // verde institucional
  const gris = rgb(0.25, 0.25, 0.25);
  const negro = rgb(0, 0, 0);

  let y = height - margin;

  // Marca/logotipo
  page.drawText("LOGITRACK", {
    x: margin,
    y,
    size: 26,
    font: fontBold,
    color: verde,
  });
  y -= 16;
  page.drawText("TRANSPORTE Y LOGÍSTICA", {
    x: margin,
    y,
    size: 10,
    font: fontRegular,
    color: gris,
  });

  // Caja derecha con datos empresa y fecha
  const boxW = 260;
  const boxH = 80;
  const boxX = width - margin - boxW;
  const boxY = height - margin - boxH + 8;
  page.drawText(`FECHA:  ${fechaFormateada}`, {
    x: boxX,
    y: boxY + boxH + 5,
    size: 12,
    font: fontBold,
    color: negro,
  });
  page.drawRectangle({ x: boxX, y: boxY, width: boxW, height: boxH, borderColor: negro, borderWidth: 1 });

  const companyName = process.env.COMPANY_NAME || "LOGITRACK S.A.S.";
  const companyIva = process.env.COMPANY_IVA || "I.V.A.: Responsable Inscripto";
  const companyCuit = process.env.COMPANY_CUIT || "C.U.I.T.:";
  const companyIb = process.env.COMPANY_IB || "Ing.Brutos:";
  const companyStart = process.env.COMPANY_START || "Inicio Actividades:";

  let tx = boxX + 8;
  let ty = boxY + boxH - 14;
  const line = (text: string) => {
    page.drawText(text, { x: tx, y: ty, size: 9, font: fontRegular, color: negro });
    ty -= 12;
  };
  line(companyName);
  line(companyIva);
  line(companyCuit);
  line(companyIb);
  line(companyStart);

  // Línea separadora verde
  y -= 18;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 3, color: verde });
  y -= 20;

  // Bloque proveedor
  const provLines = [
    { label: "PROVEEDOR:", value: datos.proveedor || "" },
    { label: "DOMICILIO:", value: datos.proveedorDomicilio || "" },
    { label: "CUIT:", value: datos.proveedorCuit || "" },
  ];
  provLines.forEach((row) => {
    page.drawText(row.label, { x: margin, y, size: 12, font: fontBold, color: negro });
    page.drawText(String(row.value), { x: margin + 120, y, size: 12, font: fontRegular, color: negro });
    y -= 20;
  });

  // Línea separadora
  y -= 8;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 3, color: verde });
  y -= 24;

  // Título detalle
  page.drawText("Detalle de Transportes, Choferes y Camiones", {
    x: margin,
    y,
    size: 12,
    font: fontBold,
    color: negro,
  });
  y -= 18;

  // Tabla
  const headers = [
    "Intermediario",
    "CUIT Inter.",
    "Transporte",
    "CUIT Trans.",
    "Chofer",
    "CUIT Chofer",
    "Pat.Camión",
    "Pat.Acop.",
    "Procedencia",
    "Destino",
    "Tarifa",
  ];
  const colXs = [
    margin,
    margin + 90,
    margin + 180,
    margin + 330,
    margin + 420,
    margin + 540,
    margin + 640,
    margin + 730,
    margin + 820, // will overflow, adjust by scaling to landscape width 842
  ];
  // Recompute more compact columns fitting width
  const cols = [
    margin + 0,
    margin + 95,
    margin + 210,
    margin + 340,
    margin + 450,
    margin + 560,
    margin + 660,
    margin + 740,
  ];
  const headerMap: Array<{ text: string; x: number }> = [
    { text: headers[0], x: cols[0] },
    { text: headers[1], x: cols[1] },
    { text: headers[2], x: cols[2] },
    { text: headers[3], x: cols[3] },
    { text: headers[4], x: cols[4] },
    { text: headers[5], x: cols[5] },
    { text: headers[6], x: cols[6] },
    { text: headers[7], x: cols[7] },
  ];

  // Primera fila de headers (hasta Pat.Acop.)
  headerMap.forEach((h) => {
    page.drawText(h.text, { x: h.x, y, size: 10, font: fontBold, color: negro });
  });
  y -= 16;
  // Segunda fila de headers (procedencia, destino, tarifa) en la siguiente línea para no saturar
  const secondHeaders: Array<{ text: string; x: number }> = [
    { text: headers[8], x: cols[0] },
    { text: headers[9], x: cols[2] },
    { text: headers[10], x: cols[4] },
  ];
  secondHeaders.forEach((h) => {
    page.drawText(h.text, { x: h.x, y, size: 10, font: fontBold, color: negro });
  });
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: negro });
  y -= 18;

  // Datos
  const intermediarioNombre = datos.intermediarioNombre || process.env.COMPANY_SHORTNAME || "LOGITRACK";
  const intermediarioCuit = datos.intermediarioCuit || process.env.COMPANY_CUIT || "";
  const fila1: Array<{ text: string; x: number }> = [
    { text: intermediarioNombre, x: cols[0] },
    { text: intermediarioCuit, x: cols[1] },
    { text: datos.transportista || "", x: cols[2] },
    { text: datos.transportistaCuit || "", x: cols[3] },
    { text: datos.chofer || "", x: cols[4] },
    { text: datos.choferCuit || "", x: cols[5] },
    { text: (datos.patChasis || "").toUpperCase(), x: cols[6] },
    { text: (datos.patAcoplado || "").toUpperCase(), x: cols[7] },
  ];
  fila1.forEach((d) => page.drawText(d.text, { x: d.x, y, size: 10, font: fontRegular, color: negro }));
  y -= 16;

  const fila2: Array<{ text: string; x: number }> = [
    { text: datos.procedencia || "", x: cols[0] },
    { text: datos.destino || "", x: cols[2] },
    { text: formatCurrencyArs(datos.tarifa ?? null), x: cols[4] },
  ];
  fila2.forEach((d) => page.drawText(d.text, { x: d.x, y, size: 10, font: fontRegular, color: negro }));

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
