"use client";

import { useSession } from "next-auth/react";
import UserNav from "./UserNav";

export default function ClientUserNav() {
  const { data: session } = useSession();

  const username = (session?.user as any)?.username as string | undefined;
  const displayName = (session?.user as any)?.name as string | undefined;

  if (!session || !username || !displayName) return null;

  return <UserNav username={username} displayName={displayName} />;
}
