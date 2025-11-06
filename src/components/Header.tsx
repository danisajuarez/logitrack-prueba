"use client";

import { signOut, useSession } from "next-auth/react";

export default function Header() {
  const { data: session } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  if (!session) return null;

  return (
    <header className="bg-neutral-800/50 border-b border-neutral-700 mb-8">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
            {session.user?.name?.charAt(0).toUpperCase() || "U"}
          </div>
          <div>
            <div className="text-sm font-medium text-white">
              {session.user?.name || "Usuario"}
            </div>
            <div className="text-xs text-neutral-400">Conectado</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white bg-neutral-700/50 hover:bg-neutral-700 rounded-lg transition-colors border border-neutral-600 hover:border-neutral-500"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  );
}
