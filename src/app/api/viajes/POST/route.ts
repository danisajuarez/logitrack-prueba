import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let connection: any = null;

  // VERSION MARKER - Si ves este log, el código nuevo está activo
  console.log("[POST VIAJES] ========== VERSION 2025-11-21-v3 ==========");

  const token = await getToken({ req, secret: process.env.AUTH_SECRET, cookieName: "next-auth.session-token" });
  const usuIdUsuario = token?.id ? Number(token.id) : 1;

  try {
    const data = await req.json();

    const {
      razonSocial,
      origen,
      destino,
      origenId,
      destinoId,
      articulo,
      cupos,
      cuposReservados,
      tarifa,
      tarifaTransportista,
      tolerancia,
      vendedor,
      fecha, // Fecha opcional desde el frontend
    } = data;

    // Validaciones básicas
    if (!razonSocial || !origen || !destino || !articulo) {
      return NextResponse.json(
        {
          error:
            "Faltan campos obligatorios: razonSocial, origen, destino, articulo",
        },
        { status: 400 },
      );
    }

    // Normalizar valores numéricos
    const toNumber = (v: any): number | null => {
      if (v == null) return null;
      const s = String(v).trim().replace(",", ".");
      if (s === "") return null;
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    };

    const cuposNum = toNumber(cupos) ?? 0;
    const reservadosNum = toNumber(data?.reservados ?? cuposReservados) ?? 0;
    const pendientesNum = cuposNum - reservadosNum;
    const tarifaNum = toNumber(tarifa) ?? 0;
    const tarifaTransNum = toNumber(tarifaTransportista) ?? 0;
    const toleranciaNum = toNumber(tolerancia) ?? 0;

    // Validaciones de negocio
    if (tarifaNum < 0) {
      return NextResponse.json(
        { error: "La tarifa no puede ser negativa" },
        { status: 400 },
      );
    }

    if (tarifaTransNum < 0) {
      return NextResponse.json(
        { error: "La tarifa del transportista no puede ser negativa" },
        { status: 400 },
      );
    }

    if (toleranciaNum < 0) {
      return NextResponse.json(
        { error: "La tolerancia no puede ser negativa" },
        { status: 400 },
      );
    }

    if (cuposNum <= 0) {
      return NextResponse.json(
        { error: "Los cupos deben ser mayor a 0" },
        { status: 400 },
      );
    }

    if (reservadosNum > cuposNum) {
      return NextResponse.json(
        {
          error:
            "Los cupos reservados no pueden ser mayores que los cupos totales",
        },
        { status: 400 },
      );
    }

    // Vendedor: puede provenir del selector o de la sesión; si no viene, continuar

    // Fecha: usar la fecha del formulario si viene, o la fecha actual como fallback
    let fechaActual: Date;
    if (fecha && typeof fecha === "string" && fecha.trim() !== "") {
      // El frontend envía formato YYYY-MM-DD, parseamos y agregamos hora actual
      const [year, month, day] = fecha.split("-").map(Number);
      fechaActual = new Date(year, month - 1, day);
      // Agregar la hora actual para mantener consistencia
      const now = new Date();
      fechaActual.setHours(now.getHours(), now.getMinutes(), now.getSeconds());
    } else {
      fechaActual = new Date();
    }
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace("T", " ");

    // Obtener conexión para transacción
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ============================================
    // PASO 0.5: Resolver IDs (tercero, vendedor, localidades)
    // ============================================

    // Resolver TER_IDTercero por razón social y obtener CUIT
    let terIdTercero: number | null = null;
    let terCUIT: string | null = null;
    let terCP: string | null = null; // <--- Nueva variable para el CP

    try {
      const [terRows]: any = await connection.query(
        `SELECT 
            TER_IDTercero AS id, 
            TER_CUITTer AS cuit, 
            TER_CodPostalTer AS cp -- <--- AHORA SÍ LO TRAEMOS
         FROM sige_ter_tercero 
         WHERE TER_RazonSocialTer = ? LIMIT 1`,
        [razonSocial],
      );

      if (Array.isArray(terRows) && terRows.length > 0) {
        terIdTercero = Number(terRows[0].id) || null;
        terCUIT = terRows[0].cuit ? String(terRows[0].cuit) : null;

        // Limpieza: si tiene el error #QNAN, lo dejamos vacío, si no, lo guardamos como texto
        const rawCP = terRows[0].cp ? String(terRows[0].cp).trim() : "";
        terCP = rawCP.includes("#QNAN") ? "" : rawCP;
      }
    } catch (err) {
      console.error("[DEBUG POST] Error buscando tercero:", err);
    }

    const vendedorFromSession = token?.vendedorId ? Number(token.vendedorId) : null;

    let vendedorId: number | null = null;
    try {
      const vendStr = vendedor != null ? String(vendedor).trim() : "";
      if (vendStr !== "") {
        if (/^\d+$/.test(vendStr)) {
          vendedorId = Number(vendStr);
        } else {
          const [venRows]: any = await connection.query(
            `SELECT VEN_IDVendedor AS id FROM sige_ven_vendedor WHERE VEN_NomVen = ? LIMIT 1`,
            [vendStr],
          );
          if (Array.isArray(venRows) && venRows.length > 0) {
            vendedorId = Number(venRows[0].id) || null;
          }
        }
      }
      if (vendedorId == null) vendedorId = vendedorFromSession;
    } catch {}

    // Resolver origen y destino: primero por ID (si viene), luego por nombre
    // NOTA: Los IDs de localidad pueden ser numéricos (ej: 6663) o alfanuméricos (ej: "P3608")
    type LocRow = {
      id: number | string;
      nombre: string;
      proId?: number;
      proNom?: string;
    };
    let orig: LocRow | null = null;
    let dest: LocRow | null = null;

    // Resolver ORIGEN
    try {
      // Si viene origenId, buscar por ID (más confiable)
      if (origenId != null && String(origenId).trim() !== "") {
        const [oRows]: any = await connection.query(
          `SELECT
            l.LOC_IDLocalidad AS id,
            l.LOC_NomLocalidad AS nombre,
            l.PRO_IDProvincia AS proId,
            p.PRO_NomProvincia AS proNom
           FROM sige_loc_localidad l
           LEFT JOIN sige_pro_provincia p ON l.PRO_IDProvincia = p.PRO_IDProvincia
           WHERE l.LOC_IDLocalidad = ? LIMIT 1`,
          [origenId], // Usar el ID tal como viene (string o number)
        );
        if (Array.isArray(oRows) && oRows.length > 0) {
          orig = {
            id: oRows[0].id, // Mantener el tipo original (no convertir a Number)
            nombre: String(oRows[0].nombre ?? origen),
            proId: oRows[0].proId != null ? Number(oRows[0].proId) : undefined,
            proNom: oRows[0].proNom != null ? String(oRows[0].proNom) : undefined,
          };
        }
      }
      // Fallback: buscar por nombre si no se encontró por ID
      if (!orig && origen) {
        const [oRows]: any = await connection.query(
          `SELECT
            l.LOC_IDLocalidad AS id,
            l.LOC_NomLocalidad AS nombre,
            l.PRO_IDProvincia AS proId,
            p.PRO_NomProvincia AS proNom
           FROM sige_loc_localidad l
           LEFT JOIN sige_pro_provincia p ON l.PRO_IDProvincia = p.PRO_IDProvincia
           WHERE l.LOC_NomLocalidad = ? LIMIT 1`,
          [origen],
        );
        if (Array.isArray(oRows) && oRows.length > 0) {
          orig = {
            id: oRows[0].id, // Mantener el tipo original
            nombre: String(oRows[0].nombre ?? origen),
            proId: oRows[0].proId != null ? Number(oRows[0].proId) : undefined,
            proNom: oRows[0].proNom != null ? String(oRows[0].proNom) : undefined,
          };
        }
      }
    } catch (e) {
      console.error("[DEBUG POST] Error buscando localidad origen:", e);
    }

    // Resolver DESTINO
    try {
      // Si viene destinoId, buscar por ID (más confiable)
      if (destinoId != null && String(destinoId).trim() !== "") {
        const [dRows]: any = await connection.query(
          `SELECT
            l.LOC_IDLocalidad AS id,
            l.LOC_NomLocalidad AS nombre,
            l.PRO_IDProvincia AS proId,
            p.PRO_NomProvincia AS proNom
           FROM sige_loc_localidad l
           LEFT JOIN sige_pro_provincia p ON l.PRO_IDProvincia = p.PRO_IDProvincia
           WHERE l.LOC_IDLocalidad = ? LIMIT 1`,
          [destinoId], // Usar el ID tal como viene (string o number)
        );
        if (Array.isArray(dRows) && dRows.length > 0) {
          dest = {
            id: dRows[0].id, // Mantener el tipo original
            nombre: String(dRows[0].nombre ?? destino),
            proId: dRows[0].proId != null ? Number(dRows[0].proId) : undefined,
            proNom: dRows[0].proNom != null ? String(dRows[0].proNom) : undefined,
          };
        }
      }
      // Fallback: buscar por nombre si no se encontró por ID
      if (!dest && destino) {
        const [dRows]: any = await connection.query(
          `SELECT
            l.LOC_IDLocalidad AS id,
            l.LOC_NomLocalidad AS nombre,
            l.PRO_IDProvincia AS proId,
            p.PRO_NomProvincia AS proNom
           FROM sige_loc_localidad l
           LEFT JOIN sige_pro_provincia p ON l.PRO_IDProvincia = p.PRO_IDProvincia
           WHERE l.LOC_NomLocalidad = ? LIMIT 1`,
          [destino],
        );
        if (Array.isArray(dRows) && dRows.length > 0) {
          dest = {
            id: dRows[0].id, // Mantener el tipo original
            nombre: String(dRows[0].nombre ?? destino),
            proId: dRows[0].proId != null ? Number(dRows[0].proId) : undefined,
            proNom: dRows[0].proNom != null ? String(dRows[0].proNom) : undefined,
          };
        }
      }
    } catch (e) {
      console.error("[DEBUG POST] Error buscando localidad destino:", e);
    }

    // Log para debug
    console.log("[DEBUG POST] Localidades resueltas:", {
      origenId,
      destinoId,
      orig: orig ? { id: orig.id, nombre: orig.nombre } : null,
      dest: dest ? { id: dest.id, nombre: dest.nombre } : null,
    });

    // Resolver artículo (ID por descripción)
    let articuloId: string | null = null;
    try {
      const [artRows]: any = await connection.query(
        `SELECT ART_IDArticulo AS id FROM sige_art_articulo WHERE ART_DesArticulo = ? LIMIT 1`,
        [articulo],
      );
      if (Array.isArray(artRows) && artRows.length > 0) {
        articuloId = String(artRows[0].id);
      }
    } catch {}

    // ============================================
    // PASO 1: Insertar en sige_ent_encnegtra
    // ============================================

    console.log("[DEBUG] Obteniendo siguiente ID para sige_ent_encnegtra...");

    // ENT_IdEnt NO es AUTO_INCREMENT, debemos usar el autonumerador
    const [rowsAutonumEnt]: any = await connection.query(
      "SELECT AUT_Numero, AUT_Tabla FROM sige_aut_autonum WHERE LOWER(AUT_Tabla) = LOWER(?) FOR UPDATE",
      ["sige_ent_encnegtra"],
    );

    console.log("[DEBUG] Autonumerador ENT:", JSON.stringify(rowsAutonumEnt));

    if (!rowsAutonumEnt || rowsAutonumEnt.length === 0) {
      throw new Error(
        "No existe numerador configurado para sige_ent_encnegtra en la tabla sige_aut_autonum.",
      );
    }

    const tablaOriginalEnt = rowsAutonumEnt[0].AUT_Tabla;
    const autNumeroActualEnt = rowsAutonumEnt[0].AUT_Numero;

    if (autNumeroActualEnt == null || autNumeroActualEnt === "") {
      throw new Error(
        `El autonumerador ENT tiene valor inválido: ${autNumeroActualEnt}`,
      );
    }

    const entIdEnt = Number(autNumeroActualEnt) + 1;

    console.log("[DEBUG] Nuevo ENT_IdEnt:", entIdEnt);

    if (!Number.isFinite(entIdEnt) || entIdEnt <= 0) {
      throw new Error(`ENT_IdEnt calculado es inválido: ${entIdEnt}`);
    }

    // Actualizar el autonumerador
    await connection.execute(
      "UPDATE sige_aut_autonum SET AUT_Numero = ? WHERE AUT_Tabla = ?",
      [entIdEnt, tablaOriginalEnt],
    );

    const entNumero = String(entIdEnt); // Sin ceros a la izquierda

    console.log(
      "[DEBUG] Insertando en sige_ent_encnegtra con ENT_IdEnt:",
      entIdEnt,
    );

    await connection.execute(
      `INSERT INTO sige_ent_encnegtra (
        ENT_IdEnt,
        ENT_Fecha,
        TER_RazonSocialTer,
        LOC_NomLocalidadOrig,
        LOC_NomLocalidadDest,
        TVP_Caracteristicas,
        EQU_IDEquipo,
        ENT_CantCupos,
        ENT_CantCuposReser,
        ENT_CantCuposPend,
        ENT_Tarifa,
        VEN_IdVendPostula,
        USU_IdUsuario
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entIdEnt, // Especificar el ID manualmente
        fechaSQL,
        razonSocial,
        orig?.nombre ?? origen,
        dest?.nombre ?? destino,
        "", // TVP_Caracteristicas - debe ir VACÍO (no descripción de artículo)
        1, // EQU_IDEquipo
        cuposNum,
        reservadosNum,
        pendientesNum,
        tarifaNum,
        vendedorId,
        usuIdUsuario,
      ],
    );

    console.log("[DEBUG] INSERT a sige_ent_encnegtra exitoso");

    // Actualizar ENT_Numero con el ID generado
    await connection.execute(
      `UPDATE sige_ent_encnegtra SET ENT_Numero = ? WHERE ENT_IdEnt = ?`,
      [entNumero, entIdEnt],
    );
    // Asegurar campos derivados según requerimientos
    try {
      // ENT_FechaVencimiento = ENT_Fecha
      // TCP_IDTipoComp = 60 (tipo de comprobante)
      await connection.execute(
        `UPDATE sige_ent_encnegtra
         SET TCP_IDTipoComp = 60,
             ENT_FechaVencimiento = COALESCE(ENT_FechaVencimiento, ENT_Fecha)
         WHERE ENT_IdEnt = ?`,
        [entIdEnt],
      );
    } catch {}

    // Completar campos por defecto solicitados (mejor por separado, por si alguna columna no existe)
    try {
      if (terIdTercero != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET TER_IDTercero = ? WHERE ENT_IdEnt = ?`,
          [terIdTercero, entIdEnt],
        );
      }
    } catch {}
    try {
      if (orig?.id != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET LOC_IDLocalidadOrig = ? WHERE ENT_IdEnt = ?`,
          [orig.id, entIdEnt],
        );
      }
    } catch {}
    try {
      if (orig?.proId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_IDProvinciaOrig = ? WHERE ENT_IdEnt = ?`,
          [orig.proId, entIdEnt],
        );
      }
    } catch {}
    try {
      if (orig?.proNom != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_NomProvinciaOrig = ? WHERE ENT_IdEnt = ?`,
          [orig.proNom, entIdEnt],
        );
      }
    } catch {}
    try {
      if (dest?.id != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET LOC_IDLocalidadDest = ? WHERE ENT_IdEnt = ?`,
          [dest.id, entIdEnt],
        );
      }
    } catch {}
    try {
      if (dest?.proId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_IDProvinciaDest = ? WHERE ENT_IdEnt = ?`,
          [dest.proId, entIdEnt],
        );
      }
    } catch {}
    try {
      if (dest?.proNom != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_NomProvinciaDest = ? WHERE ENT_IdEnt = ?`,
          [dest.proNom, entIdEnt],
        );
      }
    } catch {}
    try {
      if (vendedorId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET VEN_IdVendPostula = ? WHERE ENT_IdEnt = ?`,
          [vendedorId, entIdEnt],
        );
      }
    } catch {}
    try {
      if (vendedorId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET VEN_IdVendedor = ? WHERE ENT_IdEnt = ?`,
          [vendedorId, entIdEnt],
        );
      }
    } catch {}
    try {
      await connection.execute(
        `UPDATE sige_ent_encnegtra SET ENT_TarifaTrans = ? WHERE ENT_IdEnt = ?`,
        [tarifaTransNum, entIdEnt],
      );
    } catch {}
    try {
      await connection.execute(
        `UPDATE sige_ent_encnegtra SET ENT_Tolerancia = ? WHERE ENT_IdEnt = ?`,
        [toleranciaNum, entIdEnt],
      );
    } catch {}

    // TVP_Caracteristicas se deja vacío - NO se actualiza con el artículo

    // ============================================
    // NOTA: La carta de porte (sige_ecp_enccarpor) y el detalle de producto
    // (SIGE_DCP_DetCarPor) se crean cuando se postula el primer chofer,
    // no al crear el negocio. Ver /api/viajes/postular-chofer
    // ============================================

    // ============================================
    // PASO 2: Detalle de Negocio (sige_dnt_detnegtra)
    // ============================================
    try {
      await connection.execute(
        `INSERT INTO sige_dnt_detnegtra (
          ENT_IdEnt,
          DNT_Renglon,
          ART_IdArticulo,
          DNT_Detalle,
          DNT_Cosecha
        ) VALUES (?, 1, ?, ?, '')`,
        [entIdEnt, articuloId ?? "7", articulo || ""],
      );
    } catch (e) {
      try {
        await connection.execute(
          `INSERT INTO sige_dnt_detnegtra (
            ENT_IdEnt,
            DNT_Renglon,
            ART_IdArticulo,
            ART_DesArticulo,
            DNT_Cosecha
          ) VALUES (?, 1, ?, ?, '')`,
          [entIdEnt, articuloId ?? "7", articulo || ""],
        );
      } catch (e2) {
        try {
          await connection.execute(
            `INSERT INTO sige_dnt_detnegtra (
              ent_ident,
              dnt_renglondcp,
              art_idarticulo,
              art_desarticulo,
              dnt_cosecha
            ) VALUES (?, 1, ?, ?, '')`,
            [entIdEnt, articuloId ?? "7", articulo || ""],
          );
        } catch (e3) {
          console.warn(
            "[DEBUG] No se pudo insertar detalle de negocio en sige_dnt_detnegtra (todos los intentos):",
            e3,
          );
        }
      }
    }

    // ============================================
    // PASO 6: OPCIONAL - Insertar en SIGE_OCP_OrdCarPor (combustible/adelantos)
    // ============================================
    // Se gestiona en /api/viajes/autorizaciones

    // Commit de la transacción
    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Negocio creado exitosamente. La carta de porte se generará al postular un chofer.",
      data: {
        entIdEnt,
        entNumero: entNumero,
      },
      numero: entNumero,
    });
  } catch (error: any) {
    // Rollback en caso de error
    if (connection) {
      try {
        await connection.rollback();
        connection.release();
      } catch (rollbackErr) {
        console.error("Error en rollback:", rollbackErr);
      }
    }

    console.error("Error al crear viaje:", error);
    return NextResponse.json(
      {
        error: "Error al crear el viaje",
        details: error?.message,
        stack:
          process.env.NODE_ENV === "development" ? error?.stack : undefined,
      },
      { status: 500 },
    );
  }
}
