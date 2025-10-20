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

    const fechaActual = new Date();
    const fechaSQL = fechaActual.toISOString().slice(0, 19).replace("T", " ");

    // Obtener conexión para transacción
    connection = await db.getConnection();
    await connection.beginTransaction();

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
        origen,
        destino,
        articulo,
        1, // EQU_IDEquipo
        cuposNum,
        reservadosNum,
        pendientesNum,
        tarifaNum,
        vendedor ? parseInt(vendedor) : null,
        1, // USU_IdUsuario - hardcoded por ahora
      ]
    );

    const entIdEnt = resultEnt.insertId;

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
        vendedor ? parseInt(vendedor) : 2,
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
        '7', // art_idarticulo
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
    // PASO 5: OPCIONAL - Insertar en SIGE_OCP_OrdCarPor (combustible/adelantos)
    // ============================================
    // Por ahora dejamos esto para cuando se asignen choferes
    // Ya que esto se hace en /api/viajes/autorizaciones

    // Commit de la transacción
    await connection.commit();
    connection.release();

    return NextResponse.json({
      success: true,
      message: "Viaje creado exitosamente en todas las tablas",
      data: {
        entIdEnt,
        entNumero,
        ecpIdEcp,
        ecpNumero: ecpNumeroStr,
      },
      numero: entNumero, // Para compatibilidad con el frontend
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
