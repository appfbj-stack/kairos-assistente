"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken, getUser } from "@/services/api";

export default function Home() {
  const router = useRouter();
  useEffect(() => {
    const token = getToken();
    const user = getUser();
    if (!token || !user) router.replace("/login");
    else if (user.role === "FUNCIONARIO") router.replace("/ponto");
    else router.replace("/dashboard");
  }, [router]);
  return <div className="flex h-screen items-center justify-center text-slate-400">Carregando…</div>;
}
