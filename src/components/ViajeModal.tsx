"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import SearchableSelect from "./SearchableSelect";
import Notification from "./Notification";

interface Tercero {
  id: number;
  razonSocial: string;
  cuit: string;
  telefono: string;
  email: string;
  tipo: string;
  localidad: number;
}

// Interfaces adaptadas para SearchableSelect
interface TerceroOption {
  id: number;
  nombre: string;
}

interface Producto {
  id: number;
  nombre: string;
  precio: number;
  stock: number;
  oferta: boolean;
  novedad: boolean;
}

interface ProductoOption {
  id: number;
  nombre: string;
}

interface Vendedor {
  id: number;
  nombre: string;
}

interface Localidad {
  id: number | string;
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
  tarifaTransportista?: number | null;
  tolerancia?: number | null;
  cupos: number;
  cuposReservados: number;
  cuposPendientes: number;
  usuario: string;
  equipo: string;
  vendedor: string | null;
  articulo: string;
}

interface ViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje?: Viaje | null;
  onDelete?: (viaje: Viaje) => void;
}

export default function ViajeModal({
  isOpen,
  onClose,
  viaje,
  onDelete,
}: ViajeModalProps) {
  const { data: session } = useSession();
  const [form, setForm] = useState({
    razonSocial: "",
    origen: "",
    destino: "",
    origenId: null as number | string | null,
    destinoId: null as number | string | null,
    articulo: "",
    equipo: "0",
    cupos: "",
    reservados: "",
    pendientes: "",
    tarifa: "",
    tarifaTransportista: "",
    tolerancia: "",
    vendedor: "",
    fecha: new Date().toISOString().split("T")[0], // Fecha por defecto: hoy
  });
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loadingTerceros, setLoadingTerceros] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Opciones formateadas para SearchableSelect
  const [tercerosOptions, setTercerosOptions] = useState<TerceroOption[]>([]);
  const [productosOptions, setProductosOptions] = useState<ProductoOption[]>(
    []
  );
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    isVisible: boolean;
  }>({ type: "success", title: "", message: "", isVisible: false });

  useEffect(() => {
    if (viaje) {
      setForm({
        razonSocial: viaje.razonSocial || "",
        origen: viaje.origen || "",
        destino: viaje.destino || "",
        origenId: null, // Se resuelve por nombre al editar
        destinoId: null,
        articulo: viaje.articulo || "",
        equipo: "0",
        cupos: viaje.cupos?.toString() || "",
        reservados: viaje.cuposReservados?.toString() || "",
        pendientes: viaje.cuposPendientes?.toString() || "",
        tarifa: viaje.tarifa?.toString() || "",
        tarifaTransportista: viaje.tarifaTransportista?.toString() || "",
        tolerancia: viaje.tolerancia?.toString() || "",
        vendedor: viaje.vendedor || "",
        fecha: viaje.fecha ? viaje.fecha.split("T")[0] : new Date().toISOString().split("T")[0],
      });
    } else {
      setForm({
        razonSocial: "",
        origen: "",
        destino: "",
        origenId: null,
        destinoId: null,
        articulo: "",
        equipo: "0",
        cupos: "",
        reservados: "",
        pendientes: "",
        tarifa: "",
        tarifaTransportista: "",
        tolerancia: "",
        vendedor: "",
        fecha: new Date().toISOString().split("T")[0], // Fecha por defecto: hoy
      });
    }
  }, [viaje]);

  useEffect(() => {
    if (isOpen) {
      fetchTerceros();
      fetchProductos();
      fetchVendedores();
      fetchLocalidades();
    }
  }, [isOpen, viaje]);

  // Proponer vendedor por defecto desde la sesión NextAuth
  useEffect(() => {
    if (!isOpen || viaje) return;
    const vendedorId = (session?.user as any)?.vendedorId;
    if (vendedorId && !form.vendedor) {
      setForm((prev) => ({ ...prev, vendedor: String(vendedorId) }));
    }
  }, [isOpen, viaje, session, form.vendedor]);

  const fetchTerceros = async () => {
    setLoadingTerceros(true);
    try {
      const res = await fetch("/api/terceros");
      if (res.ok) {
        const data = await res.json();
        setTerceros(data);
        // Formatear para SearchableSelect
        const options = data.map((tercero: Tercero) => ({
          id: tercero.id,
          nombre: tercero.razonSocial,
        }));
        setTercerosOptions(options);
      }
    } catch (error) {
      console.error("Error al obtener terceros:", error);
    } finally {
      setLoadingTerceros(false);
    }
  };

  const fetchProductos = async () => {
    setLoadingProductos(true);
    try {
      const res = await fetch("/api/productos");
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
        // Formatear para SearchableSelect
        const options = data.map((producto: Producto) => ({
          id: producto.id,
          nombre: producto.nombre,
        }));
        setProductosOptions(options);
      }
    } catch (error) {
      console.error("Error al obtener productos:", error);
    } finally {
      setLoadingProductos(false);
    }
  };

  const fetchVendedores = async () => {
    setLoadingVendedores(true);
    try {
      const res = await fetch("/api/vendedores");
      if (res.ok) {
        const data = await res.json();
        setVendedores(data);
      }
    } catch (error) {
      console.error("Error al obtener vendedores:", error);
    } finally {
      setLoadingVendedores(false);
    }
  };

  const fetchLocalidades = async () => {
    setLoadingLocalidades(true);
    try {
      const res = await fetch("/api/localidades");
      if (res.ok) {
        const data = await res.json();
        setLocalidades(data);
      }
    } catch (error) {
      console.error("Error al obtener localidades:", error);
    } finally {
      setLoadingLocalidades(false);
    }
  };

  const [validationErrors, setValidationErrors] = useState({
    tarifa: "",
    tarifaTransportista: "",
    tolerancia: "",
    cupos: "",
    reservados: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const newForm = { ...form, [e.target.name]: e.target.value };
    const newErrors = { ...validationErrors };

    // Validaciones en tiempo real
    if (e.target.name === "tarifa") {
      const tarifaNum = Number(e.target.value);
      if (e.target.value !== "" && tarifaNum < 0) {
        newErrors.tarifa = "La tarifa no puede ser negativa";
      } else {
        newErrors.tarifa = "";
      }
    }

    if (e.target.name === "tarifaTransportista") {
      const val = Number(e.target.value);
      if (e.target.value !== "" && val < 0) {
        newErrors.tarifaTransportista = "La tarifa transportista no puede ser negativa";
      } else {
        newErrors.tarifaTransportista = "";
      }
    }

    if (e.target.name === "tolerancia") {
      const val = Number(e.target.value);
      if (e.target.value !== "" && val < 0) {
        newErrors.tolerancia = "La tolerancia no puede ser negativa";
      } else {
        newErrors.tolerancia = "";
      }
    }

    if (e.target.name === "cupos") {
      const cuposNum = Number(e.target.value);
      if (e.target.value !== "" && cuposNum <= 0) {
        newErrors.cupos = "Los cupos deben ser mayor a 0";
      } else {
        newErrors.cupos = "";
      }
    }

    // Auto-calcular pendientes cuando cambian cupos o reservados
    if (e.target.name === "cupos" || e.target.name === "reservados") {
      const cupos =
        Number(e.target.name === "cupos" ? e.target.value : newForm.cupos) || 0;
      const reservados =
        Number(
          e.target.name === "reservados" ? e.target.value : newForm.reservados
        ) || 0;
      newForm.pendientes = String(Math.max(0, cupos - reservados));

      // Validar que reservados no sea mayor que cupos
      if (reservados > cupos && cupos > 0) {
        newErrors.reservados = "Los reservados no pueden ser mayores que los cupos totales";
      } else {
        newErrors.reservados = "";
      }
    }

    setValidationErrors(newErrors);
    setForm(newForm);
  };

  const handleSearchableSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Evitar múltiples envíos
    if (saving) return;

    // Validar antes de enviar
    if (validationErrors.tarifa || validationErrors.tarifaTransportista || validationErrors.tolerancia || validationErrors.cupos || validationErrors.reservados) {
      setNotification({
        type: "error",
        title: "Error de validación",
        message: "Por favor corrige los errores antes de continuar",
        isVisible: true,
      });
      return;
    }

    setSaving(true);
    try {
      const url = viaje ? `/api/viajes/${viaje.id}` : "/api/viajes/POST";
      const method = viaje ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch {}

      if (!res.ok) {
        const msg =
          data?.details ||
          data?.error ||
          `No se pudo ${viaje ? "actualizar" : "guardar"} el viaje`;
        throw new Error(msg);
      }

      if (!viaje) {
        const numero = data?.numero as string | undefined;
        if (numero) {
          setNotification({
            type: "success",
            title: "¡Viaje creado con éxito!",
            message: `Número de viaje asignado: ${numero}`,
            isVisible: true,
          });
        } else {
          setNotification({
            type: "success",
            title: "¡Viaje creado con éxito!",
            isVisible: true,
          });
        }
      } else {
        setNotification({
          type: "success",
          title: "¡Viaje actualizado con éxito!",
          message: "Los cambios se han guardado correctamente",
          isVisible: true,
        });
      }

      console.log(`Viaje ${viaje ? "actualizado" : "guardado"} con éxito`);

      // Cerrar el modal y recargar después de un breve delay para que se vea la notificación
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("Error al guardar:", err);
      setNotification({
        type: "error",
        title: "Error al guardar el viaje",
        message:
          (err as any)?.message ||
          `Ocurrió un error al ${viaje ? "actualizar" : "guardar"} el viaje`,
        isVisible: true,
      });
      setSaving(false); // Re-habilitar el botón en caso de error
    }
  };

  const handleDelete = async () => {
    if (!viaje) return;

    const reservados = Number(viaje.cuposReservados || 0);
    const cupos = Number(viaje.cupos || 0);
    const pendientesCalc = cupos - reservados;
    const pendientes = Number(viaje.cuposPendientes ?? pendientesCalc);

    if (reservados > 0) {
      setNotification({
        type: "warning",
        title: "No se puede eliminar el viaje",
        message: "El viaje tiene reservas activas",
        isVisible: true,
      });
      return;
    }

    if (pendientes !== pendientesCalc) {
      setNotification({
        type: "warning",
        title: "No se puede eliminar el viaje",
        message: "Los cupos pendientes no coinciden con el cálculo",
        isVisible: true,
      });
      return;
    }

    if (confirm("¿Estás seguro de que quieres eliminar este viaje?")) {
      setDeleting(true);
      try {
        const identifier = viaje.id || viaje.numero;
        const res = await fetch(`/api/viajes/${identifier}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const msg = await res.json().catch(() => ({} as any));
          setNotification({
            type: "error",
            title: "Error al eliminar el viaje",
            message: msg?.error || "No se pudo eliminar el viaje",
            isVisible: true,
          });
          setDeleting(false);
          return;
        }

        setNotification({
          type: "success",
          title: "¡Viaje eliminado con éxito!",
          message: "El viaje se ha eliminado correctamente",
          isVisible: true,
        });

        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } catch (error) {
        setNotification({
          type: "error",
          title: "Error al eliminar el viaje",
          message: "Ocurrió un error inesperado",
          isVisible: true,
        });
        setDeleting(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start md:items-center justify-center overflow-y-auto">
      <div className="bg-neutral-900 text-white w-full md:max-w-3xl md:m-4 md:rounded-xl shadow-xl min-h-screen md:min-h-0 md:max-h-[90vh] md:flex md:flex-col">
        {/* Header - Sticky en mobile */}
        <div className="sticky top-0 bg-neutral-900 border-b border-neutral-700 px-4 md:px-6 py-4 md:rounded-t-xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-lg md:text-xl font-semibold">
              {viaje ? "Editar Viaje" : "Nuevo Viaje"}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-4 md:p-6 space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4 md:gap-y-6 md:overflow-y-auto md:flex-1"
        >
          {viaje && (
            <div className="col-span-full bg-neutral-800 p-3 rounded-lg">
              <span className="text-sm text-neutral-400">
                Fecha de creación:{" "}
              </span>
              <span className="text-white">
                {new Date(viaje.fecha).toLocaleDateString("es-ES", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </span>
              <br />
              <span className="text-sm text-neutral-400">Número: </span>
              <span className="text-white">{viaje.numero}</span>
            </div>
          )}

          {!viaje && (
            <div className="col-span-full bg-neutral-800 p-3 rounded-lg">
              <span className="text-sm text-neutral-400">Número: </span>
              <span className="text-neutral-300 italic">se generará automáticamente</span>
            </div>
          )}

          {/* Fecha del Negocio - Solo para nuevo viaje */}
          {!viaje && (
            <div className="md:col-span-1">
              <label className="block text-sm font-semibold text-neutral-200 mb-2">
                Fecha del Negocio
              </label>
              <input
                type="date"
                name="fecha"
                value={form.fecha}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-neutral-800 border border-neutral-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base [color-scheme:dark]"
              />
            </div>
          )}

          {/* Cliente - Full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Cliente *
            </label>
            <SearchableSelect
              options={tercerosOptions}
              value={form.razonSocial}
              onChange={(value) =>
                handleSearchableSelectChange("razonSocial", value)
              }
              placeholder="Seleccionar Cliente"
              name="razonSocial"
              required
              loading={loadingTerceros}
            />
          </div>

          {/* Origen y Destino - Full width en mobile, 2 cols en desktop */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Origen *
            </label>
            <SearchableSelect
              options={localidades}
              value={form.origen}
              onChangeId={(id, option) => {
                setForm({ ...form, origen: option.nombre, origenId: id });
              }}
              placeholder="Seleccionar Origen"
              name="origen"
              required
              loading={loadingLocalidades}
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Destino *
            </label>
            <SearchableSelect
              options={localidades}
              value={form.destino}
              onChangeId={(id, option) => {
                setForm({ ...form, destino: option.nombre, destinoId: id });
              }}
              placeholder="Seleccionar Destino"
              name="destino"
              required
              loading={loadingLocalidades}
            />
          </div>

          {/* Producto - Full width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Producto *
            </label>
            <SearchableSelect
              options={productosOptions}
              value={form.articulo}
              onChange={(value) =>
                handleSearchableSelectChange("articulo", value)
              }
              placeholder="Seleccionar Producto"
              name="articulo"
              required
              loading={loadingProductos}
            />
          </div>

          {/* Cupos Section */}
          <div className="md:col-span-2">
            <div className="bg-neutral-800 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-neutral-200 mb-3">
                Gestión de Cupos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Cupos Totales
                  </label>
                  <input
                    type="number"
                    name="cupos"
                    value={form.cupos}
                    onChange={handleChange}
                    placeholder="0"
                    className={`w-full px-3 py-2.5 bg-neutral-700 border rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:border-blue-500 text-base ${
                      validationErrors.cupos
                        ? "border-red-500 focus:ring-red-500"
                        : "border-neutral-600 focus:ring-blue-500"
                    }`}
                    min="1"
                  />
                  {validationErrors.cupos && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.cupos}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Reservados
                  </label>
                  <input
                    type="number"
                    name="reservados"
                    value={form.reservados}
                    onChange={handleChange}
                    placeholder="0"
                    className={`w-full px-3 py-2.5 bg-neutral-700 border rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:border-blue-500 text-base ${
                      validationErrors.reservados
                        ? "border-red-500 focus:ring-red-500"
                        : "border-neutral-600 focus:ring-blue-500"
                    }`}
                    min="0"
                  />
                  {validationErrors.reservados && (
                    <p className="text-red-500 text-xs mt-1">{validationErrors.reservados}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-400 mb-1.5">
                    Pendientes (auto)
                  </label>
                  <input
                    type="number"
                    name="pendientes"
                    value={form.pendientes}
                    readOnly
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-neutral-900 border border-neutral-700 rounded-lg text-neutral-400 cursor-not-allowed text-base"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tarifa (cliente) */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Tarifa
            </label>
            <input
              type="number"
              name="tarifa"
              value={form.tarifa}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full px-3 py-2.5 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:border-blue-500 text-base ${
                validationErrors.tarifa
                  ? "border-red-500 focus:ring-red-500"
                  : "border-neutral-600 focus:ring-blue-500"
              }`}
            />
            {validationErrors.tarifa && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.tarifa}</p>
            )}
          </div>

          {/* Tarifa Transportista */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Tarifa Transportista
            </label>
            <input
              type="number"
              name="tarifaTransportista"
              value={form.tarifaTransportista}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full px-3 py-2.5 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:border-blue-500 text-base ${
                validationErrors.tarifaTransportista
                  ? "border-red-500 focus:ring-red-500"
                  : "border-neutral-600 focus:ring-blue-500"
              }`}
            />
            {validationErrors.tarifaTransportista && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.tarifaTransportista}</p>
            )}
          </div>

          {/* Tolerancia */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Tolerancia
            </label>
            <input
              type="number"
              name="tolerancia"
              value={form.tolerancia}
              onChange={handleChange}
              placeholder="0.00"
              step="0.01"
              min="0"
              className={`w-full px-3 py-2.5 bg-neutral-800 border rounded-lg text-white placeholder-neutral-500 focus:ring-2 focus:border-blue-500 text-base ${
                validationErrors.tolerancia
                  ? "border-red-500 focus:ring-red-500"
                  : "border-neutral-600 focus:ring-blue-500"
              }`}
            />
            {validationErrors.tolerancia && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.tolerancia}</p>
            )}
          </div>

          {/* Vendedor */}
          <div className="md:col-span-1">
            <label className="block text-sm font-semibold text-neutral-200 mb-2">
              Vendedor
            </label>
            <SearchableSelect
              options={vendedores}
              valueId={form.vendedor}
              onChangeId={(id) => {
                setForm({ ...form, vendedor: String(id) });
              }}
              placeholder="Seleccionar Vendedor"
              name="vendedor"
              loading={loadingVendedores}
            />
          </div>


          {/* Botones - Sticky en mobile */}
          <div className="md:col-span-2 sticky bottom-0 bg-neutral-900 border-t border-neutral-700 -mx-4 md:mx-0 px-4 md:px-0 py-4 md:py-0 md:border-0 md:static flex justify-between items-center gap-3 mt-4">
            {viaje && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2.5 rounded-lg bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium flex items-center gap-2"
              >
                {deleting ? (
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
                <span className="hidden sm:inline">
                  {deleting ? "Eliminando..." : "Eliminar"}
                </span>
              </button>
            )}
            <div className="flex gap-2 md:gap-3 flex-1 md:flex-initial justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 md:px-6 py-2.5 rounded-lg bg-neutral-700 hover:bg-neutral-600 text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving || !!validationErrors.tarifa || !!validationErrors.tarifaTransportista || !!validationErrors.tolerancia || !!validationErrors.cupos || !!validationErrors.reservados}
                className="px-4 md:px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="hidden sm:inline">Guardando...</span>
                    <span className="sm:hidden">...</span>
                  </>
                ) : (
                  viaje ? "Actualizar" : "Guardar"
                )}
              </button>
            </div>
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
