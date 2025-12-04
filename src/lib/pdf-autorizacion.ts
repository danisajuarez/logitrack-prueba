import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import * as fs from "fs";
import * as path from "path";
import { fixEncoding } from "./encoding";

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

  // Registrar fontkit para usar fuentes personalizadas
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([595, 842]); // A4 en puntos

  // Cargar fuentes Roboto con soporte para caracteres especiales (ñ, acentos, etc.)
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const fontRegularPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldBytes = fs.readFileSync(fontBoldPath);
  const fontRegularBytes = fs.readFileSync(fontRegularPath);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  const fontRegular = await pdfDoc.embedFont(fontRegularBytes);

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

  page.drawText(fixEncoding(datos.proveedor), {
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

  page.drawText(fixEncoding(datos.transportista), {
    x: margin + 130,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  const cuitTranspText = fixEncoding(datos.transportistaCuit);
  const cuitTranspAncho = fontRegular.widthOfTextAtSize(cuitTranspText, 11);
  page.drawText(cuitTranspText, {
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

  page.drawText(fixEncoding(datos.chofer), {
    x: margin + 130,
    y: yPos,
    size: 11,
    font: fontRegular,
    color: colorNegro,
  });

  const cuitChoferText = fixEncoding(datos.choferCuit);
  const cuitChoferAncho = fontRegular.widthOfTextAtSize(cuitChoferText, 11);
  page.drawText(cuitChoferText, {
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

  page.drawText(fixEncoding(datos.patente), {
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

  mostrarIntermediario?: boolean; // Si es true, muestra las columnas de intermediario
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

  // Registrar fontkit para usar fuentes personalizadas
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([842, 595]); // A4 apaisado similar al ejemplo

  // Cargar fuentes Roboto con soporte para caracteres especiales (ñ, acentos, etc.)
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const fontRegularPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldBytes = fs.readFileSync(fontBoldPath);
  const fontRegularBytes = fs.readFileSync(fontRegularPath);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  const fontRegular = await pdfDoc.embedFont(fontRegularBytes);

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
  const companyCuit = process.env.COMPANY_CUIT || "C.U.I.T.: 30-71995249-9";
  const companyIb = process.env.COMPANY_IB || "Ing.Brutos: 30-71995249-9";
  const companyStart = process.env.COMPANY_START || "Inicio Actividades: 01/05/2024";

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
    { label: "PROVEEDOR:", value: fixEncoding(datos.proveedor) || "N/A" },
    { label: "DOMICILIO:", value: fixEncoding(datos.proveedorDomicilio) || "N/A" },
    { label: "CUIT:", value: fixEncoding(datos.proveedorCuit) || "N/A" },
  ];
  provLines.forEach((row) => {
    page.drawText(row.label, { x: margin, y, size: 11, font: fontBold, color: negro });
    page.drawText(String(row.value), { x: margin + 120, y, size: 11, font: fontRegular, color: negro });
    y -= 18;
  });

  // Línea separadora
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 3, color: verde });
  y -= 20;

  // Título detalle
  page.drawText("Detalle de Transportes, Choferes y Vehículos", {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: negro,
  });
  y -= 25;

  // Helpers para valores seguros
  const safe = (val: string | null | undefined, defaultVal = "N/A"): string =>
    val && val.trim() !== "" ? fixEncoding(val) : defaultVal;

  const intermediarioNombre = datos.intermediarioNombre || process.env.COMPANY_SHORTNAME || "LOGITRACK";
  const intermediarioCuit = datos.intermediarioCuit || process.env.COMPANY_CUIT || "30-71995249-9";
  const mostrarIntermediario = datos.mostrarIntermediario === true;

  // Definir estructura de tabla
  const tableX = margin;
  const tableWidth = width - (2 * margin); // 842 - 80 = 762 puntos disponibles
  const rowHeight = 20;
  const cellPadding = 3;

  // Definir columnas (anchos ajustados para que todo quepa en la página apaisada)
  const columns = mostrarIntermediario
    ? [
        { label: "Intermediario", width: 70 },      // Total: ~762 puntos
        { label: "CUIT Inter.", width: 70 },
        { label: "Transportista", width: 75 },
        { label: "CUIT Trans.", width: 70 },
        { label: "Chofer", width: 80 },
        { label: "CUIT Chofer", width: 70 },
        { label: "Pat. Camión", width: 60 },
        { label: "Pat. Acoplado", width: 60 },
        { label: "Procedencia", width: 65 },
        { label: "Destino", width: 65 },
        { label: "Tarifa", width: 67 },
      ]
    : [
        { label: "Transportista", width: 95 },      // Total: ~762 puntos
        { label: "CUIT Trans.", width: 90 },
        { label: "Chofer", width: 105 },
        { label: "CUIT Chofer", width: 90 },
        { label: "Pat. Camión", width: 70 },
        { label: "Pat. Acoplado", width: 70 },
        { label: "Procedencia", width: 80 },
        { label: "Destino", width: 80 },
        { label: "Tarifa", width: 82 },
      ];

  // Calcular posiciones X de cada columna
  let currentX = tableX;
  const columnPositions = columns.map((col) => {
    const pos = currentX;
    currentX += col.width;
    return pos;
  });

  // Dibujar encabezados de tabla
  columns.forEach((col, i) => {
    // Fondo del header
    page.drawRectangle({
      x: columnPositions[i],
      y: y - rowHeight + 5,
      width: col.width,
      height: rowHeight,
      color: verde,
    });

    // Borde del header
    page.drawRectangle({
      x: columnPositions[i],
      y: y - rowHeight + 5,
      width: col.width,
      height: rowHeight,
      borderColor: negro,
      borderWidth: 1,
    });

    // Texto del header (centrado horizontalmente si cabe, si no alineado a la izquierda con padding)
    const headerFontSize = 7.5;
    const textWidth = fontBold.widthOfTextAtSize(col.label, headerFontSize);
    let textX: number;

    if (textWidth <= col.width - 4) {
      // Si cabe, centrarlo
      textX = columnPositions[i] + (col.width - textWidth) / 2;
    } else {
      // Si no cabe, alinearlo a la izquierda con padding
      textX = columnPositions[i] + 2;
    }

    page.drawText(col.label, {
      x: textX,
      y: y - rowHeight + 12,
      size: headerFontSize,
      font: fontBold,
      color: rgb(1, 1, 1), // Blanco
    });
  });

  y -= rowHeight;

  // Preparar datos de la fila (con patentes separadas)
  const patCamion = safe((datos.patChasis || "").toUpperCase());
  const patAcoplado = safe((datos.patAcoplado || "").toUpperCase(), "SIN ACOP.");

  const rowData = mostrarIntermediario
    ? [
        safe(intermediarioNombre, "N/A"),
        safe(intermediarioCuit, "N/A"),
        safe(datos.transportista, "N/A"),
        safe(datos.transportistaCuit, "N/A"),
        safe(datos.chofer, "N/A"),
        safe(datos.choferCuit, "N/A"),
        patCamion,
        patAcoplado,
        safe(datos.procedencia, "N/A"),
        safe(datos.destino, "N/A"),
        formatCurrencyArs(datos.tarifa ?? null),
      ]
    : [
        safe(intermediarioNombre, "N/A"), // Cuando no hay intermediario, en "Transportista" va LOGITRACK
        safe(intermediarioCuit, "N/A"),
        safe(datos.chofer, "N/A"),
        safe(datos.choferCuit, "N/A"),
        patCamion,
        patAcoplado,
        safe(datos.procedencia, "N/A"),
        safe(datos.destino, "N/A"),
        formatCurrencyArs(datos.tarifa ?? null),
      ];

  // Dibujar fila de datos
  columns.forEach((col, i) => {
    // Fondo de la celda (alternado para mejor legibilidad)
    page.drawRectangle({
      x: columnPositions[i],
      y: y - rowHeight + 5,
      width: col.width,
      height: rowHeight,
      color: rgb(0.97, 0.97, 0.97),
    });

    // Borde de la celda
    page.drawRectangle({
      x: columnPositions[i],
      y: y - rowHeight + 5,
      width: col.width,
      height: rowHeight,
      borderColor: negro,
      borderWidth: 0.5,
    });

    // Texto de la celda (con padding)
    const cellText = rowData[i];
    const fontSize = 6.5;
    const maxWidth = col.width - (2 * cellPadding);

    // Truncar texto si es muy largo
    let displayText = cellText;
    let textWidth = fontRegular.widthOfTextAtSize(displayText, fontSize);

    if (textWidth > maxWidth) {
      // Truncar progresivamente hasta que quepa
      while (textWidth > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
        textWidth = fontRegular.widthOfTextAtSize(displayText + "...", fontSize);
      }
      if (displayText.length > 0) {
        displayText += "...";
      }
    }

    page.drawText(displayText, {
      x: columnPositions[i] + cellPadding,
      y: y - rowHeight + 12,
      size: fontSize,
      font: fontRegular,
      color: negro,
    });
  });

  y -= rowHeight + 10;

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ================================================
// Función para generar PDF con múltiples asignaciones
// ================================================

export interface AsignacionMultiple {
  id?: number; // ID único para cada asignación (opcional)
  fecha?: string;
  proveedor?: string;
  proveedorDomicilio?: string | null;
  proveedorCuit?: string | null;

  intermediarioNombre?: string;
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

export async function generarPDFAsignacionesMultiples(
  datos: {
    fecha: string;
    proveedor: string;
    proveedorDomicilio?: string | null;
    proveedorCuit?: string | null;
    mostrarIntermediario?: boolean;
    asignaciones: AsignacionMultiple[];
  }
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // Registrar fontkit para usar fuentes personalizadas
  pdfDoc.registerFontkit(fontkit);

  const page = pdfDoc.addPage([842, 595]); // A4 apaisado

  // Cargar fuentes Roboto con soporte para caracteres especiales (ñ, acentos, etc.)
  const fontBoldPath = path.join(process.cwd(), "public", "fonts", "Roboto-Bold.ttf");
  const fontRegularPath = path.join(process.cwd(), "public", "fonts", "Roboto-Regular.ttf");
  const fontBoldBytes = fs.readFileSync(fontBoldPath);
  const fontRegularBytes = fs.readFileSync(fontRegularPath);
  const fontBold = await pdfDoc.embedFont(fontBoldBytes);
  const fontRegular = await pdfDoc.embedFont(fontRegularBytes);

  const { width, height } = page.getSize();
  const margin = 40;

  const fechaFormateada = new Date(datos.fecha || new Date()).toLocaleDateString("es-AR");

  const verde = rgb(0, 0.52, 0.34);
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
  const companyCuit = process.env.COMPANY_CUIT || "C.U.I.T.: 30-71995249-9";
  const companyIb = process.env.COMPANY_IB || "Ing.Brutos: 30-71995249-9";
  const companyStart = process.env.COMPANY_START || "Inicio Actividades: 01/05/2024";

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
    { label: "PROVEEDOR:", value: fixEncoding(datos.proveedor) || "N/A" },
    { label: "DOMICILIO:", value: fixEncoding(datos.proveedorDomicilio) || "N/A" },
    { label: "CUIT:", value: fixEncoding(datos.proveedorCuit) || "N/A" },
  ];
  provLines.forEach((row) => {
    page.drawText(row.label, { x: margin, y, size: 11, font: fontBold, color: negro });
    page.drawText(String(row.value), { x: margin + 120, y, size: 11, font: fontRegular, color: negro });
    y -= 18;
  });

  // Línea separadora
  y -= 10;
  page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 3, color: verde });
  y -= 20;

  // Título detalle
  page.drawText("Detalle de Transportes, Choferes y Vehículos", {
    x: margin,
    y,
    size: 13,
    font: fontBold,
    color: negro,
  });
  y -= 25;

  // Helper
  const safe = (val: string | null | undefined, defaultVal = "N/A"): string =>
    val && val.trim() !== "" ? fixEncoding(val) : defaultVal;

  const mostrarIntermediario = datos.mostrarIntermediario === true;

  // Definir estructura de tabla
  const rowHeight = 20;
  const cellPadding = 3;

  const columns = mostrarIntermediario
    ? [
        { label: "Intermediario", width: 70 },
        { label: "CUIT Inter.", width: 70 },
        { label: "Transportista", width: 75 },
        { label: "CUIT Trans.", width: 70 },
        { label: "Chofer", width: 80 },
        { label: "CUIT Chofer", width: 70 },
        { label: "Pat. Camión", width: 60 },
        { label: "Pat. Acoplado", width: 60 },
        { label: "Procedencia", width: 65 },
        { label: "Destino", width: 65 },
        { label: "Tarifa", width: 67 },
      ]
    : [
        { label: "Transportista", width: 95 },
        { label: "CUIT Trans.", width: 90 },
        { label: "Chofer", width: 105 },
        { label: "CUIT Chofer", width: 90 },
        { label: "Pat. Camión", width: 70 },
        { label: "Pat. Acoplado", width: 70 },
        { label: "Procedencia", width: 80 },
        { label: "Destino", width: 80 },
        { label: "Tarifa", width: 82 },
      ];

  // Calcular posiciones X
  let currentX = margin;
  const columnPositions = columns.map((col) => {
    const pos = currentX;
    currentX += col.width;
    return pos;
  });

  // Dibujar encabezados
  columns.forEach((col, i) => {
    page.drawRectangle({
      x: columnPositions[i],
      y: y - rowHeight + 5,
      width: col.width,
      height: rowHeight,
      color: verde,
    });

    page.drawRectangle({
      x: columnPositions[i],
      y: y - rowHeight + 5,
      width: col.width,
      height: rowHeight,
      borderColor: negro,
      borderWidth: 1,
    });

    const headerFontSize = 7.5;
    const textWidth = fontBold.widthOfTextAtSize(col.label, headerFontSize);
    let textX: number;

    if (textWidth <= col.width - 4) {
      textX = columnPositions[i] + (col.width - textWidth) / 2;
    } else {
      textX = columnPositions[i] + 2;
    }

    page.drawText(col.label, {
      x: textX,
      y: y - rowHeight + 12,
      size: headerFontSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
  });

  y -= rowHeight;

  // Dibujar filas de datos
  const intermediarioNombre = process.env.COMPANY_SHORTNAME || "LOGITRACK";
  const intermediarioCuit = process.env.COMPANY_CUIT || "30-71995249-9";

  datos.asignaciones.forEach((asignacion, index) => {
    const patCamion = safe((asignacion.patChasis || "").toUpperCase());
    const patAcoplado = safe((asignacion.patAcoplado || "").toUpperCase(), "SIN ACOP.");

    const rowData = mostrarIntermediario
      ? [
          safe(asignacion.intermediarioNombre || intermediarioNombre, "N/A"),
          safe(asignacion.intermediarioCuit || intermediarioCuit, "N/A"),
          safe(asignacion.transportista, "N/A"),
          safe(asignacion.transportistaCuit, "N/A"),
          safe(asignacion.chofer, "N/A"),
          safe(asignacion.choferCuit, "N/A"),
          patCamion,
          patAcoplado,
          safe(asignacion.procedencia, "N/A"),
          safe(asignacion.destino, "N/A"),
          formatCurrencyArs(asignacion.tarifa ?? null),
        ]
      : [
          safe(intermediarioNombre, "N/A"), // Cuando no hay intermediario, en "Transportista" va LOGITRACK
          safe(intermediarioCuit, "N/A"),
          safe(asignacion.chofer, "N/A"),
          safe(asignacion.choferCuit, "N/A"),
          patCamion,
          patAcoplado,
          safe(asignacion.procedencia, "N/A"),
          safe(asignacion.destino, "N/A"),
          formatCurrencyArs(asignacion.tarifa ?? null),
        ];

    // Fondo alternado
    const bgColor = index % 2 === 0 ? rgb(0.97, 0.97, 0.97) : rgb(0.92, 0.92, 0.92);

    columns.forEach((col, i) => {
      page.drawRectangle({
        x: columnPositions[i],
        y: y - rowHeight + 5,
        width: col.width,
        height: rowHeight,
        color: bgColor,
      });

      page.drawRectangle({
        x: columnPositions[i],
        y: y - rowHeight + 5,
        width: col.width,
        height: rowHeight,
        borderColor: negro,
        borderWidth: 0.5,
      });

      const cellText = rowData[i];
      const fontSize = 6.5;
      const maxWidth = col.width - (2 * cellPadding);

      let displayText = cellText;
      let textWidth = fontRegular.widthOfTextAtSize(displayText, fontSize);

      if (textWidth > maxWidth) {
        while (textWidth > maxWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1);
          textWidth = fontRegular.widthOfTextAtSize(displayText + "...", fontSize);
        }
        if (displayText.length > 0) {
          displayText += "...";
        }
      }

      page.drawText(displayText, {
        x: columnPositions[i] + cellPadding,
        y: y - rowHeight + 12,
        size: fontSize,
        font: fontRegular,
        color: negro,
      });
    });

    y -= rowHeight;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
