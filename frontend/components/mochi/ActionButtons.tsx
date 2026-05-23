"use client";

import { useEffect, useState } from "react";
import { Bath, Gamepad2, Moon, Utensils } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { ActionType, ACTION_EFFECTS } from "@/lib/game/actions";

const COOLDOWN_MS = 3 * 60 * 1000;

const ACTIONS: {
  type: ActionType;
  label: string;
  icon: React.ReactNode;
}[] = [
  { type: "feed", label: "Feed", icon: <Utensils className="h-5 w-5" /> },
  { type: "play", label: "Play", icon: <Gamepad2 className="h-5 w-5" /> },
  { type: "sleep", label: "Sleep", icon: <Moon className="h-5 w-5" /> },
  { type: "clean", label: "Clean", icon: <Bath className="h-5 w-5" /> },
];

function formatRemaining(ms: number): string {
  const secs = Math.ceil(ms / 1000);
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ActionButtons() {
  const { performAction, isLoading, cooldowns } = usePetStore();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-2">
      {ACTIONS.map(({ type, label, icon }) => {
        const lastUsed = cooldowns[type] ?? 0;
        const remaining = COOLDOWN_MS - (now - lastUsed);
        const onCooldown = remaining > 0;

        return (
          <button
            key={type}
            onClick={() => performAction(type)}
            disabled={isLoading || onCooldown}
            className="group rounded-2xl border border-white/10 bg-white/[0.055] p-3 text-left transition hover:-translate-y-0.5 hover:border-teal-300/35 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="mb-2 grid h-8 w-8 place-items-center rounded-full bg-white/[0.07] text-teal-200 transition group-hover:bg-teal-300/16">
              {icon}
            </span>
            <span className="block text-xs font-black">{label}</span>
            {onCooldown ? (
              <span className="mt-0.5 block font-mono text-[11px] font-bold text-white/44">
                {formatRemaining(remaining)}
              </span>
            ) : (
              <span className="mt-0.5 block text-[11px] font-bold text-white/44">
                +{ACTION_EFFECTS[type].exp} EXP
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
