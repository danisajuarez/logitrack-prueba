"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Header from "../../../components/Header";

interface Viaje {
  id: number;
  numero: string;
  fecha: string;
  razonSocial: string;
  origen: string;
  destino: string;
  articulo: string;
  cupos: number;
}

interface Transportista {
  id: number;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  direccion: string | null;
}

interface ChoferDetalle {
  id: number;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  direccion: string | null;
  transportista: Transportista | null;
  patChasis: string | null;
  patAcoplado: string | null;
  viajes: Viaje[];
}

export default function ChoferDetallePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [chofer, setChofer] = useState<ChoferDetalle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/choferes/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => setChofer(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <Header />
        <div className="flex justify-center pt-24">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </main>
    );
  }

  if (error || !chofer) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-neutral-900">
        <Header />
        <div className="max-w-3xl mx-auto px-4 pt-16 text-center">
          <p className="text-neutral-500 dark:text-neutral-400 text-lg">Chofer no encontrado.</p>
          <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline text-sm">
            Volver
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <Header />
      <div className="max-w-3xl mx-auto px-4 pb-12">

        {/* Botón volver */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 mb-6 text-sm text-neutral-500 hover:text-neutral-800 dark:hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver a choferes
        </button>

        {/* Card principal del chofer */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6 mb-6">
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {chofer.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 dark:text-white">{chofer.nombre}</h1>
              <span className="text-xs font-medium px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
                Chofer
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label="CUIT" value={chofer.cuit} />
            <InfoField label="Teléfono" value={chofer.telefono} />
            <InfoField label="Dirección" value={chofer.direccion} />
          </div>
        </div>

        {/* Vehículo */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6 mb-6">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 0M13 16l2 0m-2-10l4 5h2a1 1 0 011 1v3l-1 1" />
            </svg>
            Vehículo
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <InfoField label="Patente chasis" value={chofer.patChasis} />
            <InfoField label="Patente acoplado" value={chofer.patAcoplado} />
          </div>
        </div>

        {/* Transportista */}
        {chofer.transportista && (
          <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6 mb-6">
            <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Transportista
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label="Razón Social" value={chofer.transportista.nombre} />
              <InfoField label="CUIT" value={chofer.transportista.cuit} />
              <InfoField label="Teléfono" value={chofer.transportista.telefono} />
              <InfoField label="Dirección" value={chofer.transportista.direccion} />
            </div>
          </div>
        )}

        {/* Viajes */}
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-700 p-6">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Viajes asignados
            <span className="ml-auto text-sm font-normal text-neutral-400">{chofer.viajes.length} en total</span>
          </h2>

          {chofer.viajes.length === 0 ? (
            <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center py-6">
              Sin viajes asignados
            </p>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-neutral-700 -mx-6 px-0">
              {chofer.viajes.map((v) => (
                <div key={`${v.id}-${v.numero}`} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs text-neutral-400">
                          {v.fecha ? new Date(v.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                        </span>
                        <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300">
                          #{v.numero || v.id}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">{v.razonSocial}</div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        {v.origen} → {v.destino}
                      </div>
                      {v.articulo && (
                        <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{v.articulo}</div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                      {v.cupos} cupos
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function InfoField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">{label}</div>
      <div className="text-sm font-medium text-neutral-900 dark:text-white">
        {value && value.trim() ? value : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
      </div>
    </div>
  );
}
