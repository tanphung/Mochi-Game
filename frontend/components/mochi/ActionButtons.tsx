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
  iconWrap: string;
}[] = [
  {
    type: "feed",
    label: "Feed",
    icon: <Utensils className="h-5 w-5" />,
    iconWrap: "bg-amber-300/15 text-amber-300 ring-1 ring-inset ring-amber-300/20 group-hover:bg-amber-300/25",
  },
  {
    type: "play",
    label: "Play",
    icon: <Gamepad2 className="h-5 w-5" />,
    iconWrap: "bg-fuchsia-300/15 text-fuchsia-300 ring-1 ring-inset ring-fuchsia-300/20 group-hover:bg-fuchsia-300/25",
  },
  {
    type: "sleep",
    label: "Sleep",
    icon: <Moon className="h-5 w-5" />,
    iconWrap: "bg-indigo-300/15 text-indigo-300 ring-1 ring-inset ring-indigo-300/20 group-hover:bg-indigo-300/25",
  },
  {
    type: "clean",
    label: "Clean",
    icon: <Bath className="h-5 w-5" />,
    iconWrap: "bg-sky-300/15 text-sky-300 ring-1 ring-inset ring-sky-300/20 group-hover:bg-sky-300/25",
  },
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
      {ACTIONS.map(({ type, label, icon, iconWrap }) => {
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
            <span className={`mb-2 grid h-9 w-9 place-items-center rounded-xl transition ${iconWrap}`}>
              {icon}
            </span>
            <span className="block text-sm font-black">{label}</span>
            {onCooldown ? (
              <span className="mt-1.5 inline-block rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] font-bold text-white/50">
                {formatRemaining(remaining)}
              </span>
            ) : (
              <span className="mt-1.5 inline-block rounded-full bg-teal-300/12 px-2 py-0.5 text-[10px] font-black text-teal-200/90">
                +{ACTION_EFFECTS[type].exp} EXP
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
