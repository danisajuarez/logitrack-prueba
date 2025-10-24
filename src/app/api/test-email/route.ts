import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { generateNegocioHTML } from "@/lib/email";
import { generateNegocioPDF } from "@/lib/pdf";

// No inicializamos Resend si falta la API key; validamos dentro del handler

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "RESEND_API_KEY no está configurada en el entorno de Vercel" },
      { status: 500 }
    );
  }
  const resend = new Resend(apiKey);
  const url = new URL(req.url);
  const to = url.searchParams.get("to") || process.env.MAIL_TEST || process.env.EMAIL_TEST || undefined;
  const attach = url.searchParams.get("attach") === "1" || url.searchParams.get("pdf") === "1";

  if (!to) {
    return NextResponse.json({ error: "Falta ?to= o configurar MAIL_TEST/EMAIL_TEST" }, { status: 400 });
  }

  const from =
    process.env.EMAIL_FROM ||
    process.env.MAIL_FROM ||
    "onboarding@resend.dev";

  // Datos de ejemplo realistas
  const testData = {
    numeroNegocio: "TEST-001",
    fecha: new Date().toISOString(),
    fechaVencimiento: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    proveedor: "TEST PROVEEDOR S.A.",
    proveedorCuit: "30-12345678-9",
    procedencia: "Rosario",
    destino: "Buenos Aires",
    intermediario: "INTERMEDIARIO SRL",
    transportista: "TRANSPORTES EJEMPLO SRL",
    transportistaCuit: "30-99887766-5",
    chofer: "Juan Pérez",
    choferCuit: "23-22334455-9",
    patenteChasis: "AB123CD",
    patenteAcoplado: "AC456BC",
    articulo: "Soja Granel",
    tarifa: 50000,
    cupos: 10,
    vendedor: "Gustavo Vendedor",
  } as const;

  const html = generateNegocioHTML(testData);

  let attachments: any[] | undefined;
  if (attach) {
    const pdf = await generateNegocioPDF(testData);
    attachments = [
      {
        filename: `negocio-${testData.numeroNegocio}.pdf`,
        content: Buffer.from(pdf).toString("base64"),
      },
    ];
  }

  const subject = `Nuevo Negocio Registrado - N° ${testData.numeroNegocio}`;

  const result = await resend.emails.send({
    from,
    to,
    subject,
    html,
    attachments,
  });

  if (result.error) {
    return NextResponse.json({ ok: false, error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, sentTo: to, messageId: result.data?.id, attachedPdf: !!attachments });
}
