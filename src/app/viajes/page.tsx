"use client";

import { useCallback, useEffect, useState } from "react";
import ViajeModal from "../../components/ViajeModal"; // Asegurate de tenerlo creado
import ChoferModal from "../../components/ChoferModal";
import Notification from "../../components/Notification";
import Header from "../../components/Header";

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
  postulados?: number;
  usuario: string;
  vendedorNombre: string | null;
  equipo: string;
  vendedor: string | null;
  articulo: string;
}

export default function ViajesPage() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [loading, setLoading] = useState(false);
  const [razonSearch, setRazonSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [fechaHasta, setFechaHasta] = useState("");
  const [minPendientes, setMinPendientes] = useState("");
  const [viajeSeleccionado, setViajeSeleccionado] = useState<Viaje | null>(
    null
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChoferModalOpen, setIsChoferModalOpen] = useState(false);
  const [viajeParaChofer, setViajeParaChofer] = useState<Viaje | null>(null);
  const [noHayViajes, setNoHayViajes] = useState(false);

  // Buscador unificado
  type TipoBusqueda = "cliente" | "chofer" | "transporte";
  interface OpcionBusqueda { id: number; nombre: string; tipo: TipoBusqueda; }
  const [opcionesBusqueda, setOpcionesBusqueda] = useState<OpcionBusqueda[]>([]);
  const [busquedaTexto, setBusquedaTexto] = useState("");
  const [busquedaDropdownAbierto, setBusquedaDropdownAbierto] = useState(false);
  const [busquedaSeleccionada, setBusquedaSeleccionada] = useState<OpcionBusqueda | null>(null);
  const [viajeIdsFiltrados, setViajeIdsFiltrados] = useState<number[] | null>(null);
  const [loadingOpciones, setLoadingOpciones] = useState(false);
  const [loadingBusquedaFiltro, setLoadingBusquedaFiltro] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    isVisible: boolean;
  }>({ type: "success", title: "", message: "", isVisible: false });

  useEffect(() => {
    setLoadingOpciones(true);
    Promise.all([
      fetch("/api/choferes").then((r) => r.json()).catch(() => []),
      fetch("/api/transportistas").then((r) => r.json()).catch(() => []),
    ]).then(([choferes, transportistas]) => {
      const opciones: OpcionBusqueda[] = [
        ...(Array.isArray(choferes) ? choferes.map((c: any) => ({ id: c.id, nombre: c.nombre, tipo: "chofer" as TipoBusqueda })) : []),
        ...(Array.isArray(transportistas) ? transportistas.map((t: any) => ({ id: t.id, nombre: t.nombre, tipo: "transporte" as TipoBusqueda })) : []),
      ];
      setOpcionesBusqueda(opciones);
    }).finally(() => setLoadingOpciones(false));
  }, []);

  useEffect(() => {
    if (!busquedaSeleccionada) {
      setViajeIdsFiltrados(null);
      return;
    }
    if (busquedaSeleccionada.tipo === "cliente") {
      setViajeIdsFiltrados(null);
      return;
    }
    setLoadingBusquedaFiltro(true);
    const url = busquedaSeleccionada.tipo === "chofer"
      ? `/api/viajes/por-chofer?choferId=${busquedaSeleccionada.id}`
      : `/api/viajes/por-transportista?transportistaId=${busquedaSeleccionada.id}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.ids)) setViajeIdsFiltrados(data.ids); })
      .catch(() => setViajeIdsFiltrados([]))
      .finally(() => setLoadingBusquedaFiltro(false));
  }, [busquedaSeleccionada]);

  const dateToYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  // Si la búsqueda seleccionada es un cliente, se filtra por razonSocial en el API
  const razonSocialParam = busquedaSeleccionada?.tipo === "cliente" ? busquedaSeleccionada.nombre : razonSearch;

  const loadViajes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fechaDesde) params.append("fechaDesde", fechaDesde);
      if (fechaHasta) params.append("fechaHasta", fechaHasta);
      if (minPendientes) params.append("minCuposPendientes", minPendientes);
      if (razonSocialParam) params.append("razonSocial", razonSocialParam);

      const res = await fetch(`/api/viajes/GET?${params.toString()}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setViajes(data);
        setNoHayViajes(data.length === 0);
      } else {
        setViajes([]);
      }
    } catch (error) {
      setViajes([]);
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta, minPendientes, razonSocialParam]);

  useEffect(() => {
    loadViajes();
  }, [loadViajes]);

  const filtrados = Array.isArray(viajes)
    ? viajeIdsFiltrados !== null
      ? viajes.filter((v) => viajeIdsFiltrados.includes(v.id))
      : viajes
    : [];

  return (
    <main className="min-h-screen  bg-gray-50 dark:bg-neutral-900">
      <Header />
      <div className="max-w-7xl mx-auto bg-white dark:bg-neutral-800 shadow-md rounded-xl p-6">
        <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Listado de Viajes
          </h1>
        </div>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              Estadísticas
            </a>
          </div>
          <button
            onClick={() => {
              setViajeSeleccionado(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
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
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Nuevo Viaje
          </button>
          {noHayViajes && filtrados.length === 0 && (
            <div className="mt-2 text-xs text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-900/40 px-2 py-1 rounded">
              No hay viajes para la fecha seleccionada.
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="bg-gray-50 dark:bg-neutral-700 p-4 rounded-lg mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-neutral-900 dark:text-white">
              Filtros de búsqueda
            </h3>
            <button
              onClick={() => {
                setRazonSearch("");
                setFechaDesde("");
                setFechaHasta("");
                setMinPendientes("");
                setBusquedaTexto("");
                setBusquedaSeleccionada(null);
                setViajeIdsFiltrados(null);
                setNoHayViajes(false);
              }}
              className="inline-flex items-center px-3 py-1.5 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-md transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          </div>

          {/* Buscador unificado */}
          <div className="relative mb-4">
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
              Buscar por razón social, chofer o transporte
            </label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Escribí un nombre..."
                value={busquedaTexto}
                onChange={(e) => {
                  setBusquedaTexto(e.target.value);
                  setBusquedaSeleccionada(null);
                  setViajeIdsFiltrados(null);
                  setRazonSearch("");
                  setBusquedaDropdownAbierto(true);
                }}
                onFocus={() => setBusquedaDropdownAbierto(true)}
                onBlur={() => setTimeout(() => setBusquedaDropdownAbierto(false), 150)}
                className="w-full pl-9 pr-8 py-2.5 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
              {loadingBusquedaFiltro && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {busquedaTexto && !loadingBusquedaFiltro && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setBusquedaTexto("");
                    setBusquedaSeleccionada(null);
                    setViajeIdsFiltrados(null);
                    setRazonSearch("");
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Dropdown unificado */}
            {busquedaDropdownAbierto && busquedaTexto.length >= 1 && (
              <div className="absolute z-50 w-full mt-1 bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-600 rounded-lg shadow-xl max-h-72 overflow-y-auto">
                {loadingOpciones ? (
                  <div className="px-4 py-3 text-sm text-neutral-400">Cargando...</div>
                ) : (() => {
                  const texto = busquedaTexto.toLowerCase();
                  const clientes = viajes
                    .map((v) => v.razonSocial)
                    .filter((rs, i, arr) => rs && arr.indexOf(rs) === i && rs.toLowerCase().includes(texto))
                    .slice(0, 5)
                    .map((rs) => ({ id: 0, nombre: rs, tipo: "cliente" as TipoBusqueda }));

                  const proveedores = opcionesBusqueda
                    .filter((o) => o.nombre.toLowerCase().includes(texto))
                    .slice(0, 10);

                  if (clientes.length === 0 && proveedores.length === 0) {
                    return <div className="px-4 py-3 text-sm text-neutral-400">Sin resultados</div>;
                  }

                  return (
                    <>
                      {clientes.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide bg-gray-50 dark:bg-neutral-700/50">
                            Clientes
                          </div>
                          {clientes.map((c) => (
                            <button
                              key={`cliente-${c.nombre}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setBusquedaTexto(c.nombre);
                                setBusquedaSeleccionada(c);
                                setRazonSearch(c.nombre);
                                setBusquedaDropdownAbierto(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-neutral-700 transition-colors text-neutral-900 dark:text-white flex items-center gap-2"
                            >
                              <svg className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                              </svg>
                              {c.nombre}
                            </button>
                          ))}
                        </>
                      )}
                      {proveedores.length > 0 && (
                        <>
                          <div className="px-3 py-1.5 text-xs font-semibold text-neutral-400 uppercase tracking-wide bg-gray-50 dark:bg-neutral-700/50 border-t border-gray-100 dark:border-neutral-700">
                            Proveedores
                          </div>
                          {proveedores.map((p) => (
                            <button
                              key={`${p.tipo}-${p.id}`}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                setBusquedaTexto(p.nombre);
                                setBusquedaSeleccionada(p);
                                setBusquedaDropdownAbierto(false);
                              }}
                              className="w-full text-left px-4 py-2.5 text-sm hover:bg-orange-50 dark:hover:bg-neutral-700 transition-colors text-neutral-900 dark:text-white flex items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                {p.nombre}
                              </div>
                              <span className="text-xs px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 flex-shrink-0">
                                {p.tipo === "chofer" ? "Chofer" : "Transporte"}
                              </span>
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Fecha desde
              </label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Fecha hasta
              </label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Mín. Cupos Pendientes
              </label>
              <input
                type="number"
                placeholder="0"
                min="0"
                value={minPendientes}
                onChange={(e) => setMinPendientes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
          </div>

          {/* Indicador de filtros activos */}
          {(busquedaSeleccionada || fechaDesde || fechaHasta || minPendientes) && (
            <div className="mt-3 flex items-center flex-wrap gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586l-4-2v-2.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filtros:</span>
              {busquedaSeleccionada && (
                <span className={`px-2 py-1 rounded text-xs ${busquedaSeleccionada.tipo === "cliente" ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300" : "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300"}`}>
                  {busquedaSeleccionada.tipo === "cliente" ? "Cliente" : busquedaSeleccionada.tipo === "chofer" ? "Chofer" : "Transporte"}: {busquedaSeleccionada.nombre}
                </span>
              )}
              {fechaDesde && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Desde: {fechaDesde}</span>}
              {fechaHasta && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Hasta: {fechaHasta}</span>}
              {minPendientes && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Min. Pendientes: {minPendientes}</span>}
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="mb-4 flex items-center gap-3">
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            <span className="font-medium">{filtrados.length}</span> viaje
            {filtrados.length !== 1 ? "s" : ""} encontrado
            {filtrados.length !== 1 ? "s" : ""}
          </div>
          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
              <div className="w-4 h-4 border-2 border-blue-600 dark:border-blue-400 border-t-transparent rounded-full animate-spin"></div>
              <span>Buscando viajes...</span>
            </div>
          )}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Cargando viajes...
            </span>
          </div>
        )}

        {/* Mobile: Cards */}
        {!loading && (
          <div className="md:hidden space-y-3">
            {filtrados.map((v, index) => (
              <div
                key={v.id ? `id-${v.id}` : `numero-${v.numero}-${index}`}
                className="bg-white dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg p-4 shadow-sm"
              >
                {/* Header: Fecha y Número */}
                <div className="flex items-start justify-between mb-3 pb-3 border-b border-gray-200 dark:border-neutral-700">
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                      {v.fecha
                        ? new Date(v.fecha).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : ""}
                    </div>
                    <div className="text-lg font-bold text-neutral-900 dark:text-white">
                      #{v.numero || v.id}
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      (v.cuposPendientes || 0) > 0
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    }`}
                  >
                    {v.cuposPendientes || 0} pendientes
                  </div>
                </div>

                {/* Info Principal */}
                <div className="space-y-2 mb-3">
                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                      Cliente
                    </div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {v.razonSocial}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                        Origen
                      </div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        {v.origen}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                        Destino
                      </div>
                      <div className="text-sm font-medium text-neutral-900 dark:text-white">
                        {v.destino}
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-0.5">
                      Artículo
                    </div>
                    <div className="text-sm text-neutral-900 dark:text-white">
                      {v.articulo}
                    </div>
                  </div>
                </div>

                {/* Cupos Info */}
                <div className="mb-3">
                  <div className="flex items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
                    <span className="font-mono">
                      {`${v.cupos ?? 0}/${v.cuposReservados ?? 0}/${v.postulados ?? 0}`}
                    </span>
                    <span className="text-neutral-400 dark:text-neutral-500">
                      (Cupos/Reservados/Postulados)
                    </span>
                  </div>
                  {v.vendedorNombre && (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Vendedor: {v.vendedorNombre}
                    </div>
                  )}
                </div>

                {/* Botones de Acción */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-200 dark:border-neutral-700">
                  <button
                    type="button"
                    onClick={() => {
                      setViajeSeleccionado(v);
                      setIsModalOpen(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViajeParaChofer(v);
                      setIsChoferModalOpen(true);
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Choferes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Desktop: Table */}
        {!loading && (
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full text-sm text-left text-neutral-800 dark:text-neutral-200">
              <thead className="bg-gray-100 dark:bg-neutral-700 text-xs uppercase tracking-wider">
                <tr>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">N°</th>
                  <th className="p-2">Razón Social</th>
                  <th className="p-2">Origen</th>
                  <th className="p-2">Destino</th>
                  <th className="p-2">Artículo</th>
                  <th className="p-2">Pendientes</th>
                  <th className="p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((v, index) => (
                  <tr
                    key={v.id ? `id-${v.id}` : `numero-${v.numero}-${index}`}
                    className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                  >
                    <td className="p-2">
                      {v.fecha
                        ? new Date(v.fecha).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : ""}
                    </td>
                    <td className="p-2">{v.numero || v.id}</td>
                    <td className="p-2">{v.razonSocial}</td>
                    <td className="p-2">{v.origen}</td>
                    <td className="p-2">{v.destino}</td>
                    <td className="p-2">{v.articulo}</td>
                    <td className="p-2">{v.cuposPendientes}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setViajeSeleccionado(v);
                            setIsModalOpen(true);
                          }}
                          className="inline-flex items-center p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                          title="Editar viaje"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setViajeParaChofer(v);
                            setIsChoferModalOpen(true);
                          }}
                          className="inline-flex items-center p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                          title={`Cupos: ${v.cupos ?? 0} | Reservados: ${
                            v.cuposReservados ?? 0
                          } | Postulados: ${v.postulados ?? 0} | Pendientes: ${
                            v.cuposPendientes ?? 0
                          }`}
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </button>
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-neutral-500 dark:text-neutral-400">
                            {`${v.cupos ?? 0}/${v.cuposReservados ?? 0}/${v.postulados ?? 0}`}
                          </span>
                          {v.vendedorNombre && (
                            <span className="text-xs text-neutral-400 dark:text-neutral-500">
                              {v.vendedorNombre}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ViajeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setViajeSeleccionado(null);
        }}
        viaje={viajeSeleccionado}
      />

      <ChoferModal
        isOpen={isChoferModalOpen}
        onClose={() => {
          setIsChoferModalOpen(false);
          setViajeParaChofer(null);
        }}
        viaje={viajeParaChofer}
        onPostulado={loadViajes}
      />

      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={() =>
          setNotification((prev) => ({ ...prev, isVisible: false }))
        }
      />
    </main>
  );
}
