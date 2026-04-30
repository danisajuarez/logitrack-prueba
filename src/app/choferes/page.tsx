"use client";

import { useEffect, useState } from "react";
import Header from "../../components/Header";

type Tab = "choferes" | "transportes";

interface Chofer {
  id: number;
  nombre: string;
}

interface Transporte {
  id: number;
  nombre: string;
}

interface ChoferDelTransporte {
  id: number;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  patChasis: string | null;
  patAcoplado: string | null;
}

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

interface ChoferDetalle {
  id: number;
  nombre: string;
  cuit: string | null;
  telefono: string | null;
  direccion: string | null;
  transportista: {
    id: number;
    nombre: string;
    cuit: string | null;
    telefono: string | null;
  } | null;
  patChasis: string | null;
  patAcoplado: string | null;
  viajes: Viaje[];
}

interface TransporteDetalle {
  choferes: ChoferDelTransporte[];
}

export default function ChoferesPage() {
  const [tab, setTab] = useState<Tab>("choferes");

  // — Tab choferes —
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [loadingChoferes, setLoadingChoferes] = useState(true);
  const [busquedaChofer, setBusquedaChofer] = useState("");
  const [choferAbierto, setChoferAbierto] = useState<number | null>(null);
  const [detalleChofer, setDetalleChofer] = useState<ChoferDetalle | null>(null);
  const [loadingDetalleChofer, setLoadingDetalleChofer] = useState(false);

  // — Tab transportes —
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [loadingTransportes, setLoadingTransportes] = useState(true);
  const [busquedaTransporte, setBusquedaTransporte] = useState("");
  const [transporteAbierto, setTransporteAbierto] = useState<number | null>(null);
  const [detalleTransporte, setDetalleTransporte] = useState<TransporteDetalle | null>(null);
  const [loadingDetalleTransporte, setLoadingDetalleTransporte] = useState(false);

  useEffect(() => {
    fetch("/api/choferes")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setChoferes(data); })
      .catch(() => {})
      .finally(() => setLoadingChoferes(false));

    fetch("/api/transportistas")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setTransportes(data); })
      .catch(() => {})
      .finally(() => setLoadingTransportes(false));
  }, []);

  function abrirChofer(id: number) {
    if (choferAbierto === id) { setChoferAbierto(null); setDetalleChofer(null); return; }
    setChoferAbierto(id);
    setDetalleChofer(null);
    setLoadingDetalleChofer(true);
    fetch(`/api/choferes/${id}`)
      .then((r) => r.json())
      .then((data) => setDetalleChofer(data))
      .catch(() => setDetalleChofer(null))
      .finally(() => setLoadingDetalleChofer(false));
  }

  function abrirTransporte(id: number) {
    if (transporteAbierto === id) { setTransporteAbierto(null); setDetalleTransporte(null); return; }
    setTransporteAbierto(id);
    setDetalleTransporte(null);
    setLoadingDetalleTransporte(true);
    fetch(`/api/transportistas/${id}/choferes`)
      .then((r) => r.json())
      .then((data) => setDetalleTransporte({ choferes: Array.isArray(data) ? data : [] }))
      .catch(() => setDetalleTransporte({ choferes: [] }))
      .finally(() => setLoadingDetalleTransporte(false));
  }

  const choferesFiltrados = choferes.filter((c) =>
    c.nombre.toLowerCase().includes(busquedaChofer.toLowerCase())
  );

  const transportesFiltrados = transportes.filter((t) =>
    t.nombre.toLowerCase().includes(busquedaTransporte.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-neutral-900">
      <Header />
      <div className="max-w-2xl mx-auto px-4 pb-16">

        {/* Encabezado */}
        <div className="flex items-center gap-3 mb-6">
          <a
            href="/viajes"
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-800 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </a>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Choferes y Transportes</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-xl mb-5">
          <button
            onClick={() => { setTab("choferes"); setBusquedaChofer(""); setChoferAbierto(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === "choferes"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Choferes
          </button>
          <button
            onClick={() => { setTab("transportes"); setBusquedaTransporte(""); setTransporteAbierto(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
              tab === "transportes"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-sm"
                : "text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 0M13 16l2 0m-2-10l4 5h2a1 1 0 011 1v3l-1 1" />
            </svg>
            Transportes
          </button>
        </div>

        {/* ===== TAB CHOFERES ===== */}
        {tab === "choferes" && (
          <>
            <BuscadorInput
              value={busquedaChofer}
              onChange={setBusquedaChofer}
              placeholder="Buscar chofer por nombre..."
            />

            {!loadingChoferes && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">
                {choferesFiltrados.length} chofer{choferesFiltrados.length !== 1 ? "es" : ""}
                {busquedaChofer && ` para "${busquedaChofer}"`}
              </p>
            )}

            {loadingChoferes ? (
              <Spinner />
            ) : choferesFiltrados.length === 0 ? (
              <Vacio texto={busquedaChofer ? `No hay choferes que coincidan con "${busquedaChofer}"` : "No hay choferes registrados"} />
            ) : (
              <div className="space-y-2">
                {choferesFiltrados.map((c) => {
                  const abierto = choferAbierto === c.id;
                  return (
                    <div key={c.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                      <FilaItem
                        inicial={c.nombre.charAt(0)}
                        nombre={c.nombre}
                        abierto={abierto}
                        onClick={() => abrirChofer(c.id)}
                        colorGradient="from-blue-400 to-purple-500"
                      />
                      {abierto && (
                        <div className="border-t border-gray-100 dark:border-neutral-700 px-4 py-4">
                          {loadingDetalleChofer ? <Spinner small /> : detalleChofer ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <Campo label="CUIT" value={detalleChofer.cuit} />
                                <Campo label="Teléfono" value={detalleChofer.telefono} />
                                {detalleChofer.direccion && <Campo label="Dirección" value={detalleChofer.direccion} full />}
                              </div>

                              <div className="bg-gray-50 dark:bg-neutral-700/40 rounded-lg px-4 py-3">
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">Vehículo</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <Campo label="Patente chasis" value={detalleChofer.patChasis} />
                                  <Campo label="Patente acoplado" value={detalleChofer.patAcoplado} />
                                </div>
                              </div>

                              {detalleChofer.transportista && (
                                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-4 py-3 border border-orange-100 dark:border-orange-800">
                                  <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-2">Transporte</p>
                                  <div className="grid grid-cols-2 gap-3">
                                    <Campo label="Razón Social" value={detalleChofer.transportista.nombre} full />
                                    <Campo label="CUIT" value={detalleChofer.transportista.cuit} />
                                    <Campo label="Teléfono" value={detalleChofer.transportista.telefono} />
                                  </div>
                                </div>
                              )}

                              <SeccionViajes viajes={detalleChofer.viajes} />
                            </div>
                          ) : (
                            <p className="text-sm text-neutral-400 text-center py-4">No se pudo cargar la información.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ===== TAB TRANSPORTES ===== */}
        {tab === "transportes" && (
          <>
            <BuscadorInput
              value={busquedaTransporte}
              onChange={setBusquedaTransporte}
              placeholder="Buscar transporte por nombre..."
            />

            {!loadingTransportes && (
              <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-3">
                {transportesFiltrados.length} transporte{transportesFiltrados.length !== 1 ? "s" : ""}
                {busquedaTransporte && ` para "${busquedaTransporte}"`}
              </p>
            )}

            {loadingTransportes ? (
              <Spinner />
            ) : transportesFiltrados.length === 0 ? (
              <Vacio texto={busquedaTransporte ? `No hay transportes que coincidan con "${busquedaTransporte}"` : "No hay transportes registrados"} />
            ) : (
              <div className="space-y-2">
                {transportesFiltrados.map((t) => {
                  const abierto = transporteAbierto === t.id;
                  return (
                    <div key={t.id} className="bg-white dark:bg-neutral-800 rounded-xl border border-gray-200 dark:border-neutral-700 shadow-sm overflow-hidden">
                      <FilaItem
                        inicial={t.nombre.charAt(0)}
                        nombre={t.nombre}
                        abierto={abierto}
                        onClick={() => abrirTransporte(t.id)}
                        colorGradient="from-orange-400 to-red-500"
                      />
                      {abierto && (
                        <div className="border-t border-gray-100 dark:border-neutral-700 px-4 py-4">
                          {loadingDetalleTransporte ? <Spinner small /> : detalleTransporte ? (
                            detalleTransporte.choferes.length === 0 ? (
                              <p className="text-sm text-neutral-400 text-center py-4">Sin choferes asignados</p>
                            ) : (
                              <div className="space-y-2">
                                <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
                                  Choferes asignados <span className="normal-case font-normal">({detalleTransporte.choferes.length})</span>
                                </p>
                                {detalleTransporte.choferes.map((ch) => (
                                  <div key={ch.id} className="bg-gray-50 dark:bg-neutral-700/40 rounded-lg px-4 py-3">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                                        {ch.nombre.charAt(0)}
                                      </div>
                                      <span className="font-medium text-sm text-neutral-900 dark:text-white">{ch.nombre}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 ml-11">
                                      <Campo label="CUIT" value={ch.cuit} />
                                      <Campo label="Teléfono" value={ch.telefono} />
                                      <Campo label="Patente chasis" value={ch.patChasis} />
                                      <Campo label="Patente acoplado" value={ch.patAcoplado} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <p className="text-sm text-neutral-400 text-center py-4">No se pudo cargar la información.</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ——— Componentes auxiliares ———

function BuscadorInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="relative mb-5">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        autoFocus
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-base"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function FilaItem({ inicial, nombre, abierto, onClick, colorGradient }: {
  inicial: string; nombre: string; abierto: boolean; onClick: () => void; colorGradient: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 dark:hover:bg-neutral-700/50 transition-colors text-left"
    >
      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${colorGradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
        {inicial.toUpperCase()}
      </div>
      <span className="flex-1 font-medium text-neutral-900 dark:text-white text-sm">{nombre}</span>
      <svg
        className={`w-4 h-4 text-neutral-400 transition-transform duration-200 flex-shrink-0 ${abierto ? "rotate-90" : ""}`}
        fill="none" stroke="currentColor" viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}

function SeccionViajes({ viajes }: { viajes: Viaje[] }) {
  return (
    <div>
      <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
        Viajes asignados <span className="normal-case font-normal text-neutral-400">({viajes.length})</span>
      </p>
      {viajes.length === 0 ? (
        <p className="text-sm text-neutral-400 text-center py-3">Sin viajes asignados</p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {viajes.map((v) => (
            <div key={`${v.id}-${v.numero}`} className="bg-white dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-600 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-mono font-semibold text-neutral-700 dark:text-neutral-300">#{v.numero || v.id}</span>
                <span className="text-xs text-neutral-400">
                  {v.fecha ? new Date(v.fecha).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }) : ""}
                </span>
              </div>
              <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">{v.razonSocial}</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{v.origen} → {v.destino}</div>
              {v.articulo && <div className="text-xs text-neutral-400 mt-0.5 truncate">{v.articulo}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Campo({ label, value, full }: { label: string; value: string | null | undefined; full?: boolean }) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-neutral-900 dark:text-white">
        {value && value.trim() ? value : <span className="text-neutral-300 dark:text-neutral-600">—</span>}
      </p>
    </div>
  );
}

function Spinner({ small }: { small?: boolean }) {
  return (
    <div className="flex justify-center py-10">
      <div className={`border-4 border-blue-500 border-t-transparent rounded-full animate-spin ${small ? "w-6 h-6 border-2" : "w-10 h-10"}`} />
    </div>
  );
}

function Vacio({ texto }: { texto: string }) {
  return <div className="text-center py-16 text-neutral-400 dark:text-neutral-500 text-sm">{texto}</div>;
}
