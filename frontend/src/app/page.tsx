"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Layers } from "lucide-react";

export default function RootRoute() {
  const router = useRouter();

  useEffect(() => {
    try {
      const token = sessionStorage.getItem("authToken");
      if (token) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    } catch {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--canvas)] flex flex-col items-center justify-center p-4">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--accent)] text-white flex items-center justify-center shadow-xs animate-pulse">
          <Layers className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text)]">ReliefOps</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Checking session...
          </p>
        </div>
      </div>
    </div>
  );
}
