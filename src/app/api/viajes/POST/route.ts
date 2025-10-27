import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let connection: any = null;

  try {
    const data = await req.json();

    const {
      razonSocial,
      origen,
      destino,
      articulo,
      cupos,
      cuposReservados,
      tarifa,
      vendedor,
    } = data;

    // Validaciones básicas
    if (!razonSocial || !origen || !destino || !articulo) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: razonSocial, origen, destino, articulo" },
        { status: 400 }
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

    // Vendedor: puede provenir del selector o de la sesión; si no viene, continuar

    const fechaActual = new Date();
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace("T", " ");

    // Obtener conexión para transacción
    connection = await db.getConnection();
    await connection.beginTransaction();

    // ============================================
    // PASO 0.5: Resolver IDs (tercero, vendedor, localidades)
    // ============================================

    // Resolver TER_IDTercero por razón social
    let terIdTercero: number | null = null;
    try {
      const [terRows]: any = await connection.query(
        `SELECT TER_IDTercero AS id FROM sige_ter_tercero WHERE TER_RazonSocialTer = ? LIMIT 1`,
        [razonSocial]
      );
      if (Array.isArray(terRows) && terRows.length > 0) {
        terIdTercero = Number(terRows[0].id) || null;
      }
    } catch {}

    // Resolver vendedor: por id/nombre o caer a la sesión
    let vendedorId: number | null = null;
    let vendedorFromSession: number | null = null;
    try {
      const raw = req.cookies.get("session")?.value;
      if (raw) {
        const sess = JSON.parse(raw);
        if (sess && sess.vendedorId != null) {
          vendedorFromSession = Number(sess.vendedorId);
          if (!Number.isFinite(vendedorFromSession)) vendedorFromSession = null;
        }
      }
    } catch {}
    try {
      const vendStr = vendedor != null ? String(vendedor).trim() : "";
      if (vendStr !== "") {
        if (/^\d+$/.test(vendStr)) {
          vendedorId = Number(vendStr);
        } else {
          const [venRows]: any = await connection.query(
            `SELECT VEN_IDVendedor AS id FROM sige_ven_vendedor WHERE VEN_NomVen = ? LIMIT 1`,
            [vendStr]
          );
          if (Array.isArray(venRows) && venRows.length > 0) {
            vendedorId = Number(venRows[0].id) || null;
          }
        }
      }
      if (vendedorId == null) vendedorId = vendedorFromSession;
    } catch {}

    // Resolver origen y destino por nombre de localidad
    type LocRow = { id: number; nombre: string; proId?: number; proNom?: string };
    let orig: LocRow | null = null;
    let dest: LocRow | null = null;
    try {
      const [oRows]: any = await connection.query(
        `SELECT LOC_IDLocalidad AS id, LOC_NomLocalidad AS nombre,
                PRO_IDProvincia AS proId, PRO_NomProvincia AS proNom
         FROM sige_loc_localidad WHERE LOC_NomLocalidad = ? LIMIT 1`,
        [origen]
      );
      if (Array.isArray(oRows) && oRows.length > 0) {
        orig = {
          id: Number(oRows[0].id),
          nombre: String(oRows[0].nombre ?? origen),
          proId: oRows[0].proId != null ? Number(oRows[0].proId) : undefined,
          proNom: oRows[0].proNom != null ? String(oRows[0].proNom) : undefined,
        };
      }
    } catch {}
    try {
      const [dRows]: any = await connection.query(
        `SELECT LOC_IDLocalidad AS id, LOC_NomLocalidad AS nombre,
                PRO_IDProvincia AS proId, PRO_NomProvincia AS proNom
         FROM sige_loc_localidad WHERE LOC_NomLocalidad = ? LIMIT 1`,
        [destino]
      );
      if (Array.isArray(dRows) && dRows.length > 0) {
        dest = {
          id: Number(dRows[0].id),
          nombre: String(dRows[0].nombre ?? destino),
          proId: dRows[0].proId != null ? Number(dRows[0].proId) : undefined,
          proNom: dRows[0].proNom != null ? String(dRows[0].proNom) : undefined,
        };
      }
    } catch {}

    // Resolver artículo (ID por descripción)
    let articuloId: string | null = null;
    try {
      const [artRows]: any = await connection.query(
        `SELECT ART_IDArticulo AS id FROM sige_art_articulo WHERE ART_DesArticulo = ? LIMIT 1`,
        [articulo]
      );
      if (Array.isArray(artRows) && artRows.length > 0) {
        articuloId = String(artRows[0].id);
      }
    } catch {}

    // ============================================
    // PASO 1: Insertar en sige_ent_encnegtra
    // ============================================

    // Primero obtener el número usando autonumerador
    console.log('[DEBUG] Obteniendo número para sige_ent_encnegtra...');

    const [updAutonumEnt]: any = await connection.execute(
      "UPDATE sige_aut_autonum SET AUT_Numero = LAST_INSERT_ID(AUT_Numero + 1) WHERE AUT_Tabla = ?",
      ['sige_ent_encnegtra']
    );

    console.log('[DEBUG] Update autonum ENT result:', { affectedRows: updAutonumEnt?.affectedRows });

    if (!updAutonumEnt || updAutonumEnt.affectedRows === 0) {
      throw new Error('No existe numerador configurado para sige_ent_encnegtra en la tabla sige_aut_autonum');
    }

    const [rowsEntNum]: any = await connection.query("SELECT LAST_INSERT_ID() AS numero");
    const entNumeroRaw = rowsEntNum?.[0]?.numero;

    console.log('[DEBUG] ENT Numero obtenido:', entNumeroRaw);

    if (!entNumeroRaw && entNumeroRaw !== 0) {
      throw new Error(`No se pudo obtener el número de encnegtra. LAST_INSERT_ID retornó: ${entNumeroRaw}`);
    }

    const entNumero = String(entNumeroRaw).padStart(6, '0');
    console.log('[DEBUG] ENT Numero formateado:', entNumero);

    const [resultEnt] = await connection.execute(
      `INSERT INTO sige_ent_encnegtra (
        ENT_Numero,
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
        entNumero, // Ahora incluimos el número explícitamente
        fechaSQL,
        razonSocial,
        orig?.nombre ?? origen,
        dest?.nombre ?? destino,
        '', // TVP_Caracteristicas en blanco (detalle se guarda en tablas específicas)
        1, // EQU_IDEquipo
        cuposNum,
        reservadosNum,
        pendientesNum,
        tarifaNum,
        vendedorId,
        1, // USU_IdUsuario - hardcoded por ahora
      ]
    );

    const entIdEnt = resultEnt.insertId;
    // Asegurar campos derivados según requerimientos
    try {
      // ENT_FechaVencimiento = ENT_Fecha
      // ENT_Numero = LPAD(ENT_IdEnt, 6, '0')
      // TCP_IDTipoComp = 60 (tipo de comprobante)
      await connection.execute(
        `UPDATE sige_ent_encnegtra
         SET TCP_IDTipoComp = 60,
             ENT_FechaVencimiento = COALESCE(ENT_FechaVencimiento, ENT_Fecha),
             ENT_Numero = LPAD(ENT_IdEnt, 6, '0')
         WHERE ENT_IdEnt = ?`,
        [entIdEnt]
      );
    } catch {}

    // Completar campos por defecto solicitados (mejor por separado, por si alguna columna no existe)
    try {
      if (terIdTercero != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET TER_IDTercero = ? WHERE ENT_IdEnt = ?`,
          [terIdTercero, entIdEnt]
        );
      }
    } catch {}
    try {
      if (orig?.id != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET LOC_IDLocalidadOrig = ? WHERE ENT_IdEnt = ?`,
          [orig.id, entIdEnt]
        );
      }
    } catch {}
    try {
      if (orig?.proId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_IDProvinciaOrig = ? WHERE ENT_IdEnt = ?`,
          [orig.proId, entIdEnt]
        );
      }
    } catch {}
    try {
      if (orig?.proNom != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_NomProvinciaOrig = ? WHERE ENT_IdEnt = ?`,
          [orig.proNom, entIdEnt]
        );
      }
    } catch {}
    try {
      if (dest?.id != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET LOC_IDLocalidadDest = ? WHERE ENT_IdEnt = ?`,
          [dest.id, entIdEnt]
        );
      }
    } catch {}
    try {
      if (dest?.proId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_IDProvinciaDest = ? WHERE ENT_IdEnt = ?`,
          [dest.proId, entIdEnt]
        );
      }
    } catch {}
    try {
      if (dest?.proNom != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET PRO_NomProvinciaDest = ? WHERE ENT_IdEnt = ?`,
          [dest.proNom, entIdEnt]
        );
      }
    } catch {}
    try {
      if (vendedorId != null) {
        await connection.execute(
          `UPDATE sige_ent_encnegtra SET VEN_IdVendPostula = ? WHERE ENT_IdEnt = ?`,
          [vendedorId, entIdEnt]
        );
      }
    } catch {}
    try {
      await connection.execute(
        `UPDATE sige_ent_encnegtra SET TVP_Caracteristicas = '' WHERE ENT_IdEnt = ?`,
        [entIdEnt]
      );
    } catch {}

    // ============================================
    // PASO 2: Insertar en sige_ecp_enccarpor (Carta Porte)
    // ============================================

    // Obtener el siguiente número de carta porte usando autonumerador
    console.log('[DEBUG] Intentando obtener número de carta porte...');

    const [updAutonum]: any = await connection.execute(
      "UPDATE sige_aut_autonum SET AUT_Numero = LAST_INSERT_ID(AUT_Numero + 1) WHERE AUT_Tabla = ?",
      ['sige_ecp_enccarpor']
    );

    console.log('[DEBUG] Update autonum result:', { affectedRows: updAutonum?.affectedRows });

    if (!updAutonum || updAutonum.affectedRows === 0) {
      throw new Error('No existe numerador configurado para sige_ecp_enccarpor en la tabla sige_aut_autonum. Ejecutá: INSERT INTO sige_aut_autonum (AUT_Tabla, AUT_Numero) VALUES ("sige_ecp_enccarpor", 1792);');
    }

    const [rowsEcpNum]: any = await connection.query("SELECT LAST_INSERT_ID() AS numero");
    const ecpNumero = rowsEcpNum?.[0]?.numero;

    console.log('[DEBUG] ECP Numero obtenido:', ecpNumero);

    if (!ecpNumero && ecpNumero !== 0) {
      throw new Error(`No se pudo obtener el número de carta porte del autonumerador. LAST_INSERT_ID retornó: ${ecpNumero}`);
    }

    // Por si acaso el ECP_Numero ya está en uso, intentamos con el formato correcto
    const ecpNumeroStr = String(ecpNumero).padStart(6, '0');
    console.log('[DEBUG] ECP Numero formateado:', ecpNumeroStr);

    // ECP_IdEcp NO es AUTO_INCREMENT, usamos el mismo número que obtuvimos
    const ecpIdEcp = ecpNumero; // Usar el número del autonumerador como ID
    console.log('[DEBUG] Usando ECP_IdEcp:', ecpIdEcp);

    const [resultEcp] = await connection.execute(
      `INSERT INTO sige_ecp_enccarpor (
        ECP_IdEcp,
        ECP_Numero,
        ECP_Fecha,
        TER_IDTerceroEst,
        TER_RazonSocialTerEst,
        LOC_NomLocalidadEst,
        LOC_NomLocalidadGran,
        ECP_Tarifa,
        TVP_Caracteristicas,
        DEP_IDDeposito,
        ENT_IdEnt,
        VEN_IdVendPostula,
        USU_IdUsuario,
        EQU_IDEquipo,
        ECP_PreCartaPorte
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        ecpIdEcp, // Insertar el ID manualmente
        ecpNumeroStr,
        fechaSQL,
        15, // TER_IDTerceroEst - hardcoded, debería venir del cliente seleccionado
        razonSocial,
        destino, // Estación/destino
        origen, // Granel/origen
        tarifaNum,
        articulo,
        1, // DEP_IDDeposito
        entIdEnt, // Relación con sige_ent_encnegtra
        vendedorId,
        1, // USU_IdUsuario
        1, // EQU_IDEquipo
        'N', // Pre carta porte
      ]
    );

    console.log('[DEBUG] Carta porte insertada exitosamente con ECP_IdEcp:', ecpIdEcp);

    // ============================================
    // PASO 3: Insertar intermediarios en sige_icp_intcarpor
    // ============================================

    // Destinatario (orden 1)
    await connection.execute(
      `INSERT INTO sige_icp_intcarpor (
        ECP_IdEcp,
        TIC_IdTic,
        ICP_Orden,
        TIC_DescripcionTic,
        TER_IDTerceroTic,
        TER_RazonSocialTerTic,
        TER_CUITTerTic
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        ecpIdEcp,
        1, // TIC_IdTic para Destinatario
        1, // Orden
        'Destinatario',
        15, // TER_IDTerceroTic - debería venir del cliente
        razonSocial,
        '30-00000000-0', // CUIT - debería venir del cliente
      ]
    );

    // Transportista (orden 2) - OPCIONAL por ahora
    // TODO: Agregar cuando se asigne chofer/transportista

    // Chofer (orden 3) - OPCIONAL por ahora
    // TODO: Agregar cuando se asigne chofer

    // ============================================
    // PASO 4: Insertar detalle de producto en SIGE_DCP_DetCarPor
    // ============================================
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
        articuloId ?? '7', // art_idarticulo (fallback '7')
        articulo, // art_desarticulo
        '', // dcp_cosecha
        0.0, // dcp_pesobruto
        0.0, // dcp_pesotara
        0.0, // dcp_pesoneto
        0.0, // DCP_PesoBrutoDescarga
        0.0, // DCP_PesoTaraDescarga
        0.0, // DCP_PesoNetoDescarga
        1, // DEP_IDDeposito
      ]
    );

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
        [entIdEnt, articuloId ?? '7', articulo]
      );
    } catch (e) {
      // Si falla, no bloquear el resto
      console.warn('[DEBUG] No se pudo insertar detalle de negocio en sige_dnt_detnegtra:', e);
    }

    // ============================================
    // PASO 6: OPCIONAL - Insertar en SIGE_OCP_OrdCarPor (combustible/adelantos)
    // ============================================
    // Se gestiona en /api/viajes/autorizaciones

    // Commit de la transacción
    await connection.commit();
    connection.release();

    const entNumeroResp = String(entIdEnt).padStart(6, '0');
    return NextResponse.json({
      success: true,
      message: "Viaje creado exitosamente en todas las tablas",
      data: {
        entIdEnt,
        entNumero: entNumeroResp,
        ecpIdEcp,
        ecpNumero: ecpNumeroStr,
      },
      numero: entNumeroResp, // Para compatibilidad con el frontend
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
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500 }
    );
  }
}
