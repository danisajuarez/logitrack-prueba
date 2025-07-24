"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    const fetchData = async () => {
      const params = new URLSearchParams();

      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (minPendientes) params.append("minPendientes", minPendientes);

      const res = await fetch(`/api/viajes?${params.toString()}`);
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
        <h1 className="text-2xl font-bold mb-4 text-neutral-900 dark:text-white">
          Listado de Viajes
        </h1>

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
              {filtrados.length > 0 ? (
                filtrados.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                  >
                    <td className="p-2">{v.fecha.slice(0, 10)}</td>
                    <td className="p-2">{v.numero}</td>
                    <td className="p-2">{v.razonSocial}</td>
                    <td className="p-2">{v.origen}</td>
                    <td className="p-2">{v.destino}</td>
                    <td className="p-2">{v.articulo}</td>
                    <td className="p-2">{v.equipo}</td>
                    <td className="p-2">{v.cupos}</td>
                    <td className="p-2">{v.cuposReservados}</td>
                    <td className="p-2">{v.cuposPendientes}</td>
                    <td className="p-2">${v.tarifa.toLocaleString()}</td>
                    <td className="p-2">{v.vendedor ?? "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={12}
                    className="p-4 text-center text-gray-500 dark:text-neutral-400"
                  >
                    No se encontraron viajes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
