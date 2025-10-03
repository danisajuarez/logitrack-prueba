"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import SearchableSelect from "./SearchableSelect";
import Notification from "./Notification";

interface Chofer {
  id: number;
  nombre: string; // ← antes razonSocial
  // si en el futuro necesitás más datos, agregalos como opcionales
  cuit?: string | null;
  telefono?: string | null;
  email?: string | null;
}

interface ChoferOption {
  id: number;
  nombre: string;
}

interface Viaje {
  id: number;
  numero: string;
  fecha: string;
  razonSocial: string;
  origen: string;
  destino: string;
  tarifa: number;
  cupos: number;
  cuposReservados: number;
  cuposPendientes: number;
  usuario: string;
  equipo: string;
  vendedor: string | null;
  articulo: string;
  postulados?: number;
}

interface Vendedor {
  id: number;
  nombre: string;
}

interface TransportistaInfo {
  id: number;
  nombre: string | null;
  cuit: string | null;
  telefono: string | null;
  direccion: string | null;
}

interface TransportistaOption {
  id: number;
  nombre: string;
}

interface ChoferRelacionResponse {
  choferId: number;
  relacionActiva: boolean;
  transportista: {
    id: number;
    nombre: string | null;
    cuit: string | null;
    telefono: string | null;
    direccion: string | null;
  };
  patChasis: string;
  patAcoplado: string | null;
}

interface PostulacionRow {
  id: number | string;
  viajeId: number;
  transporteId: number | null;
  transportistaNombre: string | null;
  choferId: number;
  choferNombre: string | null;
  vendedorId: number | null;
  vendedorNombre: string | null;
  patChasis: string | null;
  patAcoplado: string | null;
  sendEmail: boolean;
}

interface ChoferModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: Viaje | null;
  onPostulado?: () => Promise<void> | void;
}

const formatPatente = (value: string | null | undefined) =>
  value && value.trim().length ? value.toUpperCase() : "Sin acoplado";

