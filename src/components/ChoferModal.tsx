"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SearchableSelect from "./SearchableSelect";
import Notification from "./Notification";

/* ========= Tipos ========= */
interface Chofer {
  id: number;
  razonSocial: string;
  cuit: string;
  telefono: string;
  email: string;
}

interface Transportista {
  id: number;
  nombre: string;
  cuit: string;
  telefono: string;
  direccion: string;
}

interface ChoferOption {
  id: number;
  nombre: string;
}

interface TransportistaOption {
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
}

interface Vendedor {
  id: number;
  nombre: string;
}

interface Vehiculo {
  patente: string;
  patenteAcoplado?: string | null;
}

interface ChoferModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje: Viaje | null;
}

/* ========= Componente ========= */
export default function ChoferModal({
  isOpen,
  onClose,
  viaje,
}: ChoferModalProps) {
  const router = useRouter();

  // Catálogos
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [choferOptions, setChoferOptions] = useState<ChoferOption[]>([]);
  const [transportistas, setTransportistas] = useState<Transportista[]>([]);
  const [transportistaOptions, setTransportistaOptions] = useState<TransportistaOption[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);

  // Selecciones
  const [selectedChofer, setSelectedChofer] = useState<number | null>(null);
  const [selectedTransportista, setSelectedTransportista] = useState<number | null>(null);
  const [vendedorId, setVendedorId] = useState<number | null>(null);
  const [patChasis, setPatChasis] = useState<string>("");
  const [patAcoplado, setPatAcoplado] = useState<string>("");

  // UI state
  const [loadingChoferes, setLoadingChoferes] = useState(false);
  const [loadingVehiculos, setLoadingVehiculos] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    isVisible: boolean;
  }>({ type: "success", title: "", message: "", isVisible: false });

  // ===== Helpers
  const selectedChoferFull = useMemo(
    () => choferes.find((c) => c.id === selectedChofer) || null,
    [choferes, selectedChofer]
  );

  const selectedTransportistaFull = useMemo(
    () => transportistas.find((t) => t.id === selectedTransportista) || null,
    [transportistas, selectedTransportista]
  );

  // ===== Cargar catálogos al abrir
  useEffect(() => {
    if (!isOpen || !viaje) return;

    // Reset
    setSelectedChofer(null);
    setSelectedTransportista(null);
    setVendedorId(null);
    setPatChasis("");
    setPatAcoplado("");
    setVehiculos([]);
    setSendEmail(false);
    setNotification((p) => ({ ...p, isVisible: false }));

    // Fetch choferes + transportistas + vendedores
    (async () => {
      setLoadingChoferes(true);
      try {
        const [rChoferes, rTransportistas, rVendedores] = await Promise.all([
          fetch("/api/choferes"),
          fetch("/api/transportes"),
          fetch("/api/vendedores"),
        ]);

        if (!rChoferes.ok) throw new Error("No se pudieron obtener choferes");
        if (!rTransportistas.ok) throw new Error("No se pudieron obtener transportistas");
        if (!rVendedores.ok) throw new Error("No se pudieron obtener vendedores");

        const choferesData: Chofer[] = await rChoferes.json();
        setChoferes(choferesData);
        setChoferOptions(
          choferesData.map((c) => ({
            id: c.id,
            nombre: c.razonSocial,
          }))
        );

        const transportistasData: Transportista[] = await rTransportistas.json();
        setTransportistas(transportistasData);
        setTransportistaOptions(
          transportistasData.map((t) => ({
            id: t.id,
            nombre: t.nombre,
          }))
        );

        const vendedoresData: Vendedor[] = await rVendedores.json();
        setVendedores(vendedoresData);
      } catch (err: any) {
        console.error(err);
        setNotification({
          type: "error",
          title: "Error al cargar datos",
          message: err?.message || "No se pudieron cargar catálogos",
          isVisible: true,
        });
      } finally {
        setLoadingChoferes(false);
      }
    })();
  }, [isOpen, viaje]);

  // ===== Cargar vehículos cuando cambia el transportista
  useEffect(() => {
    if (!isOpen || !selectedTransportista) {
      setVehiculos([]);
      setPatChasis("");
      setPatAcoplado("");
      return;
    }

    (async () => {
      setLoadingVehiculos(true);
      try {
        const r = await fetch(`/api/vehiculos?choferId=${selectedTransportista}`);
        if (!r.ok) throw new Error("No se pudieron obtener vehículos");
        const data: Vehiculo[] = await r.json();

        setVehiculos(data);
        // Autopreselección si hay uno solo
        if (data.length === 1) {
          setPatChasis(data[0].patente || "");
          setPatAcoplado(data[0].patenteAcoplado || "");
        } else {
          setPatChasis("");
          setPatAcoplado("");
        }
      } catch (err: any) {
        console.error(err);
        setVehiculos([]);
        setPatChasis("");
        setPatAcoplado("");
        setNotification({
          type: "info",
          title: "Mostrando todas las patentes",
          message: "Este transportista no tiene vehículos específicos asignados. Se muestran todas las patentes disponibles.",
          isVisible: true,
        });
      } finally {
        setLoadingVehiculos(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTransportista, isOpen]);

  // ===== Cerrar con ESC
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !viaje) return null;

  // ===== Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTransportista) {
      setNotification({
        type: "warning",
        title: "Selección requerida",
        message: "Debés seleccionar un transportista",
        isVisible: true,
      });
      return;
    }

    if (!selectedChofer) {
      setNotification({
        type: "warning",
        title: "Selección requerida",
        message: "Debés seleccionar un chofer",
        isVisible: true,
      });
      return;
    }

    if (!patChasis) {
      setNotification({
        type: "warning",
        title: "Patente requerida",
        message: "Ingresá o seleccioná la Patente de chasis",
        isVisible: true,
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/viajes/postular-chofer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          viajeId: viaje.id,
          transportistaId: selectedTransportista,
          choferId: selectedChofer,
          vendedorId,
          patChasis,
          patAcoplado: patAcoplado || null,
          sendEmail,
        }),
      });

      const data = await res.json().catch(() => ({} as any));
      if (!res.ok) throw new Error(data?.error || "Error al postular chofer");

      setNotification({
        type: "success",
        title: "¡Chofer y transportista asignados!",
        message: "Se asignaron correctamente al viaje",
        isVisible: true,
      });

      setTimeout(() => {
        onClose();
        router.refresh(); // sin recargar toda la página
      }, 900);
    } catch (err: any) {
      console.error(err);
      setNotification({
        type: "error",
        title: "No se pudo postular",
        message: err?.message ?? "Ocurrió un error al asignar chofer y transportista",
        isVisible: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ===== Render
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="bg-neutral-900 text-white w-full max-w-2xl p-6 rounded-xl shadow-xl"
      >
        <h2 className="text-xl font-semibold mb-4 text-center">
          Postular Chofer
        </h2>

        {/* ===== Detalles del Viaje ===== */}
        <div className="bg-neutral-800 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-medium text-neutral-200 mb-2">
            Detalles del Viaje
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-neutral-400">Número: </span>
              <span className="text-white">{viaje.numero}</span>
            </div>
            <div>
              <span className="text-neutral-400">Fecha: </span>
              <span className="text-white">
                {new Date(viaje.fecha).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Cliente: </span>
              <span className="text-white">{viaje.razonSocial}</span>
            </div>
            <div>
              <span className="text-neutral-400">Ruta: </span>
              <span className="text-white">
                {viaje.origen} → {viaje.destino}
              </span>
            </div>
            <div>
              <span className="text-neutral-400">Artículo: </span>
              <span className="text-white">{viaje.articulo}</span>
            </div>
            <div>
              <span className="text-neutral-400">Cupos Pendientes: </span>
              <span className="text-white">{viaje.cuposPendientes}</span>
            </div>
          </div>
        </div>

        {/* ===== Form ===== */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Fila 1: Transportista y Chofer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Transportista */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Seleccionar Transportista *
              </label>
              <SearchableSelect
                options={transportistaOptions}
                valueId={selectedTransportista}
                onChangeId={(id) => setSelectedTransportista(Number(id))}
                placeholder="Buscar transportista..."
                name="transportista"
                required
                loading={loadingChoferes}
              />
              {/* Detalles del transportista */}
              {selectedTransportistaFull && (
                <div className="bg-neutral-800 p-3 rounded-lg mt-2">
                  <h5 className="text-xs font-medium text-neutral-200 mb-1">
                    Detalles del Transportista
                  </h5>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-neutral-400">CUIT: </span>
                      <span className="text-white">{selectedTransportistaFull.cuit}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Tel: </span>
                      <span className="text-white">{selectedTransportistaFull.telefono}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chofer */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Seleccionar Chofer *
              </label>
              <SearchableSelect
                options={choferOptions}
                valueId={selectedChofer}
                onChangeId={(id) => setSelectedChofer(Number(id))}
                placeholder="Buscar chofer..."
                name="chofer"
                required
                loading={loadingChoferes}
              />
              {/* Detalles del chofer */}
              {selectedChoferFull && (
                <div className="bg-neutral-800 p-3 rounded-lg mt-2">
                  <h5 className="text-xs font-medium text-neutral-200 mb-1">
                    Detalles del Chofer
                  </h5>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-neutral-400">CUIT: </span>
                      <span className="text-white">{selectedChoferFull.cuit}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400">Tel: </span>
                      <span className="text-white">{selectedChoferFull.telefono}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fila 2: Vehículos y Vendedor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Patente Chasis */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Patente Chasis *
              </label>
              {vehiculos.length > 1 ? (
                <select
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm"
                  value={patChasis}
                  onChange={(e) => setPatChasis(e.target.value)}
                  required
                  disabled={loadingVehiculos}
                >
                  <option value="">Seleccionar patente...</option>
                  {vehiculos.map((v, i) => (
                    <option key={i} value={v.patente}>
                      {v.patente}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm"
                  placeholder="Ej.: AB123CD"
                  value={patChasis}
                  onChange={(e) => setPatChasis(e.target.value.toUpperCase())}
                  required
                />
              )}
              {loadingVehiculos && (
                <p className="text-xs text-neutral-400 mt-1">Cargando vehículos...</p>
              )}
            </div>

            {/* Patente Acoplado */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Patente Acoplado
              </label>
              {vehiculos.filter((v) => v.patenteAcoplado).length > 1 ? (
                <select
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm"
                  value={patAcoplado}
                  onChange={(e) => setPatAcoplado(e.target.value)}
                  disabled={loadingVehiculos}
                >
                  <option value="">Sin acoplado</option>
                  {vehiculos
                    .filter((v) => v.patenteAcoplado)
                    .map((v, i) => (
                      <option key={i} value={v.patenteAcoplado!}>
                        {v.patenteAcoplado}
                      </option>
                    ))}
                </select>
              ) : (
                <input
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm"
                  placeholder="Opcional"
                  value={patAcoplado}
                  onChange={(e) => setPatAcoplado(e.target.value.toUpperCase())}
                />
              )}
            </div>

            {/* Vendedor */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-2">
                Vendedor
              </label>
              <select
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-2 text-sm"
                value={vendedorId ?? ""}
                onChange={(e) =>
                  setVendedorId(e.target.value ? Number(e.target.value) : null)
                }
              >
                <option value="">Sin vendedor</option>
                {vendedores.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Fila 3: Opciones adicionales */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded"
              />
              Enviar email de confirmación
            </label>

            {vehiculos.length > 0 && (
              <div className="text-xs text-neutral-400">
                {vehiculos.length} vehículo{vehiculos.length !== 1 ? 's' : ''} disponible{vehiculos.length !== 1 ? 's' : ''}
                {vehiculos.length > 10 && <span className="text-yellow-400"> (mostrando todas las patentes)</span>}
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedTransportista || !selectedChofer || submitting}
              className="px-4 py-2 rounded bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white transition-colors"
            >
              {submitting ? "Guardando..." : "Asignar Transportista y Chofer"}
            </button>
          </div>
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
