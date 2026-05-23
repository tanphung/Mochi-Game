"use client";

import { useEffect } from "react";
import { usePetStore } from "@/lib/store/petStore";

export function useDecayTick() {
  const { applyDecay, appPhase } = usePetStore();

  useEffect(() => {
    if (appPhase !== "dashboard") return;
    const id = setInterval(() => applyDecay(), 60_000);
    return () => clearInterval(id);
  }, [applyDecay, appPhase]);
}
