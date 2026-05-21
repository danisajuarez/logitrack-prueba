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
    // PASO 2: Insertar en sige_ecp_enccarpor (Carta Porte)
    // ============================================

    // Obtener el siguiente número de carta porte usando autonumerador
    console.log("[DEBUG] Intentando obtener número de carta porte...");

    // Primero obtenemos el número actual y lo incrementamos en una sola operación atómica
    // Nota: AUT_Tabla puede tener diferentes cases, usamos LOWER() para comparar
    const [rowsAutonum]: any = await connection.query(
      "SELECT AUT_Numero, AUT_Tabla FROM sige_aut_autonum WHERE LOWER(AUT_Tabla) = LOWER(?) FOR UPDATE",
      ["sige_ecp_enccarpor"],
    );

    console.log(
      "[DEBUG] Resultado autonumerador:",
      JSON.stringify(rowsAutonum),
    );

    if (!rowsAutonum || rowsAutonum.length === 0) {
      throw new Error(
        "No existe numerador configurado para sige_ecp_enccarpor en la tabla sige_aut_autonum.",
      );
    }

    const tablaOriginal = rowsAutonum[0].AUT_Tabla; // Guardar el nombre exacto
    const autNumeroActual = rowsAutonum[0].AUT_Numero;

    console.log(
      "[DEBUG] AUT_Numero actual (raw):",
      autNumeroActual,
      "tipo:",
      typeof autNumeroActual,
    );

    // Validar que tenemos un número válido
    if (autNumeroActual == null || autNumeroActual === "") {
      throw new Error(
        `El autonumerador tiene valor inválido: ${autNumeroActual}`,
      );
    }

    const ecpNumero = Number(autNumeroActual) + 1;

    console.log(
      "[DEBUG] ecpNumero calculado:",
      ecpNumero,
      "tipo:",
      typeof ecpNumero,
    );

    // Validación estricta
    if (!Number.isFinite(ecpNumero) || ecpNumero <= 0) {
      throw new Error(
        `El número de carta porte calculado es inválido: ${ecpNumero} (de autNumeroActual: ${autNumeroActual})`,
      );
    }

    // Actualizar el autonumerador usando el nombre exacto de la tabla
    await connection.execute(
      "UPDATE sige_aut_autonum SET AUT_Numero = ? WHERE AUT_Tabla = ?",
      [ecpNumero, tablaOriginal],
    );

    console.log("[DEBUG] Autonumerador actualizado a:", ecpNumero);

    // Por si acaso el ECP_Numero ya está en uso, intentamos con el formato correcto
    const ecpNumeroStr = String(ecpNumero); // Sin ceros a la izquierda
    console.log("[DEBUG] ECP Numero formateado:", ecpNumeroStr);

    // ECP_IdEcp NO es AUTO_INCREMENT, usamos el mismo número que obtuvimos
    const ecpIdEcp = ecpNumero; // Usar el número del autonumerador como ID

    console.log("[DEBUG] ecpIdEcp final:", ecpIdEcp, "tipo:", typeof ecpIdEcp);

    // Verificación adicional antes del INSERT
    if (ecpIdEcp === 0 || !Number.isFinite(ecpIdEcp)) {
      throw new Error(
        `ERROR CRÍTICO: ecpIdEcp es inválido (${ecpIdEcp}). No se puede insertar.`,
      );
    }

    console.log("[DEBUG] *** ANTES DE INSERT sige_ecp_enccarpor ***");
    console.log("[DEBUG] ecpIdEcp que se va a insertar:", ecpIdEcp);
    console.log("[DEBUG] ecpNumeroStr:", ecpNumeroStr);
    console.log("[DEBUG] entIdEnt:", entIdEnt);

    const [resultEcp] = await connection.execute(
      `INSERT INTO sige_ecp_enccarpor (
        ECP_IdEcp,
        ECP_Numero,
        ECP_Fecha,
        ECP_FechaVencimiento,
        TCP_IDTipoComp,
        EPC_IdEpd,
        TER_IDTerceroEst,
        TER_RazonSocialTerEst,
        LOC_NomLocalidadEst,
        LOC_NomLocalidadGran,
        ECP_Tarifa,
        ECP_TarifaTrans,
        ENT_Tolerancia,
        TVP_Caracteristicas,
        DEP_IDDeposito,
        ENT_IdEnt,
        VEN_IdVendPostula,
        USU_IdUsuario,
        EQU_IDEquipo,
        ECP_PreCartaPorte,
        ECP_CancCompra,
        ECP_CancVenta
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ecpIdEcp,
        ecpNumeroStr,
        fechaSQL,
        fechaSQL,
        38,
        0,
        terIdTercero ?? 15,
        razonSocial,
        orig?.nombre ?? origen,
        dest?.nombre ?? destino,
        tarifaNum,
        tarifaTransNum,
        toleranciaNum,
        "",
        1,
        entIdEnt,
        vendedorId,
        usuIdUsuario,
        1,
        "S",
        "N",
        "N",
      ],
    );

    console.log(
      "[DEBUG] Carta porte insertada exitosamente con ECP_IdEcp:",
      ecpIdEcp,
    );

    // VERIFICACIÓN CRÍTICA: Confirmar que la carta de porte se creó correctamente
    const [verificacionEcp]: any = await connection.query(
      "SELECT ECP_IdEcp FROM sige_ecp_enccarpor WHERE ECP_IdEcp = ? AND ENT_IdEnt = ?",
      [ecpIdEcp, entIdEnt],
    );

    if (!verificacionEcp || verificacionEcp.length === 0) {
      console.error(
        "[ERROR CRÍTICO] La carta de porte NO se encontró después del INSERT. ecpIdEcp:",
        ecpIdEcp,
        "entIdEnt:",
        entIdEnt,
      );
      throw new Error(
        `Error crítico: La carta de porte ${ecpIdEcp} no se creó correctamente para el viaje ${entIdEnt}`,
      );
    }

    console.log("[DEBUG] Verificación OK: Carta de porte confirmada en BD");

    // Completar campos adicionales de localidades y provincias en carta porte
    // LOC_NomLocalidadEst = origen, LOC_NomLocalidadGran = destino
    try {
      if (orig?.id != null) {
        await connection.execute(
          `UPDATE sige_ecp_enccarpor SET LOC_IDLocalidadEst = ? WHERE ECP_IdEcp = ?`,
          [orig.id, ecpIdEcp],
        );
      }
    } catch {}
    try {
      if (orig?.proId != null) {
        await connection.execute(
          `UPDATE sige_ecp_enccarpor SET PRO_IDProvinciaEst = ? WHERE ECP_IdEcp = ?`,
          [orig.proId, ecpIdEcp],
        );
      }
    } catch {}
    try {
      if (orig?.proNom != null) {
        await connection.execute(
          `UPDATE sige_ecp_enccarpor SET PRO_NomProvinciaEst = ? WHERE ECP_IdEcp = ?`,
          [orig.proNom, ecpIdEcp],
        );
      }
    } catch {}
    try {
      if (dest?.id != null) {
        await connection.execute(
          `UPDATE sige_ecp_enccarpor SET LOC_IDLocalidadGran = ? WHERE ECP_IdEcp = ?`,
          [dest.id, ecpIdEcp],
        );
      }
    } catch {}
    try {
      if (dest?.proId != null) {
        await connection.execute(
          `UPDATE sige_ecp_enccarpor SET PRO_IDProvinciaGran = ? WHERE ECP_IdEcp = ?`,
          [dest.proId, ecpIdEcp],
        );
      }
    } catch {}
    try {
      if (dest?.proNom != null) {
        await connection.execute(
          `UPDATE sige_ecp_enccarpor SET PRO_NomProvinciaGran = ? WHERE ECP_IdEcp = ?`,
          [dest.proNom, ecpIdEcp],
        );
      }
    } catch {}

    // ============================================
    // PASO 3: Insertar detalle de producto en SIGE_DCP_DetCarPor
    // ============================================
    console.log("[DEBUG] Insertando detalle de producto para ECP:", ecpIdEcp);
    try {
      await connection.execute(
        `INSERT INTO SIGE_DCP_DetCarPor (
          ecp_idecp,
          dcp_renglondcp,
          art_idarticulo,
          art_desarticulo,
          dcp_cosecha,
          dcp_pesobruto,
          dcp_pesotara,
          dcp_pesoneto,
          DCP_PesoBrutoDescarga,
          DCP_PesoTaraDescarga,
          DCP_PesoNetoDescarga,
          DEP_IDDeposito
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ecpIdEcp,
          1, // dcp_renglondcp
          articuloId ?? "7", // art_idarticulo (fallback '7')
          articulo, // art_desarticulo
          "", // dcp_cosecha
          0.0, // dcp_pesobruto
          0.0, // dcp_pesotara
          0.0, // dcp_pesoneto
          0.0, // DCP_PesoBrutoDescarga
          0.0, // DCP_PesoTaraDescarga
          0.0, // DCP_PesoNetoDescarga
          1, // DEP_IDDeposito
        ],
      );
      console.log("[DEBUG] Detalle de producto insertado correctamente");
    } catch (dcpError: any) {
      console.error(
        "[ERROR] Falló INSERT de detalle de producto:",
        dcpError?.message,
        "Code:",
        dcpError?.code,
      );
      if (dcpError?.code !== "ER_DUP_ENTRY") {
        throw dcpError;
      }
      console.log("[DEBUG] Detalle ya existía (ER_DUP_ENTRY), continuando...");
    }

    // Verificar que el detalle se creó
    const [verificacionDcp]: any = await connection.query(
      "SELECT 1 FROM SIGE_DCP_DetCarPor WHERE ecp_idecp = ?",
      [ecpIdEcp],
    );
    if (!verificacionDcp || verificacionDcp.length === 0) {
      console.error(
        "[ERROR CRÍTICO] El detalle de producto NO se encontró después del INSERT. ecpIdEcp:",
        ecpIdEcp,
      );
      throw new Error(
        `Error crítico: El detalle de producto no se creó para la carta de porte ${ecpIdEcp}`,
      );
    }
    console.log("[DEBUG] Verificación OK: Detalle de producto confirmado en BD");

    // ============================================
    // PASO 5: Detalle de Negocio (sige_dnt_detnegtra)
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
      message: "Viaje creado exitosamente en todas las tablas",
      data: {
        entIdEnt,
        entNumero: entNumero,
        ecpIdEcp,
        ecpNumero: ecpNumeroStr,
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
