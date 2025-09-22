import type { PoolConnection } from "mysql2/promise";
import { db } from "./db";

type Queryable = Pick<PoolConnection, "query"> | typeof db;

const ACTIVE_STATES = new Set([
  "A",
  "ACTIVO",
  "ACTIVE",
  "VIGENTE",
  "1",
  "S",
  "SI",
  "Y",
  "YES",
  "HABILITADO",
  "HABILITADA",
]);

export interface ChoferRelacion {
  choferId: number;
  transportistaId: number;
  transportistaNombre: string | null;
  transportistaCuit: string | null;
  transportistaTelefono: string | null;
  transportistaDireccion: string | null;
  patChasis: string;
  patAcoplado: string | null;
  relacionActiva: boolean;
}

interface TransportistaInfo {
  transportistaId: number;
  transportistaNombre: string | null;
  transportistaCuit: string | null;
  transportistaTelefono: string | null;
  transportistaDireccion: string | null;
}

function normalizeNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeString(value: unknown): string | null {
  if (value == null) return null;
  const str = String(value).trim();
  return str.length ? str : null;
}

function isActiveRow(row: Record<string, any>): boolean {
  const rawActivo = row.activo ?? row.TVP_Activo ?? row.activoFlag ?? row.ACTIVO;
  if (rawActivo != null) {
    const num = Number(rawActivo);
    if (Number.isFinite(num)) {
      if (num === 0) return false;
      return num === 1 || num === 2;
    }
    const normalized = normalizeString(rawActivo);
    if (normalized) {
      const upper = normalized.toUpperCase();
      if (ACTIVE_STATES.has(upper)) return true;
      if (["0", "N", "NO", "I", "INACTIVO", "BAJA", "B"].includes(upper)) return false;
    }
  }

  const rawEstado = normalizeString(row.estado ?? row.TVP_Estado ?? row.estadoRelacion ?? row.estado_relacion);
  if (rawEstado) {
    const upper = rawEstado.toUpperCase();
    if (ACTIVE_STATES.has(upper)) return true;
    if (["INACTIVO", "BAJA", "B", "I", "DESHABILITADO", "DESHABILITADA"].includes(upper)) return false;
  }

  const rawFechaBaja = normalizeString(row.fechaBaja ?? row.TVP_FecBaja ?? row.TVP_FechaBaja ?? row.fecha_baja);
  if (rawFechaBaja) return false;

  return true;
}

function pickTransportista(row: Record<string, any>, choferId: number): TransportistaInfo | null {
  const idA = normalizeNumber(row.TER_IDTercero ?? row.terId ?? row.terceroId ?? row.tercero_id);
  const idB = normalizeNumber(row.TER_IDTerceroAsoc ?? row.terIdAsoc ?? row.asociadoId ?? row.terceroAsociadoId);

  const choferMatchesA = idA === choferId;
  const choferMatchesB = idB === choferId;

  if (!choferMatchesA && !choferMatchesB) return null;

  const transportistaId = choferMatchesA ? idB : idA;
  if (!transportistaId) return null;

  const nombre = choferMatchesA
    ? row.transAsocNombre ?? row.TRA_NomTrans_asoc ?? row.transportistaNombre ?? row.nombreTransportista
    : row.transChoferNombre ?? row.TRA_NomTrans ?? row.transportistaNombre ?? row.nombreTransportista;

  const cuit = choferMatchesA
    ? row.transAsocCuit ?? row.TRA_CUITTrans_asoc ?? row.transportistaCuit
    : row.transChoferCuit ?? row.TRA_CUITTrans ?? row.transportistaCuit;

  const telefono = choferMatchesA
    ? row.transAsocTel ?? row.TRA_TelTrans_asoc ?? row.transportistaTelefono
    : row.transChoferTel ?? row.TRA_TelTrans ?? row.transportistaTelefono;

  const direccion = choferMatchesA
    ? row.transAsocDir ?? row.TRA_DirTrans_asoc ?? row.transportistaDireccion
    : row.transChoferDir ?? row.TRA_DirTrans ?? row.transportistaDireccion;

  return {
    transportistaId,
    transportistaNombre: normalizeString(nombre),
    transportistaCuit: normalizeString(cuit),
    transportistaTelefono: normalizeString(telefono),
    transportistaDireccion: normalizeString(direccion),
  };
}

