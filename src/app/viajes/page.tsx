"use client";

import { useEffect, useState } from "react";
import ViajeModal from "../../components/ViajeModal"; // Asegurate de tenerlo creado
import Notification from "../../components/Notification";

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
  usuario: string;
  equipo: string;
  vendedor: string | null;
  articulo: string;
}

export default function ViajesPage() {
  const [viajes, setViajes] = useState<Viaje[]>([]);
  const [razonSearch, setRazonSearch] = useState("");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });
  const [fechaHasta, setFechaHasta] = useState("");
  const [minPendientes, setMinPendientes] = useState("");
  const [viajeSeleccionado, setViajeSeleccionado] = useState<Viaje | null>(
    null
  );

  const [isModalOpen, setIsModalOpen] = useState(false); // <-- Estado del modal
  const [noHayViajes, setNoHayViajes] = useState(false); // mostrar mensaje si no hay viajes
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message?: string;
    isVisible: boolean;
  }>({ type: "success", title: "", message: "", isVisible: false });

  const dateToYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params = new URLSearchParams();

        if (fechaDesde) params.append("fechaDesde", fechaDesde);
        if (fechaHasta) params.append("fechaHasta", fechaHasta);
        if (minPendientes) params.append("minCuposPendientes", minPendientes);
        if (razonSearch) params.append("razonSocial", razonSearch);

        const res = await fetch(`/api/viajes/GET?${params.toString()}`);
        const data = await res.json();
        // Validar que data sea un array
        if (Array.isArray(data)) {
          setViajes(data);
          setNoHayViajes(data.length === 0);
        } else {
          console.error('La respuesta no es un array:', data);
          setViajes([]);
        }
      } catch (error) {
        console.error('Error al obtener viajes:', error);
        setViajes([]);
      }
    };

    fetchData();
  }, [fechaDesde, fechaHasta, minPendientes, razonSearch]);

  const filtrados = Array.isArray(viajes) ? viajes : [];

  return (
    <main className="min-h-screen p-6 bg-gray-50 dark:bg-neutral-900">
      <div className="max-w-7xl mx-auto bg-white dark:bg-neutral-800 shadow-md rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">
            Listado de Viajes
          </h1>
          <button
            onClick={() => {
              setViajeSeleccionado(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 shadow-md hover:shadow-lg"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Razón Social
              </label>
              <input
                type="text"
                placeholder="Buscar por razón social..."
                value={razonSearch}
                onChange={(e) => setRazonSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md bg-white dark:bg-neutral-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            
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
          {(razonSearch || fechaDesde || fechaHasta || minPendientes) && (
            <div className="mt-3 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707v4.586l-4-2v-2.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filtros aplicados:</span>
              {razonSearch && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Razón: "{razonSearch}"</span>}
              {fechaDesde && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Desde: {fechaDesde}</span>}
              {fechaHasta && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Hasta: {fechaHasta}</span>}
              {minPendientes && <span className="bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded text-xs">Min. Pendientes: {minPendientes}</span>}
            </div>
          )}
        </div>

        {/* Contador de resultados */}
        <div className="mb-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="font-medium">{filtrados.length}</span> viaje{filtrados.length !== 1 ? 's' : ''} encontrado{filtrados.length !== 1 ? 's' : ''}
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
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
                  key={v.id ? `id-${v.id}` : `numero-${v.numero}-${index}`} // Garantiza unicidad
                  className="border-t border-gray-200 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-800 transition"
                >
                  <td className="p-2">{v.fecha ? new Date(v.fecha).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}</td>
                  <td className="p-2">{v.numero}</td>
                  <td className="p-2">{v.razonSocial}</td>
                  <td className="p-2">{v.origen}</td>
                  <td className="p-2">{v.destino}</td>
                  <td className="p-2">{v.articulo}</td>
                  <td className="p-2">{v.cuposPendientes}</td>
                  <td className="p-2">
                    {/* Botones de acción para todos los viajes */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setViajeSeleccionado(v);
                          setIsModalOpen(true);
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Editar
                      </button>
                      <button
                        onClick={async () => {
                          const reservados = Number(v.cuposReservados || 0);
                          const cupos = Number(v.cupos || 0);
                          const pendientesCalc = cupos - reservados;
                          const pendientes = Number(v.cuposPendientes ?? pendientesCalc);

                          if (reservados > 0) {
                            setNotification({
                              type: "warning",
                              title: "No se puede eliminar el viaje",
                              message: "El viaje tiene reservas activas",
                              isVisible: true,
                            });
                            return;
                          }

                          if (pendientes !== pendientesCalc) {
                            setNotification({
                              type: "warning",
                              title: "No se puede eliminar el viaje",
                              message: "Los cupos pendientes no coinciden con el cálculo",
                              isVisible: true,
                            });
                            return;
                          }

                          if (confirm("¿Eliminar este viaje?")) {
                            const identifier = v.id || v.numero;
                            const res = await fetch(`/api/viajes/${identifier}`, {
                              method: "DELETE",
                            });
                            if (!res.ok) {
                              const msg = await res.json().catch(() => ({} as any));
                              setNotification({
                                type: "error",
                                title: "Error al eliminar el viaje",
                                message: msg?.error || 'No se pudo eliminar el viaje',
                                isVisible: true,
                              });
                              return;
                            }
                            setNotification({
                              type: "success",
                              title: "¡Viaje eliminado con éxito!",
                              message: "El viaje se ha eliminado correctamente",
                              isVisible: true,
                            });
                            setTimeout(() => {
                              window.location.reload();
                            }, 1500);
                          }
                        }}
                        className="inline-flex items-center px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                      >
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ViajeModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setViajeSeleccionado(null);
        }}
        viaje={viajeSeleccionado}
      />

      <Notification
        type={notification.type}
        title={notification.title}
        message={notification.message}
        isVisible={notification.isVisible}
        onClose={() => setNotification(prev => ({ ...prev, isVisible: false }))}
      />
    </main>
  );
}
