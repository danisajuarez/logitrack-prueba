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

interface EstacionServicio {
  id: number;
  razonSocial: string;
  cuit: string | null;
  direccion: string | null;
  telefono: string | null;
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

  // Estados para el panel de autorizaciones
  const [expandedAutorizacionId, setExpandedAutorizacionId] = useState<number | string | null>(null);
  const [estaciones, setEstaciones] = useState<EstacionServicio[]>([]);
  const [loadingEstaciones, setLoadingEstaciones] = useState(false);
  const [selectedEstacion, setSelectedEstacion] = useState<number | null>(null);
  const [adelantoEnabled, setAdelantoEnabled] = useState(false);
  const [combustibleEnabled, setCombustibleEnabled] = useState(false);
  const [importeAdelanto, setImporteAdelanto] = useState<string>("");
  const [litrosCombustible, setLitrosCombustible] = useState<string>("");
  const [savingAutorizaciones, setSavingAutorizaciones] = useState(false);

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
        // Solo resetear chofer si no hay uno seleccionado (evita borrar el chofer al autocompletar transportista)
        setSelectedChofer((prev) => {
          // Si ya hay un chofer seleccionado y está en la lista de opciones del transportista, mantenerlo
          if (prev && opts.some(opt => opt.id === prev)) {
            return prev;
          }
          return null;
        });
        // Solo resetear patentes si se resetea el chofer
        if (!selectedChofer || !opts.some(opt => opt.id === selectedChofer)) {
          setPatChasis("");
          setPatAcoplado(null);
        }
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

  // Cargar estaciones de servicio
  useEffect(() => {
    if (!isOpen) return;

    (async () => {
      setLoadingEstaciones(true);
      try {
        const res = await fetch("/api/estaciones-servicio");
        if (!res.ok) throw new Error("No se pudieron cargar las estaciones de servicio");
        const data: EstacionServicio[] = await res.json();
        setEstaciones(data);
      } catch (err: any) {
        console.error(err);
        setNotification({
          type: "error",
          title: "Error al cargar estaciones",
          message: err?.message || "No se pudieron cargar las estaciones de servicio",
          isVisible: true,
        });
      } finally {
        setLoadingEstaciones(false);
      }
    })();
  }, [isOpen]);

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

  const toggleAutorizacionPanel = (rowId: number | string) => {
    if (expandedAutorizacionId === rowId) {
      // Cerrar el panel
      setExpandedAutorizacionId(null);
      resetAutorizacionForm();
    } else {
      // Abrir el panel
      setExpandedAutorizacionId(rowId);
      resetAutorizacionForm();
    }
  };

  const resetAutorizacionForm = () => {
    setSelectedEstacion(null);
    setAdelantoEnabled(false);
    setCombustibleEnabled(false);
    setImporteAdelanto("");
    setLitrosCombustible("");
  };

