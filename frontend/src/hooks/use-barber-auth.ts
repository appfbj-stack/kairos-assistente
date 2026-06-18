"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBarberToken, getBarberUser, clearBarberSession } from "@/services/barberApi";

export function useBarberAuth() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getBarberToken();
    const u = getBarberUser();
    if (!token || !u) {
      router.replace("/barber/login");
      return;
    }
    setUser(u);
    setReady(true);
  }, [router]);

  function logout() {
    clearBarberSession();
    router.replace("/barber/login");
  }

  return { user, ready, logout };
}
