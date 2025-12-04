"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import SessionMonitor from "./SessionMonitor";

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <NextAuthSessionProvider>
      <SessionMonitor />
      {children}
    </NextAuthSessionProvider>
  );
}
