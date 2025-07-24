"use client";
import Link from "next/link";

export default function Home() {
  const opciones = [
    {
      titulo: "Terceros",
      descripcion: "Ver listado de clientes, proveedores y transportistas.",
      href: "/terceros",
    },
    {
      titulo: "Transportes",
      descripcion: "Consultar encabezados de cartas de porte.",
      href: "/transportes",
    },
    {
      titulo: "Productos",
      descripcion: "Listar productos y artículos disponibles.",
      href: "/productos",
    },
    {
      titulo: "viajes",
      descripcion: "Listar viajes y sus datos.",
      href: "/viajes",
    },
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-gray-50 dark:bg-neutral-900">
      <h1 className="text-3xl font-bold mb-8 text-center text-neutral-800 dark:text-white">
        ¿Qué lista querés ver?
      </h1>
      <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 w-full max-w-5xl">
        {opciones.map((opcion) => (
          <Link
            key={opcion.href}
            href={opcion.href}
            className="group bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl p-6 shadow-md hover:shadow-lg transition duration-200 hover:scale-[1.02] flex flex-col justify-between"
          >
            <h2 className="text-xl font-semibold text-neutral-800 dark:text-white group-hover:underline underline-offset-4">
              {opcion.titulo}
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
              {opcion.descripcion}
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