async function fetchTransportistaFallback(
  client: Queryable,
  transportistaId: number
): Promise<Omit<TransportistaInfo, "transportistaId">> {
  try {
    const [rows] = await (client as any).query(
      `SELECT
        TRA_NomTrans AS nombre,
        TRA_CUITTrans AS cuit,
        TRA_TelTrans AS telefono,
        TRA_DirTrans AS direccion
      FROM sige_tra_transport
      WHERE TRA_IDTransporte = ?
      LIMIT 1`,
      [transportistaId]
    );
    if (Array.isArray(rows) && rows.length) {
      const row = rows[0] as Record<string, any>;
      return {
        transportistaNombre: normalizeString(row.nombre ?? row.TRA_NomTrans),
        transportistaCuit: normalizeString(row.cuit ?? row.TRA_CUITTrans),
        transportistaTelefono: normalizeString(row.telefono ?? row.TRA_TelTrans),
        transportistaDireccion: normalizeString(row.direccion ?? row.TRA_DirTrans),
      };
    }
  } catch (error: any) {
    const code = typeof error?.code === "string" ? error.code : null;
    if (!code || !code.startsWith("ER_")) {
      throw error;
    }
  }

  try {
    const [rows] = await (client as any).query(
      `SELECT
        TER_RazonSocialTer AS nombre,
        TER_CUITTer AS cuit,
        TER_TelefonoTer AS telefono,
        TER_DireccionTer AS direccion
      FROM sige_ter_tercero
      WHERE TER_IDTercero = ?
      LIMIT 1`,
      [transportistaId]
    );
    if (Array.isArray(rows) && rows.length) {
      const row = rows[0] as Record<string, any>;
      return {
        transportistaNombre: normalizeString(row.nombre ?? row.TER_RazonSocialTer),
        transportistaCuit: normalizeString(row.cuit ?? row.TER_CUITTer),
        transportistaTelefono: normalizeString(row.telefono ?? row.TER_TelefonoTer),
        transportistaDireccion: normalizeString(row.direccion ?? row.TER_DireccionTer),
      };
    }
  } catch (error: any) {
    const code = typeof error?.code === "string" ? error.code : null;
    if (code && code.startsWith("ER_")) {
      return {
        transportistaNombre: null,
        transportistaCuit: null,
        transportistaTelefono: null,
        transportistaDireccion: null,
      };
    }
    throw error;
  }

  return {
    transportistaNombre: null,
    transportistaCuit: null,
    transportistaTelefono: null,
    transportistaDireccion: null,
  };
}

async function obtenerFilasRelacion(
  runner: Queryable,
  choferId: number
): Promise<any[]> {
  const params = [choferId, choferId];

  const queryConEstados = `
    SELECT
      rel.TER_IDTercero,
      rel.TER_IDTerceroAsoc,
      rel.TVP_Patente,
      rel.TVP_PatenteAcoplado,
      rel.TVP_Estado,
      rel.TVP_Activo,
      rel.TVP_FecBaja,
      transChofer.TRA_NomTrans AS transChoferNombre,
      transChofer.TRA_CUITTrans AS transChoferCuit,
      transChofer.TRA_TelTrans AS transChoferTel,
      transChofer.TRA_DirTrans AS transChoferDir,
      transAsoc.TRA_NomTrans AS transAsocNombre,
      transAsoc.TRA_CUITTrans AS transAsocCuit,
      transAsoc.TRA_TelTrans AS transAsocTel,
      transAsoc.TRA_DirTrans AS transAsocDir
    FROM sige_tvp_terveipat rel
    LEFT JOIN sige_tra_transport transChofer ON transChofer.TRA_IDTransporte = rel.TER_IDTercero
    LEFT JOIN sige_tra_transport transAsoc ON transAsoc.TRA_IDTransporte = rel.TER_IDTerceroAsoc
    WHERE rel.TER_IDTercero = ? OR rel.TER_IDTerceroAsoc = ?
  `;

  try {
    const [rows] = await (runner as any).query(queryConEstados, params);
    if (Array.isArray(rows)) {
      return rows;
    }
  } catch (error: any) {
    const code = typeof error?.code === "string" ? error.code : null;
    if (code && code !== "ER_NO_SUCH_TABLE" && code !== "ER_BAD_FIELD_ERROR") {
      throw error;
    }
    if (code === "ER_BAD_FIELD_ERROR") {
      const queryBasico = `
        SELECT
          rel.TER_IDTercero,
          rel.TER_IDTerceroAsoc,
          rel.TVP_Patente,
          rel.TVP_PatenteAcoplado,
          NULL AS TVP_Estado,
          NULL AS TVP_Activo,
          NULL AS TVP_FecBaja,
          transChofer.TRA_NomTrans AS transChoferNombre,
          transChofer.TRA_CUITTrans AS transChoferCuit,
          transChofer.TRA_TelTrans AS transChoferTel,
          transChofer.TRA_DirTrans AS transChoferDir,
          transAsoc.TRA_NomTrans AS transAsocNombre,
          transAsoc.TRA_CUITTrans AS transAsocCuit,
          transAsoc.TRA_TelTrans AS transAsocTel,
          transAsoc.TRA_DirTrans AS transAsocDir
        FROM sige_tvp_terveipat rel
        LEFT JOIN sige_tra_transport transChofer ON transChofer.TRA_IDTransporte = rel.TER_IDTercero
        LEFT JOIN sige_tra_transport transAsoc ON transAsoc.TRA_IDTransporte = rel.TER_IDTerceroAsoc
        WHERE rel.TER_IDTercero = ? OR rel.TER_IDTerceroAsoc = ?
      `;
      const [rowsBasicos] = await (runner as any).query(queryBasico, params);
      if (Array.isArray(rowsBasicos)) {
        return rowsBasicos;
      }
    }
    if (code === "ER_NO_SUCH_TABLE") {
      return [];
    }
  }

  return [];
}

