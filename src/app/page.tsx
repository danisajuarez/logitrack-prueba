import Link from "next/link";
import { getSession } from "@/lib/auth";
import UserNav from "@/components/UserNav";

export default async function Home() {
  const session = await getSession();

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header with User Info */}
        <div className="mb-8 md:mb-12 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
              Dashboard
            </h1>
            <p className="text-neutral-400 text-sm md:text-base">
              Resumen general del sistema de gestión de viajes
            </p>
          </div>
          {session && (
            <UserNav
              username={session.username}
              displayName={session.displayName}
            />
          )}
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link
            href="/viajes"
            className="group bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 hover:border-blue-500 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Viajes</h2>
              <span className="text-4xl">🚌</span>
            </div>
            <p className="text-neutral-300 text-sm mb-3">
              Gestiona y crea nuevos viajes, asigna choferes y administra cupos
            </p>
            <div className="flex items-center text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Ir a Viajes
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/productos"
            className="group bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 hover:border-green-500 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Productos</h2>
              <span className="text-4xl">📦</span>
            </div>
            <p className="text-neutral-300 text-sm mb-3">
              Administra el catálogo de productos y servicios disponibles
            </p>
            <div className="flex items-center text-green-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Ir a Productos
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/terceros"
            className="group bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 hover:border-purple-500 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Terceros</h2>
              <span className="text-4xl">👥</span>
            </div>
            <p className="text-neutral-300 text-sm mb-3">
              Gestiona clientes, proveedores y otros terceros del sistema
            </p>
            <div className="flex items-center text-purple-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Ir a Terceros
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>

          <Link
            href="/transportes"
            className="group bg-gradient-to-br from-orange-900/50 to-orange-800/30 border border-orange-700/50 hover:border-orange-500 rounded-xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/20"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white">Transportes</h2>
              <span className="text-4xl">🚛</span>
            </div>
            <p className="text-neutral-300 text-sm mb-3">
              Administra vehículos, flotas y empresas de transporte
            </p>
            <div className="flex items-center text-orange-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
              Ir a Transportes
              <svg
                className="w-4 h-4 ml-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
