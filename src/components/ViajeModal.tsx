"use client";
import { useState, useEffect } from "react";
import SearchableSelect from "./SearchableSelect";

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

interface Proveedor {
  id: number;
  razonSocial: string;
  cuit: string;
  telefono: string;
  email: string;
}

interface ProveedorOption {
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
  proveedorId?: number;
  proveedorNombre?: string;
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
    equipo: "",
    cupos: "",
    reservados: "",
    pendientes: "",
    tarifa: "",
    vendedor: "",
    proveedorId: "",
    proveedor: "",
  });
  const [terceros, setTerceros] = useState<Tercero[]>([]);
  const [loadingTerceros, setLoadingTerceros] = useState(false);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingProveedores, setLoadingProveedores] = useState(false);
  
  // Opciones formateadas para SearchableSelect
  const [tercerosOptions, setTercerosOptions] = useState<TerceroOption[]>([]);
  const [productosOptions, setProductosOptions] = useState<ProductoOption[]>([]);
  const [proveedoresOptions, setProveedoresOptions] = useState<ProveedorOption[]>([]);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loadingVendedores, setLoadingVendedores] = useState(false);
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [loadingLocalidades, setLoadingLocalidades] = useState(false);

  useEffect(() => {
    if (viaje) {
      setForm({
        razonSocial: viaje.razonSocial || "",
        origen: viaje.origen || "",
        destino: viaje.destino || "",
        articulo: viaje.articulo || "",
        equipo: viaje.equipo || "",
        cupos: viaje.cupos?.toString() || "",
        reservados: viaje.cuposReservados?.toString() || "",
        pendientes: viaje.cuposPendientes?.toString() || "",
        tarifa: viaje.tarifa?.toString() || "",
        vendedor: viaje.vendedor || "",
        proveedorId: viaje.proveedorId?.toString() || "",
        proveedor: viaje.proveedorNombre || "",
      });
    } else {
      setForm({
        razonSocial: "",
        origen: "",
        destino: "",
        articulo: "",
        equipo: "",
        cupos: "",
        reservados: "",
        pendientes: "",
        tarifa: "",
        vendedor: "",
        proveedorId: "",
        proveedor: "",
      });
    }
  }, [viaje]);

  useEffect(() => {
    if (isOpen) {
      fetchTerceros();
      fetchProductos();
      fetchProveedores();
      fetchVendedores();
      fetchLocalidades();
    }
  }, [isOpen]);

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

  const fetchProveedores = async () => {
    setLoadingProveedores(true);
    try {
      const res = await fetch('/api/proveedores');
      if (res.ok) {
        const data = await res.json();
        setProveedores(data);
        // Formatear para SearchableSelect
        const options = data.map((proveedor: Proveedor) => ({
          id: proveedor.id,
          nombre: proveedor.razonSocial
        }));
        setProveedoresOptions(options);
      }
    } catch (error) {
      console.error('Error al obtener proveedores:', error);
    } finally {
      setLoadingProveedores(false);
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
    setForm({ ...form, [e.target.name]: e.target.value });
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

      if (!res.ok) throw new Error(`No se pudo ${viaje ? 'actualizar' : 'guardar'} el viaje`);

      console.log(`Viaje ${viaje ? 'actualizado' : 'guardado'} con éxito`);
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Error al guardar:", err);
      alert(`Ocurrió un error al ${viaje ? 'actualizar' : 'guardar'} el viaje`);
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
              <span className="text-white">{new Date(viaje.fecha).toLocaleString('es-ES')}</span>
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

          <SearchableSelect
            options={tercerosOptions}
            value={form.razonSocial}
            onChange={(value) => handleSearchableSelectChange('razonSocial', value)}
            placeholder="Seleccionar Cliente"
            name="razonSocial"
            required
            loading={loadingTerceros}
          />

          <SearchableSelect
            options={localidades}
            value={form.origen}
            onChange={(value) => handleSearchableSelectChange('origen', value)}
            placeholder="Seleccionar Origen"
            name="origen"
            required
            loading={loadingLocalidades}
          />

          <SearchableSelect
            options={localidades}
            value={form.destino}
            onChange={(value) => handleSearchableSelectChange('destino', value)}
            placeholder="Seleccionar Destino"
            name="destino"
            required
            loading={loadingLocalidades}
          />

          <SearchableSelect
            options={productosOptions}
            value={form.articulo}
            onChange={(value) => handleSearchableSelectChange('articulo', value)}
            placeholder="Seleccionar Producto"
            name="articulo"
            required
            loading={loadingProductos}
          />

          <input
            type="text"
            name="equipo"
            value={form.equipo}
            onChange={handleChange}
            placeholder="Equipo"
            className="input w-full"
          />

          <input
            type="number"
            name="cupos"
            value={form.cupos}
            onChange={handleChange}
            placeholder="Cupos"
            className="input w-full"
          />

          <input
            type="number"
            name="reservados"
            value={form.reservados}
            onChange={handleChange}
            placeholder="Reservados"
            className="input w-full"
          />

          <input
            type="number"
            name="pendientes"
            value={form.pendientes}
            onChange={handleChange}
            placeholder="Pendientes"
            className="input w-full"
          />

          <input
            type="number"
            name="tarifa"
            value={form.tarifa}
            onChange={handleChange}
            placeholder="Tarifa"
            className="input w-full"
          />

          <SearchableSelect
            options={vendedores}
            value={form.vendedor}
            onChange={(value) => handleSearchableSelectChange('vendedor', value)}
            placeholder="Seleccionar Vendedor"
            name="vendedor"
            loading={loadingVendedores}
          />

          <SearchableSelect
            options={proveedoresOptions}
            value={form.proveedor}
            onChange={(value) => {
              // Encontrar el proveedor seleccionado para obtener su ID
              const proveedorSeleccionado = proveedores.find(p => p.razonSocial === value);
              handleSearchableSelectChange('proveedorId', proveedorSeleccionado?.id.toString() || '');
              handleSearchableSelectChange('proveedor', value);
            }}
            placeholder="Seleccionar Proveedor"
            name="proveedor"
            required
            loading={loadingProveedores}
          />

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
    </div>
  );
}
