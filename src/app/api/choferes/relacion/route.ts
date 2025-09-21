import { NextRequest, NextResponse } from "next/server";
import { obtenerRelacionActivaChofer } from "@/lib/choferes";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const choferIdParam = searchParams.get("choferId");
  const choferId = choferIdParam ? Number(choferIdParam) : NaN;

  if (!Number.isInteger(choferId) || choferId <= 0) {
    return NextResponse.json(
      { error: "Debe enviar un choferId válido" },
      { status: 400 }
    );
  }

  try {
    const relacion = await obtenerRelacionActivaChofer(choferId);

    return NextResponse.json({
      choferId: relacion.choferId,
      relacionActiva: relacion.relacionActiva,
      transportista: {
        id: relacion.transportistaId,
        nombre: relacion.transportistaNombre,
        cuit: relacion.transportistaCuit,
        telefono: relacion.transportistaTelefono,
        direccion: relacion.transportistaDireccion,
      },
      patChasis: relacion.patChasis,
      patAcoplado: relacion.patAcoplado,
    });
  } catch (error: any) {
    const message = error?.message ?? "No se pudo obtener la relación del chofer";
    const status = typeof error?.statusCode === "number" ? error.statusCode : 404;
    return NextResponse.json({ error: message }, { status });
  }
}
