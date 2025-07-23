"use client";
import { useState, useEffect } from "react";

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  stock: number;
  oferta: boolean;
  novedad: boolean;
}

export default function ProductosPage() {
  const [data, setData] = useState<Producto[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const res = await fetch("/api/productos");
      const json = await res.json();
      setData(json);
    };
    fetchData();
  }, []);

  const filtered = data.filter((p) =>
    p.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen flex flex-col items-center justify-start px-6 py-12 bg-gray-50 dark:bg-neutral-900">
      <div className="w-full max-w-6xl bg-white dark:bg-neutral-800 rounded-xl shadow-md p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6 text-center sm:text-left">
          Lista de Productos
        </h2>

        <input
          type="text"
          placeholder="Buscar por nombre de producto..."
          className="w-full mb-6 px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white placeholder-gray-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-700">
          <table className="min-w-full text-sm text-left text-neutral-800 dark:text-neutral-200">
            <thead className="bg-gray-100 dark:bg-neutral-700 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-3">Código</th>
                <th className="p-3">Producto</th>
                <th className="p-3">Precio</th>
                <th className="p-3">Stock</th>
                <th className="p-3">Oferta</th>
                <th className="p-3">Novedad</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                >
                  <td className="p-3">{p.id}</td>
                  <td className="p-3">{p.nombre}</td>
                  <td className="p-3">
                    {p.precio != null ? `$${p.precio.toLocaleString()}` : "—"}
                  </td>

                  <td className="p-3">{p.stock}</td>
                  <td className="p-3">{p.oferta ? "Sí" : "No"}</td>
                  <td className="p-3">{p.novedad ? "Sí" : "No"}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-gray-500 dark:text-neutral-400"
                  >
                    No se encontraron productos.
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
