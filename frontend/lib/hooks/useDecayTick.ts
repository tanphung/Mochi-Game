"use client";

import { useEffect } from "react";
import { usePetStore } from "@/lib/store/petStore";

export function useDecayTick() {
  const { applyDecay, appPhase } = usePetStore();

  useEffect(() => {
    if (appPhase !== "dashboard") return;
    const runDecay = () => {
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      applyDecay();
    };
    const id = setInterval(runDecay, 60_000);
    return () => clearInterval(id);
  }, [applyDecay, appPhase]);
}
