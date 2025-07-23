"use client";
import { useState, useEffect } from "react";

interface Tercero {
  id: string;
  razonSocial: string;
  cuit: string;
  telefono: string;
  email: string;
  tipo: string;
  localidad: string;
}

export default function TercerosTable() {
  const [data, setData] = useState<Tercero[]>([]);
  const [search, setSearch] = useState("");
  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/terceros");
        const json = await res.json();
        if (Array.isArray(json)) {
          setData(json);
        } else {
          console.error("Respuesta inesperada:", json);
          setData([]);
        }
      } catch (error) {
        console.error("Error al traer terceros:", error);
        setData([]);
      }
    };
    fetchData();
  }, []);

  const filtered = data.filter((ter) =>
    ter.razonSocial.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-6 py-12 bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-6xl bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 text-center sm:text-left">
          Lista de Terceros
        </h2>

        <input
          type="text"
          placeholder="Buscar por razón social..."
          className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-gray-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-700">
          <table className="min-w-full text-sm text-left text-neutral-800 dark:text-neutral-200">
            <thead className="bg-gray-100 dark:bg-neutral-700 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3">Razón Social</th>
                <th className="p-3">CUIT</th>
                <th className="p-3">Teléfono</th>
                <th className="p-3">Email</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Localidad</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ter) => (
                <tr
                  key={ter.id}
                  className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                >
                  <td className="p-3">{ter.razonSocial ?? "—"}</td>
                  <td className="p-3">{ter.cuit ?? "—"}</td>
                  <td className="p-3">{ter.telefono ?? "—"}</td>
                  <td className="p-3">{ter.email ?? "—"}</td>
                  <td className="p-3">{ter.tipo ?? "—"}</td>
                  <td className="p-3">{ter.localidad ?? "—"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
