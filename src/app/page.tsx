"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ClientUserNav from "@/components/ClientUserNav";

interface Viaje {
  id: number;
  numero: string;
  fecha: string;
  razonSocial: string;
  origen: string;
  destino: string;
  cupos: number;
  cuposReservados: number;
  cuposPendientes: number;
  postulados?: number;
  vendedor: string | null;
}

interface DashboardStats {
  totalViajes: number;
  viajesProximos: number;
  cuposDisponibles: number;
  totalChoferes: number;
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    totalViajes: 0,
    viajesProximos: 0,
    cuposDisponibles: 0,
    totalChoferes: 0,
  });
  const [proximosViajes, setProximosViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const fechaHoy = `${yyyy}-${mm}-${dd}`;

        const [viajesRes, choferesRes] = await Promise.all([
          fetch(`/api/viajes/GET?fechaDesde=${fechaHoy}`),
          fetch("/api/choferes"),
        ]);

        const viajes: Viaje[] = await viajesRes.json();
        const choferes = await choferesRes.json();

        const viajesProximos7Dias = viajes.filter((v) => {
          const fechaViaje = new Date(v.fecha);
          const diff = fechaViaje.getTime() - today.getTime();
          const dias = diff / (1000 * 60 * 60 * 24);
          return dias >= 0 && dias <= 7;
        });

        const cuposDisponibles = viajes.reduce(
          (sum, v) => sum + (v.cuposPendientes || 0),
          0
        );

        setStats({
          totalViajes: viajes.length,
          viajesProximos: viajesProximos7Dias.length,
          cuposDisponibles,
          totalChoferes: Array.isArray(choferes) ? choferes.length : 0,
        });

        setProximosViajes(viajes.slice(0, 5));
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
                Estadísticas
              </h1>
              <p className="text-neutral-400 text-sm md:text-base">
                Resumen general del sistema de gestión de viajes
              </p>
            </div>
            <ClientUserNav />
          </div>

          {/* Volver a Viajes */}
          <Link
            href="/viajes"
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver a Viajes
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 md:mb-12">
          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-neutral-400 font-medium">
                Viajes Activos
              </span>
              <span className="text-2xl">📋</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white">
              {loading ? (
                <div className="w-12 h-8 bg-neutral-700 animate-pulse rounded"></div>
              ) : (
                stats.totalViajes
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Desde hoy</p>
          </div>

          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-neutral-400 font-medium">
                Próximos 7 Días
              </span>
              <span className="text-2xl">📅</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-blue-400">
              {loading ? (
                <div className="w-12 h-8 bg-neutral-700 animate-pulse rounded"></div>
              ) : (
                stats.viajesProximos
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Viajes próximos</p>
          </div>

          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-neutral-400 font-medium">
                Cupos Disponibles
              </span>
              <span className="text-2xl">✅</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-green-400">
              {loading ? (
                <div className="w-12 h-8 bg-neutral-700 animate-pulse rounded"></div>
              ) : (
                stats.cuposDisponibles
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">Por asignar</p>
          </div>

          <div className="bg-gradient-to-br from-neutral-800 to-neutral-900 border border-neutral-700 rounded-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs md:text-sm text-neutral-400 font-medium">
                Choferes
              </span>
              <span className="text-2xl">👨‍✈️</span>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-purple-400">
              {loading ? (
                <div className="w-12 h-8 bg-neutral-700 animate-pulse rounded"></div>
              ) : (
                stats.totalChoferes
              )}
            </div>
            <p className="text-xs text-neutral-500 mt-1">En sistema</p>
          </div>
        </div>

        {/* Recent Trips Table */}
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl md:text-2xl font-bold">Próximos Viajes</h2>
            <Link
              href="/viajes"
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Ver todos →
            </Link>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 bg-neutral-700/50 animate-pulse rounded"
                ></div>
              ))}
            </div>
          ) : proximosViajes.length === 0 ? (
            <div className="text-center py-12 text-neutral-400">
              <p className="text-lg mb-2">No hay viajes próximos</p>
              <p className="text-sm">Los viajes programados aparecerán aquí</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-3">
                {proximosViajes.map((viaje) => (
                  <div
                    key={viaje.id}
                    className="bg-neutral-900/60 border border-neutral-700 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-sm font-semibold text-white">
                          #{viaje.numero}
                        </div>
                        <div className="text-xs text-neutral-400">
                          {new Date(viaje.fecha).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                        </div>
                      </div>
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          (viaje.cuposPendientes || 0) > 0
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {viaje.cuposPendientes || 0} disponible
                        {viaje.cuposPendientes !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="text-sm text-neutral-300 mb-1 truncate">
                      {viaje.razonSocial}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {viaje.origen} → {viaje.destino}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <table className="hidden md:table min-w-full text-sm">
                <thead className="border-b border-neutral-700">
                  <tr className="text-left text-neutral-400">
                    <th className="pb-3 font-medium">Viaje</th>
                    <th className="pb-3 font-medium">Fecha</th>
                    <th className="pb-3 font-medium">Cliente</th>
                    <th className="pb-3 font-medium">Ruta</th>
                    <th className="pb-3 font-medium text-center">Cupos</th>
                    <th className="pb-3 font-medium text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-700/50">
                  {proximosViajes.map((viaje) => (
                    <tr
                      key={viaje.id}
                      className="hover:bg-neutral-800/50 transition-colors"
                    >
                      <td className="py-3 font-medium text-white">
                        #{viaje.numero}
                      </td>
                      <td className="py-3 text-neutral-300">
                        {new Date(viaje.fecha).toLocaleDateString("es-ES", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </td>
                      <td className="py-3 text-neutral-300 max-w-xs truncate">
                        {viaje.razonSocial}
                      </td>
                      <td className="py-3 text-neutral-400 text-xs">
                        {viaje.origen} → {viaje.destino}
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-neutral-300">
                          {viaje.cuposPendientes || 0}/{viaje.cupos}
                        </span>
                      </td>
                      <td className="py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                            (viaje.cuposPendientes || 0) > 0
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {(viaje.cuposPendientes || 0) > 0
                            ? "Disponible"
                            : "Completo"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
