"use client";

import { useEffect, useState } from "react";
import ViajeModal from "../../components/ViajeModal"; // Asegurate de tenerlo creado

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

export default function ViajesPage() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [razonSearch, setRazonSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [minPendientes, setMinPendientes] = useState("");
  const [viajeSeleccionado, setViajeSeleccionado] = useState<Viaje | null>(
    null
  );

  const [isModalOpen, setIsModalOpen] = useState(false); // <-- Estado del modal

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams();

      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (minPendientes) params.append("minPendientes", minPendientes);

      const res = await fetch(`/api/viajes/GET?${params.toString()}`);
      const data = await res.json();
      setViajes(data);
    };

    fetchData();
  }, [fechaDesde, fechaHasta, minPendientes]);

  const filtrados = viajes.filter((v) =>
    v.razonSocial?.toLowerCase().includes(razonSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen p-6 bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto bg-white dark:bg-neutral-800 shadow-md rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Listado de Viajes
          </h1>
          <button
            onClick={() => {
              setViajeSeleccionado(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Viaje
          </button>
        </div>

        {/* Filtros */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <input
            type="text"
            placeholder="Buscar por Razón Social"
            value={razonSearch}
            onChange={(e) => setRazonSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-black dark:text-white"
          />
          <input
            type="date"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md"
          />
          <input
            type="date"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md"
          />
          <input
            type="number"
            placeholder="Mín. Cupos Pendientes"
            value={minPendientes}
            onChange={(e) => setMinPendientes(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md"
          />
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-neutral-800 dark:text-neutral-200">
            <thead className="bg-gray-100 dark:bg-neutral-700 text-xs uppercase tracking-wider">
              <tr>
                <th className="p-2">Fecha</th>
                <th className="p-2">N°</th>
                <th className="p-2">Razón Social</th>
                <th className="p-2">Origen</th>
                <th className="p-2">Destino</th>
                <th className="p-2">Artículo</th>
                <th className="p-2">Equipo</th>
                <th className="p-2">Cupos</th>
                <th className="p-2">Reservados</th>
                <th className="p-2">Pendientes</th>
                <th className="p-2">Tarifa</th>
                <th className="p-2">Vendedor</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((v) => (
                <tr
                  key={`${v.id}-${v.numero}`} // combinación por si hay registros sin ID (de la tabla vieja)
                  className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                >
                  <td className="p-2">{v.fecha?.slice(0, 10)}</td>
                  <td className="p-2">{v.numero}</td>
                  <td className="p-2">{v.razonSocial}</td>
                  <td className="p-2">{v.origen}</td>
                  <td className="p-2">{v.destino}</td>
                  <td className="p-2">{v.articulo}</td>
                  <td className="p-2">{v.equipo}</td>
                  <td className="p-2">{v.cupos}</td>
                  <td className="p-2">{v.cuposReservados}</td>
                  <td className="p-2">{v.cuposPendientes}</td>
                  <td className="p-2">
                    {v.tarifa != null ? `$${v.tarifa.toLocaleString()}` : "-"}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm">{v.vendedor ?? "-"}</span>
                      
                      {/* Botones de acción para todos los viajes */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setViajeSeleccionado(v);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          Editar
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm("¿Eliminar este viaje?")) {
                              const identifier = v.id || v.numero;
                              await fetch(`/api/viajes/${identifier}`, {
                                method: "DELETE",
                              });
                              window.location.reload();
                            }
                          }}
                          className="inline-flex items-center px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                        >
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ViajeModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setViajeSeleccionado(null);
        }}
        viaje={viajeSeleccionado}
      />
    </main>
  );
}
