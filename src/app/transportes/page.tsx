"use client";
import { useState, useEffect } from "react";

interface Transporte {
  id: string;
  nombre: string;
  direccion: string;
  telefono: string;
  cuit: string;
}

export default function TransportesPage() {
  const [data, setData] = useState<Transporte[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/transportes");
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  const filtered = data.filter(
    (t) =>
      t.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      t.cuit?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-6 py-12 bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-6xl bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 text-center sm:text-left">
          Lista de Transportistas
        </h2>

        <input
          type="text"
          placeholder="Buscar por nombre o CUIT..."
          className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-gray-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-700">
          <table className="min-w-full text-sm text-left text-neutral-800 dark:text-neutral-200">
            <thead className="bg-gray-100 dark:bg-neutral-700 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3">Nombre</th>
                <th className="p-3">Dirección</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">CUIT</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                >
                  <td className="p-3">{t.nombre}</td>
                  <td className="p-3">{t.direccion}</td>
                  <td className="p-3">{t.telefono}</td>
                  <td className="p-3">{t.cuit}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-4 text-center text-gray-500 dark:text-neutral-400"
                  >
                    No se encontraron resultados.
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
