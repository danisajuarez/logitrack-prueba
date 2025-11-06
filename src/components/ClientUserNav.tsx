"use client";

import { useEffect, useState } from "react";
import UserNav from "./UserNav";

export default function ClientUserNav() {
  const [session, setSession] = useState<{
    username: string;
    displayName: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setSession(data.user);
        }
      })
      .catch(() => {
        // No session, ignore
      });
  }, []);

  if (!session) return null;

  return <UserNav username={session.username} displayName={session.displayName} />;
}
