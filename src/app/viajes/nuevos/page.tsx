"use client";

import { useEffect, useState } from "react";

interface Viaje {
  id: number | null;
  numero: string;
  fecha: string;
  razonSocial: string;
  origen: string;
  destino: string;
  tarifa: number | null;
  cupos: number | null;
  cuposReservados: number | null;
  cuposPendientes: number | null;
  usuario?: string;
  equipo: string | null;
  vendedor: string | null;
  articulo: string | null;
}

export default function ViajesNuevosPage() {
  const [hasNew, setHasNew] = useState<boolean | null>(null);
  const [items, setItems] = useState<Viaje[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/viajes/nuevos`, { cache: "no-store" });
        const data = await res.json();
        if (res.ok && typeof data?.hasNew === "boolean" && Array.isArray(data?.items)) {
          setHasNew(data.hasNew);
          setItems(data.items);
        } else {
          setError("Respuesta inesperada del servidor");
        }
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los viajes nuevos");
      }
    };
    fetchData();
  }, []);

  const renderBanner = (text: string, tone: "info" | "warn" = "info") => (
    <div className={
      `mt-4 rounded-md px-4 py-3 text-sm ` +
      (tone === "info"
        ? "bg-blue-50 text-blue-800 dark:bg-blue-900/40 dark:text-blue-100"
        : "bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-100")
    }>
      {text}
    </div>
  );

  return (
    <main className="min-h-screen p-6 bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto bg-white dark:bg-neutral-800 shadow-md rounded-xl p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Viajes nuevos</h1>
        </div>

        {error && renderBanner(error, "warn")}

        {hasNew === false && renderBanner("No se encontraron nuevos viajes.")}

        {hasNew && (
          <div className="overflow-x-auto mt-6">
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
                {items.map((v, index) => (
                  <tr key={v.id ? `id-${v.id}` : `numero-${v.numero}-${index}`} className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition">
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
                    <td className="p-2">{v.tarifa != null ? `$${v.tarifa.toLocaleString()}` : "-"}</td>
                    <td className="p-2">{v.vendedor || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && renderBanner("No hay elementos para mostrar.", "info")}
          </div>
        )}
      </div>
    </main>
  );
}

