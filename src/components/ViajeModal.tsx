"use client";
import { useState, useEffect } from "react";

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
    fecha: "",
    numero: "",
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
  });

  useEffect(() => {
    if (viaje) {
      setForm({
        fecha: viaje.fecha?.slice(0, 10) || "",
        numero: viaje.numero || "",
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
      });
    } else {
      setForm({
        fecha: "",
        numero: "",
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
      });
    }
  }, [viaje]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
          <input
            type="text"
            name="fecha"
            value={form.fecha}
            onChange={handleChange}
            placeholder="Fecha"
            className="input w-full"
          />

          <input
            type="text"
            name="numero"
            value={form.numero}
            onChange={handleChange}
            placeholder="N°"
            className="input w-full"
          />

          <input
            type="text"
            name="razonSocial"
            value={form.razonSocial}
            onChange={handleChange}
            placeholder="Razón Social"
            className="input w-full"
          />

          <input
            type="text"
            name="origen"
            value={form.origen}
            onChange={handleChange}
            placeholder="Origen"
            className="input w-full"
          />

          <input
            type="text"
            name="destino"
            value={form.destino}
            onChange={handleChange}
            placeholder="Destino"
            className="input w-full"
          />

          <input
            type="text"
            name="articulo"
            value={form.articulo}
            onChange={handleChange}
            placeholder="Artículo"
            className="input w-full"
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

          <input
            type="text"
            name="vendedor"
            value={form.vendedor}
            onChange={handleChange}
            placeholder="Vendedor"
            className="input w-full"
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
