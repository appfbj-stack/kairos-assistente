"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser, clearSession, type SessionUser } from "@/services/api";

export function useAuth(allowedRoles?: SessionUser["role"][]) {
  const router = useRouter();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const u = getUser();
    if (!token || !u) {
      router.replace("/login");
      return;
    }
    if (allowedRoles && !allowedRoles.includes(u.role)) {
      // Funcionário sem acesso ao painel admin → vai para o app de ponto.
      router.replace(u.role === "FUNCIONARIO" ? "/ponto" : "/dashboard");
      return;
    }
    setUser(u);
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  function logout() {
    clearSession();
    router.replace("/login");
  }

  return { user, ready, logout };
}