export async function obtenerRelacionActivaChofer(
  choferId: number,
  client?: Queryable
): Promise<ChoferRelacion> {
  if (!Number.isInteger(choferId) || choferId <= 0) {
    throw new Error("El identificador de chofer es invalido");
  }

  const runner: Queryable = client ?? db;
  const rawRows = await obtenerFilasRelacion(runner, choferId);

  if (!rawRows.length) {
    throw new Error("El chofer no tiene vehiculos asociados o la relacion esta ausente");
  }

  const normalizados = rawRows
    .map((row) => {
      const transporte = pickTransportista(row, choferId);
      if (!transporte) return null;

      const patChasis = normalizeString(row.TVP_Patente ?? row.patChasis ?? row.patente);
      const patAcoplado = normalizeString(row.TVP_PatenteAcoplado ?? row.patenteAcoplado ?? row.patAcoplado);

      if (!patChasis) return null;

      return {
        choferId,
        transportistaId: transporte.transportistaId,
        transportistaNombre: transporte.transportistaNombre,
        transportistaCuit: transporte.transportistaCuit,
        transportistaTelefono: transporte.transportistaTelefono,
        transportistaDireccion: transporte.transportistaDireccion,
        patChasis,
        patAcoplado,
        estado: row.TVP_Estado ?? row.estado,
        activo: row.TVP_Activo ?? row.activo,
        fechaBaja: row.TVP_FecBaja ?? row.fechaBaja,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (!normalizados.length) {
    throw new Error("No se encontro un vehiculo activo asociado al chofer");
  }

  const activos = normalizados.filter((row) => isActiveRow(row));
  const elegido = activos[0] ?? normalizados[0];

  let { transportistaNombre, transportistaCuit, transportistaTelefono, transportistaDireccion } = elegido;

  if (!transportistaNombre || !transportistaCuit || !transportistaTelefono) {
    const fallback = await fetchTransportistaFallback(runner, elegido.transportistaId);
    transportistaNombre = transportistaNombre || fallback.transportistaNombre;
    transportistaCuit = transportistaCuit || fallback.transportistaCuit;
    transportistaTelefono = transportistaTelefono || fallback.transportistaTelefono;
    transportistaDireccion = transportistaDireccion || fallback.transportistaDireccion;
  }

  return {
    choferId,
    transportistaId: elegido.transportistaId,
    transportistaNombre: transportistaNombre ?? null,
    transportistaCuit: transportistaCuit ?? null,
    transportistaTelefono: transportistaTelefono ?? null,
    transportistaDireccion: transportistaDireccion ?? null,
    patChasis: elegido.patChasis,
    patAcoplado: elegido.patAcoplado ?? null,
    relacionActiva: isActiveRow(elegido),
  };
}