export default function ChoferModal({
  isOpen,
  onClose,
  viaje,
  onPostulado,
}: ChoferModalProps) {
  const viajeId = viaje?.id ?? null;

  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [choferOptions, setChoferOptions] = useState<ChoferOption[]>([]);
  const [choferOptionsAll, setChoferOptionsAll] = useState<ChoferOption[]>([]);
  const [choferPatentesById, setChoferPatentesById] = useState<Record<number, { patChasis: string; patAcoplado: string | null }>>({});

  const [transportistas, setTransportistas] = useState<TransportistaOption[]>([]);
  const [selectedTransportistaId, setSelectedTransportistaId] = useState<number | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [postulaciones, setPostulaciones] = useState<PostulacionRow[]>([]);

  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [loadingRelacion, setLoadingRelacion] = useState(false);
  const [loadingTransportistas, setLoadingTransportistas] = useState(false);
  const [loadingChoferesPorTransportista, setLoadingChoferesPorTransportista] = useState(false);
  const [loadingPostulaciones, setLoadingPostulaciones] = useState(false);

  const [selectedChofer, setSelectedChofer] = useState<number | null>(null);
  const [selectedVendedor, setSelectedVendedor] = useState<number | null>(null);
  const [transportista, setTransportista] = useState<TransportistaInfo | null>(
    null
  );
  const [patChasis, setPatChasis] = useState<string>("");
  const [patAcoplado, setPatAcoplado] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | string | null>(null);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    isVisible: boolean;
  }>({ type: "success", title: "", message: "", isVisible: false });

  const loadPostulaciones = useCallback(async () => {
    if (!viajeId) {
      setPostulaciones([]);
      return;
    }
    setLoadingPostulaciones(true);
    try {
      const res = await fetch(`/api/viajes/postulaciones?viajeId=${viajeId}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setPostulaciones(
          data.map((row: PostulacionRow) => ({
            ...row,
            patChasis: row.patChasis ? row.patChasis.toUpperCase() : null,
            patAcoplado: row.patAcoplado ? row.patAcoplado.toUpperCase() : null,
          }))
        );
      } else {
        setPostulaciones([]);
      }
    } catch (error) {
      console.error("Error al obtener postulaciones del viaje:", error);
      setPostulaciones([]);
    } finally {
      setLoadingPostulaciones(false);
    }
  }, [viajeId]);

  useEffect(() => {
    if (!isOpen || !viajeId) return;

    setSelectedChofer(null);
    setSelectedTransportistaId(null);
    setSelectedVendedor(null);
    setTransportista(null);
    setPatChasis("");
    setPatAcoplado(null);
    setSendEmail(false);
    setNotification((prev) => ({ ...prev, isVisible: false }));

    (async () => {
      setLoadingCatalogos(true);
      setLoadingTransportistas(true);
      try {
        const [rChoferes, rVendedores, rTransportistas] = await Promise.all([
          fetch("/api/choferes"),
          fetch("/api/vendedores"),
          fetch("/api/transportistas"),
        ]);

        if (!rChoferes.ok) throw new Error("No se pudieron obtener choferes");
        if (!rVendedores.ok)
          throw new Error("No se pudieron obtener vendedores");
        if (!rTransportistas.ok)
          throw new Error("No se pudieron obtener transportistas");

        const choferesData: Chofer[] = await rChoferes.json();
        setChoferes(choferesData);
        const optionsAll =
          choferesData.map((c) => ({
            id: c.id,
            nombre: c.nombre,
          }))
        ;
        setChoferOptionsAll(optionsAll);
        setChoferOptions(optionsAll);

        const vendedoresData: Vendedor[] = await rVendedores.json();
        setVendedores(vendedoresData);

        const transportistasData: TransportistaOption[] = await rTransportistas.json();
        setTransportistas(
          (Array.isArray(transportistasData) ? transportistasData : []).map((t) => ({
            id: Number(t.id),
            nombre: t.nombre ?? `Transportista ${t.id}`,
          }))
        );
      } catch (err: any) {
        console.error(err);
        setNotification({
          type: "error",
          title: "Error al cargar datos",
          message: err?.message || "No se pudieron cargar los catalogos",
          isVisible: true,
        });
      } finally {
        setLoadingCatalogos(false);
        setLoadingTransportistas(false);
      }
    })();

    loadPostulaciones();
  }, [isOpen, viajeId, loadPostulaciones]);

  // Cargar choferes filtrados por transportista (con patentes)
  useEffect(() => {
    if (!isOpen) return;
    if (!selectedTransportistaId) {
      setChoferOptions(choferOptionsAll);
      setChoferPatentesById({});
      return;
    }

    let abort = false;
    (async () => {
      setLoadingChoferesPorTransportista(true);
      try {
        const res = await fetch(`/api/transportistas/${selectedTransportistaId}/choferes`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudieron obtener choferes del transportista");

        if (abort) return;

        const patMap: Record<number, { patChasis: string; patAcoplado: string | null }> = {};
        const opts: ChoferOption[] = (Array.isArray(data) ? data : []).map((row: any) => {
          const id = Number(row.id);
          const nombre = String(row.nombre ?? `Chofer ${id}`);
          const chasis = String(row.patChasis ?? "").toUpperCase();
          const acoplado = row.patAcoplado ? String(row.patAcoplado).toUpperCase() : null;
          patMap[id] = { patChasis: chasis, patAcoplado: acoplado };
          const label = `${nombre} — ${chasis}${acoplado ? ` / ${acoplado}` : ""}`;
          return { id, nombre: label };
        });

        setChoferPatentesById(patMap);
        setChoferOptions(opts);
        // Preseleccionar transportista info mínima para mostrar mientras verifica
        const t = transportistas.find((t) => t.id === selectedTransportistaId) || null;
        setTransportista(t ? { id: t.id, nombre: t.nombre, cuit: null, telefono: null, direccion: null } : null);
        // Reset chofer seleccionado al cambiar de transportista
        setSelectedChofer(null);
        setPatChasis("");
        setPatAcoplado(null);
      } catch (err: any) {
        console.error(err);
        setNotification({
          type: "error",
          title: "Error al cargar choferes",
          message: err?.message || "No fue posible listar choferes de este transportista",
          isVisible: true,
        });
        setChoferOptions([]);
        setChoferPatentesById({});
      } finally {
        setLoadingChoferesPorTransportista(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [selectedTransportistaId, isOpen, choferOptionsAll, transportistas]);

  useEffect(() => {
    if (!isOpen || !selectedChofer) {
      // Solo resetear si no hay chofer seleccionado Y no hay transportista seleccionado
      if (!selectedTransportistaId) {
        setTransportista(null);
        setPatChasis("");
        setPatAcoplado(null);
      }
      return;
    }

    // Si ya tenemos un transportista seleccionado (flujo: transportista -> chofer)
    // verificar que las patentes estén cargadas desde el filtro de transportista
    if (selectedTransportistaId) {
      const pat = choferPatentesById[selectedChofer];
      if (pat) {
        // Ya tenemos las patentes del chofer porque vinimos desde el filtro de transportista
        setPatChasis(pat.patChasis || "");
        setPatAcoplado(pat.patAcoplado ?? null);
        // El transportista ya está seteado, no hacer nada más
        return;
      }
    }

    // Flujo: chofer -> transportista (cuando NO se seleccionó transportista primero)
    (async () => {
      setLoadingRelacion(true);
      try {
        const res = await fetch(
          `/api/choferes/relacion?choferId=${selectedChofer}`
        );
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data?.error || "No se pudo obtener la relacion del chofer"
          );
        }

        const choferData = data as ChoferRelacionResponse;
        if (!choferData.relacionActiva) {
          setTransportista(null);
          setSelectedTransportistaId(null);
          setPatChasis("");
          setPatAcoplado(null);
          setNotification({
            type: "warning",
            title: "Relacion inactiva",
            message:
              "El chofer no tiene una relacion activa con un transportista o vehiculo",
            isVisible: true,
          });
          return;
        }

        setTransportista({
          id: choferData.transportista.id,
          nombre: choferData.transportista.nombre,
          cuit: choferData.transportista.cuit,
          telefono: choferData.transportista.telefono,
          direccion: choferData.transportista.direccion,
        });
        setSelectedTransportistaId(choferData.transportista.id);
        setPatChasis(choferData.patChasis?.toUpperCase?.() || "");
        setPatAcoplado(
          choferData.patAcoplado ? choferData.patAcoplado.toUpperCase() : null
        );
      } catch (err: any) {
        console.error(err);
        setTransportista(null);
        setSelectedTransportistaId(null);
        setPatChasis("");
        setPatAcoplado(null);
        setNotification({
          type: "error",
          title: "No se pudo obtener la relacion",
          message: err?.message || "Reintenta con otro chofer",
          isVisible: true,
        });
      } finally {
        setLoadingRelacion(false);
      }
    })();
  }, [selectedChofer, isOpen, selectedTransportistaId, choferPatentesById]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !viaje) return null;

  const postuladosActuales = postulaciones.length;
  const pendientesCalculados = Math.max(
    (viaje.cupos ?? 0) - (viaje.cuposReservados ?? 0) - postuladosActuales,
    0
  );
  const viajeSinCupos = pendientesCalculados <= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (viajeSinCupos) {
      setNotification({
        type: "warning",
        title: "Sin cupos",
        message: "Este viaje no tiene cupos pendientes disponibles",
        isVisible: true,
      });
      return;
    }

    if (!selectedChofer) {
      setNotification({
        type: "warning",
        title: "Seleccion requerida",
        message: "Debes seleccionar un chofer",
        isVisible: true,
      });
      return;
    }

    if (!transportista) {
      setNotification({
        type: "warning",
        title: "Falta transportista",
        message:
          "No se pudo determinar el transportista para el chofer seleccionado",
        isVisible: true,
      });
      return;
    }

    if (!patChasis) {
      setNotification({
        type: "warning",
        title: "Patente requerida",
        message: "No se pudo determinar la patente del chasis",
        isVisible: true,
      });
      return;
    }

    if (!selectedVendedor) {
      setNotification({
        type: "warning",
        title: "Vendedor requerido",
        message: "Debes seleccionar un vendedor",
        isVisible: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        viajeId: viaje.id,
        choferId: selectedChofer,
        vendedorId: selectedVendedor,
        sendEmail,
      };
      console.log("Enviando datos:", payload);

      const res = await fetch("/api/viajes/postular-chofer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      console.log("Respuesta del servidor:", { status: res.status, data });

      if (!res.ok) throw new Error(data?.error || "Error al postular chofer");

      setNotification({
        type: "success",
        title: "Chofer postulado",
        message: "El chofer fue postulado correctamente al viaje",
        isVisible: true,
      });

      await loadPostulaciones();
      if (onPostulado) {
        try {
          await Promise.resolve(onPostulado());
        } catch (callbackError) {
          console.error(
            "Error al actualizar la lista de viajes:",
            callbackError
          );
        }
      }

      setSelectedChofer(null);
      setSelectedVendedor(null);
      setTransportista(null);
      setPatChasis("");
      setPatAcoplado(null);
      setSendEmail(false);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "No se pudo postular",
        message: err?.message ?? "Ocurrio un error al asignar el chofer",
        isVisible: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (row: PostulacionRow) => {
    if (removingId) return;
    setRemovingId(row.id);
    try {
      const params = new URLSearchParams({ viajeId: viaje.id.toString() });
      if (typeof row.id === "number" && Number.isFinite(row.id)) {
        params.append("id", row.id.toString());
      } else {
        params.append("choferId", row.choferId.toString());
      }

      const res = await fetch(`/api/viajes/postular-chofer?${params}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({} as any));
      if (!res.ok)
        throw new Error(data?.error || "No se pudo eliminar la postulacion");

      setNotification({
        type: "info",
        title: "Postulacion eliminada",
        message: "Se libero el cupo asignado",
        isVisible: true,
      });

      await loadPostulaciones();
      if (onPostulado) {
        try {
          await Promise.resolve(onPostulado());
        } catch (callbackError) {
          console.error(
            "Error al actualizar la lista de viajes:",
            callbackError
          );
        }
      }
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "No se pudo quitar",
        message: err?.message ?? "Ocurrio un error al quitar la postulacion",
        isVisible: true,
      });
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex md:items-center md:justify-center md:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white w-full h-full md:h-auto md:max-w-5xl md:rounded-lg p-3 md:p-5 shadow-2xl border-0 md:border border-neutral-700 overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-3 sticky top-0 bg-gradient-to-br from-neutral-900 to-neutral-800 z-10 pb-2">
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Choferes
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5 hidden md:block">
              Gestiona los choferes para este viaje
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-sm bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors duration-200 border border-neutral-600 ml-2 shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="bg-neutral-800/50 rounded-md p-2 md:p-3 border border-neutral-700">
            <span className="text-xs text-blue-400 font-medium">Total</span>
            <div className="text-lg md:text-xl font-bold text-white">
              {viaje.cupos ?? 0}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-md p-2 md:p-3 border border-neutral-700">
            <span className="text-xs text-orange-400 font-medium">
              Reservados
            </span>
            <div className="text-lg md:text-xl font-bold text-white">
              {viaje.cuposReservados ?? 0}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-md p-2 md:p-3 border border-neutral-700">
            <span className="text-xs text-purple-400 font-medium">
              Postulados
            </span>
            <div className="text-lg md:text-xl font-bold text-white">
              {postuladosActuales}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-md p-2 md:p-3 border border-neutral-700">
            <span className="text-xs text-green-400 font-medium">
              Disponibles
            </span>
            <div
              className={`text-lg md:text-xl font-bold ${
                pendientesCalculados > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {pendientesCalculados}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-neutral-800/40 to-neutral-700/40 border border-neutral-600 rounded-md p-2 md:p-3 mb-3 md:mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 text-sm">
            <div className="flex items-center justify-between md:block">
              <span className="text-neutral-400 text-xs">
                Viaje #{viaje.numero}
              </span>
              <div className="font-medium text-white text-sm">
                {new Date(viaje.fecha).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-neutral-400 text-xs">Cliente</span>
                  <div
                    className="font-medium text-white text-sm truncate"
                    title={viaje.razonSocial}
                  >
                    {viaje.razonSocial}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs">Ruta</span>
                  <div
                    className="font-medium text-white text-sm truncate"
                    title={`${viaje.origen} → ${viaje.destino}`}
                  >
                    {viaje.origen} → {viaje.destino}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="space-y-3 md:space-y-4">
          {/* Vista mobile: Cards */}
          <div className="md:hidden space-y-2">
            {postulaciones.length === 0 && !loadingPostulaciones && (
              <div className="text-center py-8 text-neutral-400 text-sm">
                No hay choferes postulados para este viaje.
              </div>
            )}
            {loadingPostulaciones && (
              <div className="py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-400">Actualizando...</span>
                </div>
              </div>
            )}
            {postulaciones.map((row, index) => (
              <div
                key={`mobile-postulacion-${row.id}`}
                className="bg-neutral-900/60 border border-neutral-700 rounded-md p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-xs">
                      #{index + 1}
                    </span>
                    <div>
                      <div className="text-white font-medium text-sm">
                        {row.choferNombre ?? "Sin datos"}
                      </div>
                      <div className="text-neutral-400 text-xs">
                        ID: {row.choferId}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemove(row)}
                    disabled={removingId === row.id}
                    className="px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200 min-h-[44px] flex items-center justify-center"
                  >
                    {removingId === row.id ? "..." : "✖"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                  <div>
                    <span className="text-neutral-400">Transportista:</span>
                    <div className="text-white font-medium">
                      {row.transportistaNombre ?? "Sin datos"}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400">ID Trans:</span>
                    <div className="text-neutral-300">
                      {row.transporteId ?? "N/A"}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-400">Chasis:</span>
                    <div className="font-mono text-green-400">
                      {formatPatente(row.patChasis)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Acoplado:</span>
                    <div className="font-mono text-blue-400">
                      {formatPatente(row.patAcoplado)}
                    </div>
                  </div>
                  <div>
                    <span className="text-neutral-400">Vendedor:</span>
                    <div className="text-white">
                      {row.vendedorNombre ?? "-"}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-400">Email:</span>
                    <input
                      type="checkbox"
                      checked={row.sendEmail}
                      readOnly
                      disabled
                      className="scale-75"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Vista desktop: Tabla */}
          <div className="hidden md:block overflow-x-auto border border-neutral-700 rounded-md shadow-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-gradient-to-r from-neutral-800 to-neutral-700 text-neutral-200">
                <tr>
                  <th className="px-2 py-2 text-left w-8 font-medium">#</th>
                  <th className="px-2 py-2 text-left font-medium">Chofer</th>
                  <th className="px-2 py-2 text-left font-medium">
                    Transportista
                  </th>
                  <th className="px-2 py-2 text-left font-medium">Patentes</th>
                  <th className="px-2 py-2 text-center font-medium">Email</th>
                  <th className="px-2 py-2 text-left font-medium">Vendedor</th>
                  <th className="px-2 py-2 text-center font-medium">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {postulaciones.length === 0 && !loadingPostulaciones && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-4 text-center text-neutral-400 text-sm"
                    >
                      No hay choferes postulados para este viaje.
                    </td>
                  </tr>
                )}
                {postulaciones.map((row, index) => (
                  <tr
                    key={`postulacion-${row.id}`}
                    className="border-t border-neutral-700 bg-neutral-900/60 hover:bg-neutral-800/80 transition-colors duration-200"
                  >
                    <td className="px-2 py-2 align-middle text-neutral-300">
                      {index + 1}
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="text-neutral-200 font-medium">
                        {row.choferNombre ?? "Sin datos"}
                      </div>
                      <div className="text-neutral-400 text-xs">
                        ID: {row.choferId}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="text-neutral-200 font-medium text-xs">
                        {row.transportistaNombre ?? "Sin datos"}
                      </div>
                      <div className="text-neutral-400 text-xs">
                        ID: {row.transporteId ?? "N/A"}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle">
                      <div className="font-mono text-xs text-green-400">
                        {formatPatente(row.patChasis)}
                      </div>
                      <div className="font-mono text-xs text-blue-400">
                        {formatPatente(row.patAcoplado)}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-middle text-center">
                      <input
                        type="checkbox"
                        checked={row.sendEmail}
                        readOnly
                        disabled
                        className="scale-75"
                      />
                    </td>
                    <td className="px-2 py-2 align-middle text-neutral-200 text-xs">
                      {row.vendedorNombre ?? "-"}
                    </td>
                    <td className="px-3 py-2 align-middle text-center">
                      <button
                        type="button"
                        onClick={() => handleRemove(row)}
                        disabled={removingId === row.id}
                        className="px-3 py-1 text-xs rounded-md bg-red-600 hover:bg-red-500 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200"
                      >
                        {removingId === row.id ? "..." : "✖"}
                      </button>
                    </td>
                  </tr>
                ))}

                {!viajeSinCupos && (
                  <tr className="border-t-2 border-blue-600/30 bg-gradient-to-r from-blue-900/10 to-purple-900/10">
                    <td className="px-2 py-2 align-top font-medium text-neutral-300">
                      +
                    </td>
                    {/* Chofer */}
                    <td className="px-2 py-2 align-top min-w-[220px]">
                      <div className="flex items-start gap-1">
                        <div className="flex-1">
                          <SearchableSelect
                            options={choferOptions}
                            valueId={selectedChofer}
                            onChangeId={(id) => {
                              const choferId = Number(id);
                              setSelectedChofer(choferId);
                              // Si tenemos patentes precargadas por selección de transportista, mostrarlas de inmediato
                              const pat = choferPatentesById[choferId];
                              if (pat) {
                                setPatChasis(pat.patChasis || "");
                                setPatAcoplado(pat.patAcoplado ?? null);
                              }
                            }}
                            placeholder={
                              loadingCatalogos || loadingChoferesPorTransportista
                                ? "Cargando..."
                                : selectedTransportistaId
                                ? "Chofer del transportista"
                                : "Seleccionar chofer"
                            }
                            name="chofer"
                            required
                            loading={loadingCatalogos || loadingChoferesPorTransportista}
                          />
                          {selectedChofer && loadingRelacion && (
                            <div className="mt-1 text-xs text-blue-400">
                              Verificando...
                            </div>
                          )}
                        </div>
                        {selectedChofer && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedChofer(null);
                              setTransportista(null);
                              setPatChasis("");
                              setPatAcoplado(null);
                            }}
                            className="px-1.5 py-1 text-xs rounded bg-red-600 hover:bg-red-500 transition-colors duration-200"
                            title="Limpiar selección"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    {/* Transportista */}
                    <td className="px-2 py-2 align-top min-w-[220px]">
                      <div className="space-y-1">
                        <div className="flex items-start gap-1">
                          <div className="flex-1">
                            <SearchableSelect
                              options={transportistas}
                              valueId={selectedTransportistaId}
                              onChangeId={(id) => {
                                setSelectedTransportistaId(Number(id));
                              }}
                              placeholder={
                                loadingTransportistas ? "Cargando..." :
                                "Seleccionar transportista"
                              }
                              name="transportista"
                              loading={loadingTransportistas}
                              disabled={!!selectedChofer}
                            />
                          </div>
                          {selectedTransportistaId && !selectedChofer && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTransportistaId(null);
                                setChoferOptions(choferOptionsAll);
                                setChoferPatentesById({});
                              }}
                              className="px-1.5 py-1 text-xs rounded bg-red-600 hover:bg-red-500 transition-colors duration-200"
                              title="Limpiar selección"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                        <div className="text-xs text-neutral-400">
                          ID: {transportista?.id ?? (selectedTransportistaId ?? "N/A")}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top">
                      <div className="text-xs space-y-1">
                        <div className="font-mono text-green-400">
                          {patChasis || "Auto"}
                        </div>
                        <div className="font-mono text-blue-400">
                          {formatPatente(patAcoplado)}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="scale-75"
                      />
                    </td>
                    <td className="px-2 py-2 align-top min-w-[150px]">
                      <div className="flex items-start gap-1">
                        <select
                          className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-2 py-1 text-xs"
                          value={selectedVendedor ?? ""}
                          onChange={(e) =>
                            setSelectedVendedor(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                        >
                          <option value="" disabled>
                            {loadingCatalogos ? "Cargando..." : "Vendedor"}
                          </option>
                          {vendedores.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.nombre}
                            </option>
                          ))}
                        </select>
                        {selectedVendedor && (
                          <button
                            type="button"
                            onClick={() => setSelectedVendedor(null)}
                            className="px-1.5 py-1 text-xs rounded bg-red-600 hover:bg-red-500 transition-colors duration-200"
                            title="Limpiar selección"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2 align-top text-center">
                      <button
                        type="submit"
                        disabled={
                          submitting ||
                          loadingRelacion ||
                          loadingCatalogos ||
                          viajeSinCupos ||
                          !selectedChofer ||
                          !transportista ||
                          !patChasis ||
                          !selectedVendedor
                        }
                        className="px-4 py-1.5 text-xs font-medium rounded-md bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200"
                      >
                        {submitting ? "..." : "✓ Agregar"}
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            {loadingPostulaciones && (
              <div className="py-3 text-center">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-blue-400">Actualizando...</span>
                </div>
              </div>
            )}
          </div>

          {/* Formulario para agregar nuevo chofer - Mobile */}
          {!viajeSinCupos && (
            <div className="md:hidden bg-gradient-to-r from-blue-900/10 to-purple-900/10 border-2 border-blue-600/30 rounded-md p-3">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">
                    Transportista {selectedChofer && "(Asignado automáticamente)"}
                  </label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={transportistas}
                        valueId={selectedTransportistaId}
                        onChangeId={(id) => {
                          setSelectedTransportistaId(Number(id));
                        }}
                        placeholder={
                          loadingTransportistas ? "Cargando..." :
                          "Seleccionar transportista"
                        }
                        name="transportista"
                        loading={loadingTransportistas}
                        disabled={!!selectedChofer}
                      />
                    </div>
                    {selectedTransportistaId && !selectedChofer && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTransportistaId(null);
                          setChoferOptions(choferOptionsAll);
                          setChoferPatentesById({});
                        }}
                        className="px-3 py-3 text-sm rounded bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors duration-200 min-h-[44px] shrink-0"
                        title="Limpiar selección"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-1 block">
                    Chofer
                  </label>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <SearchableSelect
                        options={choferOptions}
                        valueId={selectedChofer}
                        onChangeId={(id) => {
                          const choferId = Number(id);
                          setSelectedChofer(choferId);
                          const pat = choferPatentesById[choferId];
                          if (pat) {
                            setPatChasis(pat.patChasis || "");
                            setPatAcoplado(pat.patAcoplado ?? null);
                          }
                        }}
                        placeholder={
                          loadingCatalogos || loadingChoferesPorTransportista
                            ? "Cargando..."
                            : selectedTransportistaId
                            ? "Chofer del transportista"
                            : "Seleccionar chofer"
                        }
                        name="chofer"
                        required
                        loading={loadingCatalogos || loadingChoferesPorTransportista}
                      />
                      {selectedChofer && loadingRelacion && (
                        <div className="mt-1 text-xs text-blue-400">
                          Verificando...
                        </div>
                      )}
                    </div>
                    {selectedChofer && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedChofer(null);
                          setTransportista(null);
                          setPatChasis("");
                          setPatAcoplado(null);
                        }}
                        className="px-3 py-3 text-sm rounded bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors duration-200 min-h-[44px] shrink-0"
                        title="Limpiar selección"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {patChasis && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-neutral-400">Chasis</span>
                      <div className="font-mono text-green-400 text-sm">
                        {patChasis}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-400">Acoplado</span>
                      <div className="font-mono text-blue-400 text-sm">
                        {formatPatente(patAcoplado)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-neutral-400 mb-1 block">
                      Vendedor
                    </label>
                    <div className="flex items-start gap-2">
                      <select
                        className="flex-1 rounded bg-neutral-900 border border-neutral-700 px-3 py-3 text-sm min-h-[44px] touch-manipulation"
                        value={selectedVendedor ?? ""}
                        onChange={(e) =>
                          setSelectedVendedor(
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                      >
                        <option value="" disabled>
                          {loadingCatalogos ? "Cargando..." : "Vendedor"}
                        </option>
                        {vendedores.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre}
                          </option>
                        ))}
                      </select>
                      {selectedVendedor && (
                        <button
                          type="button"
                          onClick={() => setSelectedVendedor(null)}
                          className="px-3 py-3 text-sm rounded bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors duration-200 min-h-[44px] shrink-0"
                          title="Limpiar selección"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-xs text-neutral-400">
                      <input
                        type="checkbox"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="scale-75"
                      />
                      Email
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    loadingRelacion ||
                    loadingCatalogos ||
                    viajeSinCupos ||
                    !selectedChofer ||
                    !transportista ||
                    !patChasis ||
                    !selectedVendedor
                  }
                  className="w-full px-4 py-4 text-sm font-medium rounded-md bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200 min-h-[44px] touch-manipulation"
                >
                  {submitting ? "Agregando..." : "✓ Agregar Chofer"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={() =>
          setNotification((prev) => ({ ...prev, isVisible: false }))
        }
      />
    </div>
  );
}
