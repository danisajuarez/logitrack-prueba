"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

interface UserNavProps {
  username: string;
  displayName: string;
}

export default function UserNav({ username, displayName }: UserNavProps) {
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      // Usar signOut de NextAuth que maneja correctamente la eliminación de sesión
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="text-right">
        <div className="text-sm font-medium text-neutral-900 dark:text-white">
          {displayName}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          @{username}
        </div>
      </div>
      <button
        onClick={handleLogout}
        disabled={loading}
        className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Cerrar sesión"
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
        {loading ? "..." : "Salir"}
      </button>
    </div>
  );
}
