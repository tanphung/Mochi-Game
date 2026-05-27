"use client";

import { Trophy } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { MAX_LEVEL } from "@/lib/game/exp";

export function LevelProgress() {
  const { level, exp, expToNextLevel, expProgress } = usePetStore();
  const isMax = level >= MAX_LEVEL;

  return (
    <div className="mochi-panel px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-black">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-amber-300/12 text-amber-200">
            <Trophy className="h-3.5 w-3.5" />
          </span>
          {isMax ? "Max Level 20" : `Level ${level}`}
        </span>
        {!isMax && (
          <span className="font-mono text-[11px] font-bold text-white/50">
            {exp} / {exp + expToNextLevel} EXP
          </span>
        )}
      </div>
      {!isMax && (
        <>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="mochi-stat-fill h-full rounded-full transition-all duration-700"
              style={{ width: `${expProgress}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-white/45">
            {expToNextLevel} EXP to Level {level + 1}
          </p>
        </>
      )}
    </div>
  );
}
