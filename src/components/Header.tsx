"use client";

import { signOut, useSession } from "next-auth/react";
import { useState } from "react";

export default function Header() {
  const { data: session } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  };

  if (!session) return null;

  const vendedorNombre = (session.user as any)?.vendedorNombre as string | undefined;
  const userName = vendedorNombre || session.user?.name || "Usuario";
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <header className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700 mb-6 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-base shadow-md">
                {userInitial}
              </div>
              <div className="hidden sm:block">
                <div className="text-sm font-semibold text-neutral-900 dark:text-white">
                  {userName}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  Conectado
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-red-600 dark:hover:text-red-400 bg-neutral-100 dark:bg-neutral-700/50 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 border border-neutral-200 dark:border-neutral-600 hover:border-red-300 dark:hover:border-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden sm:inline">
              {isLoggingOut ? "Cerrando..." : "Cerrar Sesión"}
            </span>
            <span className="sm:hidden">
              {isLoggingOut ? "..." : "Salir"}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
