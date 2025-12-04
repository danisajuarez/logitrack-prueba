"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";

/**
 * Componente que monitorea el estado de la sesión
 * Muestra un modal cuando la sesión expira y redirige automáticamente
 */
export default function SessionMonitor() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    // Trackear si el usuario estuvo autenticado
    if (status === "authenticated") {
      wasAuthenticated.current = true;
    }

    // Si el estado es "unauthenticated" y no estamos en la página de login
    if (status === "unauthenticated" && typeof window !== "undefined") {
      const currentPath = window.location.pathname;

      // Solo mostrar modal si estaba autenticado antes (sesión expiró)
      // No mostrar si nunca estuvo autenticado (recién entrando al sitio)
      if (!currentPath.startsWith("/login") && wasAuthenticated.current) {
        setShowExpiredModal(true);

        // Bloquear scroll de la página
        document.body.style.overflow = "hidden";

        // Countdown de 5 segundos antes de redirigir
        const countdownInterval = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval);
              // Usar window.location.href para forzar recarga completa
              window.location.href = "/login";
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => {
          clearInterval(countdownInterval);
          document.body.style.overflow = "";
        };
      }
    }
  }, [status, router]);

  const handleRedirectNow = () => {
    // Limpiar el countdown y redirigir inmediatamente
    document.body.style.overflow = "";
    window.location.href = "/login";
  };

  if (!showExpiredModal) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-md"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            <svg
              className="h-10 w-10 text-yellow-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sesión Expirada
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Tu sesión ha expirado por inactividad
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Por tu seguridad, cerramos las sesiones inactivas después de 1 hora.
            Serás redirigido al inicio de sesión en <strong>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRedirectNow}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Iniciar Sesión Ahora
          </button>
        </div>
      </div>
    </div>
  );
}