  const handleSaveAutorizaciones = async (row: PostulacionRow) => {
    if (!selectedEstacion) {
      setNotification({
        type: "warning",
        title: "Estación requerida",
        message: "Debe seleccionar una estación de servicio",
        isVisible: true,
      });
      return;
    }

    if (!adelantoEnabled && !combustibleEnabled) {
      setNotification({
        type: "warning",
        title: "Autorización requerida",
        message: "Debe activar al menos Adelanto o Combustible",
        isVisible: true,
      });
      return;
    }

    if (adelantoEnabled && (!importeAdelanto || Number(importeAdelanto) <= 0)) {
      setNotification({
        type: "warning",
        title: "Importe inválido",
        message: "El importe del adelanto debe ser mayor a 0",
        isVisible: true,
      });
      return;
    }

    if (combustibleEnabled && (!litrosCombustible || Number(litrosCombustible) <= 0)) {
      setNotification({
        type: "warning",
        title: "Litros inválidos",
        message: "Los litros de combustible deben ser mayores a 0",
        isVisible: true,
      });
      return;
    }

    setSavingAutorizaciones(true);
    try {
      const payload: any = {
        viajeId: viaje.id,
        choferId: row.choferId,
        estacionId: selectedEstacion,
      };

      if (adelantoEnabled) {
        payload.adelanto = {
          importe: Number(importeAdelanto),
        };
      }

      if (combustibleEnabled) {
        payload.combustible = {
          litros: Number(litrosCombustible),
        };
      }

      const res = await fetch("/api/viajes/autorizaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || "Error al guardar autorizaciones");

      setNotification({
        type: "success",
        title: "Autorizaciones guardadas",
        message: "Las autorizaciones se guardaron correctamente",
        isVisible: true,
      });

      // Cerrar el panel y resetear
      setExpandedAutorizacionId(null);
      resetAutorizacionForm();
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "Error al guardar",
        message: err?.message ?? "Ocurrió un error al guardar las autorizaciones",
        isVisible: true,
      });
    } finally {
      setSavingAutorizaciones(false);
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
        className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white w-full h-full md:h-auto md:max-w-5xl md:rounded-lg p-4 md:p-6 shadow-2xl border-0 md:border border-neutral-700 overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-4 sticky top-0 bg-gradient-to-br from-neutral-900 to-neutral-800 z-10 pb-3 -mx-4 px-4 md:-mx-6 md:px-6">
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
            className="w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-md transition-colors duration-200 border border-neutral-600 ml-3 shrink-0"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-neutral-800/50 rounded-md p-3 border border-neutral-700">
            <span className="text-xs text-blue-400 font-medium block mb-1">Total</span>
            <div className="text-xl md:text-2xl font-bold text-white">
              {viaje.cupos ?? 0}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-md p-3 border border-neutral-700">
            <span className="text-xs text-orange-400 font-medium block mb-1">
              Reservados
            </span>
            <div className="text-xl md:text-2xl font-bold text-white">
              {viaje.cuposReservados ?? 0}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-md p-3 border border-neutral-700">
            <span className="text-xs text-purple-400 font-medium block mb-1">
              Postulados
            </span>
            <div className="text-xl md:text-2xl font-bold text-white">
              {postuladosActuales}
            </div>
          </div>
          <div className="bg-neutral-800/50 rounded-md p-3 border border-neutral-700">
            <span className="text-xs text-green-400 font-medium block mb-1">
              Disponibles
            </span>
            <div
              className={`text-xl md:text-2xl font-bold ${
                pendientesCalculados > 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {pendientesCalculados}
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-neutral-800/40 to-neutral-700/40 border border-neutral-600 rounded-md p-3 md:p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="flex items-center justify-between md:block">
              <span className="text-neutral-400 text-xs block mb-1">
                Viaje #{viaje.numero}
              </span>
              <div className="font-medium text-white">
                {new Date(viaje.fecha).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                })}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Cliente</span>
                  <div
                    className="font-medium text-white truncate"
                    title={viaje.razonSocial}
                  >
                    {viaje.razonSocial}
                  </div>
                </div>
                <div>
                  <span className="text-neutral-400 text-xs block mb-1">Ruta</span>
                  <div
                    className="font-medium text-white truncate"
                    title={`${viaje.origen} → ${viaje.destino}`}
                  >
                    {viaje.origen} → {viaje.destino}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vista mobile: Cards */}
          <div className="md:hidden space-y-3">
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
                    className="w-11 h-11 flex items-center justify-center text-sm rounded-md bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200 shrink-0"
                    aria-label="Eliminar"
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
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
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

                {/* Botón Autorizaciones Mobile */}
                <button
                  type="button"
                  onClick={() => toggleAutorizacionPanel(row.id)}
                  className="w-full px-3 py-2 text-sm rounded-md bg-blue-600 hover:bg-blue-500 active:bg-blue-700 transition-colors duration-200"
                >
                  {expandedAutorizacionId === row.id ? "▼ Ocultar" : "▶ Autorizaciones"}
                </button>

                {/* Panel de autorizaciones mobile */}
                {expandedAutorizacionId === row.id && (
                  <div className="mt-3 p-3 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-600/30 rounded-md space-y-3">
                    <h3 className="text-sm font-bold text-blue-400">
                      Gestión de Autorizaciones
                    </h3>

                    {/* Selector de estación de servicio */}
                    <div>
                      <label className="text-xs text-neutral-400 mb-2 block font-medium">
                        Estación de Servicio
                      </label>
                      <SearchableSelect
                        options={estaciones.map((e) => ({
                          id: e.id,
                          nombre: `${e.razonSocial} - CUIT: ${e.cuit || "N/A"}`,
                        }))}
                        valueId={selectedEstacion}
                        onChangeId={(id) => setSelectedEstacion(Number(id))}
                        placeholder={loadingEstaciones ? "Cargando..." : "Seleccionar estación"}
                        name="estacion-mobile"
                        loading={loadingEstaciones}
                      />
                    </div>

                    {/* Adelanto */}
                    <div className="bg-neutral-900/50 rounded-md p-3 border border-neutral-700">
                      <label className="flex items-center gap-3 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={adelantoEnabled}
                          onChange={(e) => setAdelantoEnabled(e.target.checked)}
                          className="w-5 h-5 rounded border-neutral-600 bg-neutral-800 text-blue-500"
                        />
                        <span className="text-sm font-medium text-neutral-200">
                          Adelanto 💸
                        </span>
                      </label>
                      {adelantoEnabled && (
                        <div>
                          <label className="text-xs text-neutral-400 mb-1 block">
                            Importe ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={importeAdelanto}
                            onChange={(e) => setImporteAdelanto(e.target.value)}
                            className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-3 text-sm min-h-[44px]"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>

                    {/* Combustible */}
                    <div className="bg-neutral-900/50 rounded-md p-3 border border-neutral-700">
                      <label className="flex items-center gap-3 cursor-pointer mb-3">
                        <input
                          type="checkbox"
                          checked={combustibleEnabled}
                          onChange={(e) => setCombustibleEnabled(e.target.checked)}
                          className="w-5 h-5 rounded border-neutral-600 bg-neutral-800 text-blue-500"
                        />
                        <span className="text-sm font-medium text-neutral-200">
                          Combustible ⛽
                        </span>
                      </label>
                      {combustibleEnabled && (
                        <div>
                          <label className="text-xs text-neutral-400 mb-1 block">
                            Litros
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={litrosCombustible}
                            onChange={(e) => setLitrosCombustible(e.target.value)}
                            className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-3 text-sm min-h-[44px]"
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>

                    {/* Resumen */}
                    {(adelantoEnabled || combustibleEnabled) && (
                      <div className="bg-neutral-800/50 rounded-md p-3 border border-neutral-600">
                        <div className="text-xs font-medium text-neutral-300 mb-2">
                          Resumen:
                        </div>
                        <div className="text-xs text-neutral-400 space-y-1">
                          {adelantoEnabled && (
                            <div>
                              • Adelanto: ${importeAdelanto || "0.00"}
                            </div>
                          )}
                          {combustibleEnabled && (
                            <div>
                              • Combustible: {litrosCombustible || "0.00"} litros
                            </div>
                          )}
                          {adelantoEnabled && combustibleEnabled && (
                            <div className="text-yellow-400 mt-2">
                              ⚠ Se guardarán 2 autorizaciones separadas
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Botones */}
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAutorizaciones(row)}
                        disabled={savingAutorizaciones || !selectedEstacion || (!adelantoEnabled && !combustibleEnabled)}
                        className="w-full px-4 py-3 text-sm font-medium rounded-md bg-green-600 hover:bg-green-500 active:bg-green-700 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200 min-h-[44px]"
                      >
                        {savingAutorizaciones ? "Guardando..." : "Guardar autorizaciones"}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleAutorizacionPanel(row.id)}
                        className="w-full px-4 py-3 text-sm rounded-md bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 transition-colors duration-200 min-h-[44px]"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
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
                  <th className="px-2 py-2 text-center font-medium" colSpan={2}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {postulaciones.length === 0 && !loadingPostulaciones && (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-4 text-center text-neutral-400 text-sm"
                    >
                      No hay choferes postulados para este viaje.
                    </td>
                  </tr>
                )}
                {postulaciones.map((row, index) => (
                  <>
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
                          onClick={() => toggleAutorizacionPanel(row.id)}
                          className="px-3 py-1 text-xs rounded-md bg-blue-600 hover:bg-blue-500 transition-colors duration-200"
                        >
                          {expandedAutorizacionId === row.id ? "▼" : "▶"} Autorizaciones
                        </button>
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
                    {expandedAutorizacionId === row.id && (
                      <tr key={`autorizacion-panel-${row.id}`}>
                        <td colSpan={8} className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border-t border-blue-600/30">
                          <div className="p-4 space-y-4">
                            <h3 className="text-sm font-bold text-blue-400 mb-3">
                              Gestión de Autorizaciones
                            </h3>

                            {/* Selector de estación de servicio */}
                            <div>
                              <label className="text-xs text-neutral-400 mb-2 block font-medium">
                                Estación de Servicio
                              </label>
                              <SearchableSelect
                                options={estaciones.map((e) => ({
                                  id: e.id,
                                  nombre: `${e.razonSocial} - CUIT: ${e.cuit || "N/A"}${
                                    e.direccion ? ` - ${e.direccion}` : ""
                                  }${e.telefono ? ` - Tel: ${e.telefono}` : ""}`,
                                }))}
                                valueId={selectedEstacion}
                                onChangeId={(id) => setSelectedEstacion(Number(id))}
                                placeholder={loadingEstaciones ? "Cargando..." : "Seleccionar estación"}
                                name="estacion"
                                loading={loadingEstaciones}
                              />
                            </div>

                            {/* Switches y campos */}
                            <div className="grid grid-cols-2 gap-4">
                              {/* Adelanto */}
                              <div className="bg-neutral-900/50 rounded-md p-3 border border-neutral-700">
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                  <input
                                    type="checkbox"
                                    checked={adelantoEnabled}
                                    onChange={(e) => setAdelantoEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded border-neutral-600 bg-neutral-800 text-blue-500"
                                  />
                                  <span className="text-sm font-medium text-neutral-200">
                                    Adelanto 💸
                                  </span>
                                </label>
                                {adelantoEnabled && (
                                  <div>
                                    <label className="text-xs text-neutral-400 mb-1 block">
                                      Importe ($)
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={importeAdelanto}
                                      onChange={(e) => setImporteAdelanto(e.target.value)}
                                      className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Combustible */}
                              <div className="bg-neutral-900/50 rounded-md p-3 border border-neutral-700">
                                <label className="flex items-center gap-3 cursor-pointer mb-3">
                                  <input
                                    type="checkbox"
                                    checked={combustibleEnabled}
                                    onChange={(e) => setCombustibleEnabled(e.target.checked)}
                                    className="w-5 h-5 rounded border-neutral-600 bg-neutral-800 text-blue-500"
                                  />
                                  <span className="text-sm font-medium text-neutral-200">
                                    Combustible ⛽
                                  </span>
                                </label>
                                {combustibleEnabled && (
                                  <div>
                                    <label className="text-xs text-neutral-400 mb-1 block">
                                      Litros
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={litrosCombustible}
                                      onChange={(e) => setLitrosCombustible(e.target.value)}
                                      className="w-full rounded bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm"
                                      placeholder="0.00"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Resumen */}
                            {(adelantoEnabled || combustibleEnabled) && (
                              <div className="bg-neutral-800/50 rounded-md p-3 border border-neutral-600">
                                <div className="text-xs font-medium text-neutral-300 mb-2">
                                  Resumen:
                                </div>
                                <div className="text-xs text-neutral-400 space-y-1">
                                  {adelantoEnabled && (
                                    <div>
                                      • Adelanto: ${importeAdelanto || "0.00"}
                                    </div>
                                  )}
                                  {combustibleEnabled && (
                                    <div>
                                      • Combustible: {litrosCombustible || "0.00"} litros
                                    </div>
                                  )}
                                  {adelantoEnabled && combustibleEnabled && (
                                    <div className="text-yellow-400 mt-2">
                                      ⚠ Se guardarán 2 autorizaciones separadas
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Botones */}
                            <div className="flex gap-2 justify-end">
                              <button
                                type="button"
                                onClick={() => toggleAutorizacionPanel(row.id)}
                                className="px-4 py-2 text-xs rounded-md bg-neutral-700 hover:bg-neutral-600 transition-colors duration-200"
                              >
                                Cancelar
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveAutorizaciones(row)}
                                disabled={savingAutorizaciones || !selectedEstacion || (!adelantoEnabled && !combustibleEnabled)}
                                className="px-4 py-2 text-xs font-medium rounded-md bg-green-600 hover:bg-green-500 disabled:bg-neutral-700 disabled:text-neutral-400 transition-colors duration-200"
                              >
                                {savingAutorizaciones ? "Guardando..." : "Guardar autorizaciones"}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
                            className="w-7 h-7 flex items-center justify-center text-xs rounded bg-red-600 hover:bg-red-500 transition-colors duration-200 shrink-0"
                            title="Limpiar selección"
                            aria-label="Limpiar chofer"
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
                              className="w-7 h-7 flex items-center justify-center text-xs rounded bg-red-600 hover:bg-red-500 transition-colors duration-200 shrink-0"
                              title="Limpiar selección"
                              aria-label="Limpiar transportista"
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
                            className="w-7 h-7 flex items-center justify-center text-xs rounded bg-red-600 hover:bg-red-500 transition-colors duration-200 shrink-0"
                            title="Limpiar selección"
                            aria-label="Limpiar vendedor"
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
            <div className="md:hidden bg-gradient-to-r from-blue-900/10 to-purple-900/10 border-2 border-blue-600/30 rounded-md p-4">
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block font-medium">
                    Transportista {selectedChofer && <span className="text-blue-400">(Asignado automáticamente)</span>}
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
                        className="w-11 h-11 flex items-center justify-center text-sm rounded bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors duration-200 shrink-0"
                        title="Limpiar selección"
                        aria-label="Limpiar transportista"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 mb-2 block font-medium">
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
                        <div className="mt-2 text-xs text-blue-400 flex items-center gap-2">
                          <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
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
                        className="w-11 h-11 flex items-center justify-center text-sm rounded bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors duration-200 shrink-0"
                        title="Limpiar selección"
                        aria-label="Limpiar chofer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {patChasis && (
                  <div className="bg-neutral-900/50 rounded-md p-3 border border-neutral-700">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-xs text-neutral-400 block mb-1">Chasis</span>
                        <div className="font-mono text-green-400 font-medium">
                          {patChasis}
                        </div>
                      </div>
                      <div>
                        <span className="text-xs text-neutral-400 block mb-1">Acoplado</span>
                        <div className="font-mono text-blue-400 font-medium">
                          {formatPatente(patAcoplado)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-xs text-neutral-400 mb-2 block font-medium">
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
                        {loadingCatalogos ? "Cargando..." : "Seleccionar vendedor"}
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
                        className="w-11 h-11 flex items-center justify-center text-sm rounded bg-red-600 hover:bg-red-500 active:bg-red-700 transition-colors duration-200 shrink-0"
                        title="Limpiar selección"
                        aria-label="Limpiar vendedor"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="bg-neutral-900/50 rounded-md p-3 border border-neutral-700">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="w-5 h-5 rounded border-neutral-600 bg-neutral-800 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                    />
                    <span className="text-sm text-neutral-300">Enviar notificación por email</span>
                  </label>
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
