"use client";

import {
  Egg,
  Gamepad2,
  Palette,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export const roadmapPhases: {
  icon: LucideIcon;
  phase: string;
  name: string;
  tagline: string;
  status: string;
  statusClass: string;
  accent: string;
  items: string[];
}[] = [
  {
    icon: Egg,
    phase: "Phase 1",
    name: "Born",
    tagline: "Have a pet.",
    status: "Live",
    statusClass: "border-emerald-300/40 bg-emerald-300/10 text-emerald-200",
    accent: "#35ecff",
    items: [
      "Multi-wallet connect (OKX, MetaMask, Coinbase...)",
      "Customize look, name, and color",
      "Decorate room and equip items",
      "Mint your companion as an on-chain card",
    ],
  },
  {
    icon: Users,
    phase: "Phase 2",
    name: "Hangout",
    tagline: "Meet others.",
    status: "Next",
    statusClass: "border-cyan-200/40 bg-cyan-300/10 text-cyan-100",
    accent: "#12cce7",
    items: [
      "Themed chat rooms: cafe, park, beach",
      "Real-time owner chat with pet at your side",
      "Visit other pets and send on-chain gifts",
      "Group photo minted as a shared memory",
    ],
  },
  {
    icon: Gamepad2,
    phase: "Phase 3",
    name: "Play",
    tagline: "Daily fun.",
    status: "Soon",
    statusClass: "border-fuchsia-300/40 bg-fuchsia-400/10 text-fuchsia-100",
    accent: "#ff4fd8",
    items: [
      "Mini-games: feed, dress-up, hide and seek",
      "Daily quests that earn coins and items",
      "Seasonal events (Halloween, Tet, Summer)",
      "Pet mood reacts to how often you visit",
    ],
  },
  {
    icon: Palette,
    phase: "Phase 4",
    name: "Grow",
    tagline: "Long-term depth.",
    status: "Future",
    statusClass: "border-amber-300/40 bg-amber-300/10 text-amber-100",
    accent: "#ffe96a",
    items: [
      "Fashion contests judged by GenLayer AI consensus",
      "Marketplace for items and rare accessories",
      "Pet evolution after months of care",
      "Loyalty unlocks for long-time companions",
    ],
  },
];

function RoadmapCard({ phase }: { phase: (typeof roadmapPhases)[number] }) {
  const Icon = phase.icon;

  return (
    <div className="mochi-card relative overflow-hidden p-5">
      <div
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: phase.accent }}
      />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10">
            <Icon className="h-5 w-5" style={{ color: phase.accent }} />
          </div>
          <span
            className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${phase.statusClass}`}
          >
            {phase.status}
          </span>
        </div>

        <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-white/45">
          {phase.phase}
        </div>
        <div className="mt-1 text-2xl font-black leading-tight text-white">
          {phase.name}
        </div>
        <div className="mt-1 text-xs font-semibold italic text-white/55">
          {phase.tagline}
        </div>

        <ul className="mt-5 space-y-2.5">
          {phase.items.map((item) => (
            <li
              key={item}
              className="flex gap-2.5 text-xs font-medium leading-relaxed text-white/78"
            >
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: phase.accent }}
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function RoadmapSection({ compact = false }: { compact?: boolean }) {
  return (
    <section
      id="roadmap"
      className={compact ? "" : "mochi-container py-16 lg:py-20"}
    >
      <div className={compact ? "mb-6 text-center" : "mb-12 text-center"}>
        {!compact && (
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase text-cyan-100">
            <Sparkles className="h-4 w-4" />
            What's next
          </div>
        )}
        <h2
          className={
            compact
              ? "text-2xl font-black leading-tight text-white md:text-3xl"
              : "text-4xl font-black leading-tight text-white md:text-5xl"
          }
        >
          Roadmap
        </h2>
        <p
          className={
            compact
              ? "mx-auto mt-2 max-w-lg text-sm font-medium leading-6 text-white/70"
              : "mx-auto mt-4 max-w-xl text-base font-medium leading-7 text-white/72"
          }
        >
          From your first Mochi to a living companion that grows with you.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {roadmapPhases.map((phase) => (
          <RoadmapCard key={phase.name} phase={phase} />
        ))}
      </div>
    </section>
  );
}
