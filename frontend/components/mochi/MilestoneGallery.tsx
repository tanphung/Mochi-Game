"use client";

import { Lock, Sparkles, Trophy } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { MILESTONES } from "@/lib/data/milestones";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function MilestoneGallery() {
  const { milestones } = usePetStore();

  const achievedCount = milestones.filter((m) => m.achieved).length;
  const total = MILESTONES.length;
  const pct = Math.round((achievedCount / total) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-black">
          <Trophy className="h-5 w-5 text-amber-200" />
          Milestones
        </h2>
        <span className="text-sm font-black text-white/48">
          {achievedCount}/{total} achieved
        </span>
      </div>

      <div className="space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="mochi-stat-fill h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-right text-xs font-bold text-white/42">{pct}% complete</p>
      </div>

      <div className="space-y-2">
        {MILESTONES.map((def) => {
          const status = milestones.find((m) => m.id === def.id);
          const achieved = status?.achieved ?? false;

          return (
            <div
              key={def.id}
              className={`mochi-panel flex items-center gap-3 px-4 py-3 transition ${
                achieved ? "" : "opacity-45 grayscale"
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-teal-200">
                {achieved ? <Sparkles className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-black">{def.name}</div>
                <div className="truncate text-xs font-semibold text-white/42">{def.description}</div>
              </div>
              {achieved && status?.achievedAt && (
                <span className="shrink-0 font-mono text-[10px] font-bold text-white/42">
                  {formatDate(status.achievedAt)}
                </span>
              )}
              {achieved && !status?.achievedAt && (
                <span className="shrink-0 text-[10px] font-black text-teal-200">DONE</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
