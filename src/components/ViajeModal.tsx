"use client";
import { useState, useEffect } from "react";
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

interface ViajeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viaje?: Viaje | null;
}

export default function ViajeModal({ isOpen, onClose, viaje }: ViajeModalProps) {
  const [form, setForm] = useState({
    razonSocial: "",
    origen: "",
    destino: "",
    articulo: "",
    equipo: "0",
    cupos: "",
    reservados: "",
    pendientes: "",
    tarifa: "",
    vendedor: "",
  });
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loadingTerceros, setLoadingTerceros] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  
  // Opciones formateadas para SearchableSelect
  const [tercerosOptions, setTercerosOptions] = useState<TerceroOption[]>([]);
  const [productosOptions, setProductosOptions] = useState<ProductoOption[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);
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
        articulo: viaje.articulo || "",
        equipo: "0",
        cupos: viaje.cupos?.toString() || "",
        reservados: viaje.cuposReservados?.toString() || "",
        pendientes: viaje.cuposPendientes?.toString() || "",
        tarifa: viaje.tarifa?.toString() || "",
        vendedor: viaje.vendedor || "",
      });
    } else {
      setForm({
        razonSocial: "",
        origen: "",
        destino: "",
        articulo: "",
        equipo: "0",
        cupos: "",
        reservados: "",
        pendientes: "",
        tarifa: "",
        vendedor: "",
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

  const fetchTerceros = async () => {
    setLoadingTerceros(true);
    try {
      const res = await fetch('/api/terceros');
      if (res.ok) {
        const data = await res.json();
        setTerceros(data);
        // Formatear para SearchableSelect
        const options = data.map((tercero: Tercero) => ({
          id: tercero.id,
          nombre: tercero.razonSocial
        }));
        setTercerosOptions(options);
      }
    } catch (error) {
      console.error('Error al obtener terceros:', error);
    } finally {
      setLoadingTerceros(false);
    }
  };

  const fetchProductos = async () => {
    setLoadingProductos(true);
    try {
      const res = await fetch('/api/productos');
      if (res.ok) {
        const data = await res.json();
        setProductos(data);
        // Formatear para SearchableSelect
        const options = data.map((producto: Producto) => ({
          id: producto.id,
          nombre: producto.nombre
        }));
        setProductosOptions(options);
      }
    } catch (error) {
      console.error('Error al obtener productos:', error);
    } finally {
      setLoadingProductos(false);
    }
  };


  const fetchVendedores = async () => {
    setLoadingVendedores(true);
    try {
      const res = await fetch('/api/vendedores');
      if (res.ok) {
        const data = await res.json();
        setVendedores(data);
      }
    } catch (error) {
      console.error('Error al obtener vendedores:', error);
    } finally {
      setLoadingVendedores(false);
    }
  };

  const fetchLocalidades = async () => {
    setLoadingLocalidades(true);
    try {
      const res = await fetch('/api/localidades');
      if (res.ok) {
        const data = await res.json();
        setLocalidades(data);
      }
    } catch (error) {
      console.error('Error al obtener localidades:', error);
    } finally {
      setLoadingLocalidades(false);
    }
  };


  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const newForm = { ...form, [e.target.name]: e.target.value };

    // Auto-calcular pendientes cuando cambian cupos o reservados
    if (e.target.name === 'cupos' || e.target.name === 'reservados') {
      const cupos = Number(e.target.name === 'cupos' ? e.target.value : newForm.cupos) || 0;
      const reservados = Number(e.target.name === 'reservados' ? e.target.value : newForm.reservados) || 0;
      newForm.pendientes = String(Math.max(0, cupos - reservados));
    }

    setForm(newForm);
  };

  const handleSearchableSelectChange = (name: string, value: string) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        const msg = data?.details || data?.error || `No se pudo ${viaje ? 'actualizar' : 'guardar'} el viaje`;
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

      console.log(`Viaje ${viaje ? 'actualizado' : 'guardado'} con éxito`);

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
        message: (err as any)?.message || `Ocurrió un error al ${viaje ? 'actualizar' : 'guardar'} el viaje`,
        isVisible: true,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-neutral-900 text-white w-full max-w-3xl p-6 rounded-xl shadow-xl">
        <h2 className="text-xl font-semibold mb-4 text-center">
          {viaje ? "Editar Viaje" : "Nuevo Viaje"}
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 gap-y-6"
        >
          {viaje && (
            <div className="col-span-full bg-neutral-800 p-3 rounded-lg">
              <span className="text-sm text-neutral-400">Fecha de creación: </span>
              <span className="text-white">{new Date(viaje.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
              <br />
              <span className="text-sm text-neutral-400">Número: </span>
              <span className="text-white">{viaje.numero}</span>
            </div>
          )}

          {!viaje && (
            <div className="col-span-full bg-neutral-700 p-3 rounded-lg text-center">
              <span className="text-sm text-neutral-300">El número de viaje se generará automáticamente</span>
            </div>
          )}

          <div className="col-span-full">
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Cliente *
            </label>
            <SearchableSelect
              options={tercerosOptions}
              value={form.razonSocial}
              onChange={(value) => handleSearchableSelectChange('razonSocial', value)}
              placeholder="Seleccionar Cliente"
              name="razonSocial"
              required
              loading={loadingTerceros}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Origen *
            </label>
            <SearchableSelect
              options={localidades}
              value={form.origen}
              onChange={(value) => handleSearchableSelectChange('origen', value)}
              placeholder="Seleccionar Origen"
              name="origen"
              required
              loading={loadingLocalidades}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Destino *
            </label>
            <SearchableSelect
              options={localidades}
              value={form.destino}
              onChange={(value) => handleSearchableSelectChange('destino', value)}
              placeholder="Seleccionar Destino"
              name="destino"
              required
              loading={loadingLocalidades}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Producto *
            </label>
            <SearchableSelect
              options={productosOptions}
              value={form.articulo}
              onChange={(value) => handleSearchableSelectChange('articulo', value)}
              placeholder="Seleccionar Producto"
              name="articulo"
              required
              loading={loadingProductos}
            />
          </div>

          {/* Equipo oculto en UI; el servidor lo fija en '0' */}

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Cupos
            </label>
            <input
              type="number"
              name="cupos"
              value={form.cupos}
              onChange={handleChange}
              placeholder="Cupos"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Reservados
            </label>
            <input
              type="number"
              name="reservados"
              value={form.reservados}
              onChange={handleChange}
              placeholder="Reservados"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Pendientes (calculado automáticamente)
            </label>
            <input
              type="number"
              name="pendientes"
              value={form.pendientes}
              readOnly
              placeholder="Pendientes (calculado)"
              className="input w-full bg-gray-100 dark:bg-neutral-700 text-gray-600 dark:text-neutral-400 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Tarifa
            </label>
            <input
              type="number"
              name="tarifa"
              value={form.tarifa}
              onChange={handleChange}
              placeholder="Tarifa"
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Vendedor (opcional)
            </label>
            <SearchableSelect
              options={vendedores}
              valueId={form.vendedor ? parseInt(form.vendedor) : null}
              onChangeId={(id, option) => {
                setForm({
                  ...form,
                  vendedor: String(id ?? ''),
                });
              }}
              placeholder="Seleccionar Vendedor"
              name="vendedor"
              loading={loadingVendedores}
            />
          </div>


          {/* Botones */}
          <div className="flex justify-end col-span-full gap-4 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white"
            >
              {viaje ? "Actualizar" : "Guardar"}
            </button>
          </div>
        </form>
      </div>

      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </div>
  );
}
