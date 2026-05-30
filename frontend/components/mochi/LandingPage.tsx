"use client";

import { Cat, CircleDot, Sparkles, WalletCards } from "lucide-react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { RoadmapSection } from "./RoadmapSection";

const showcaseCards = [
  {
    name: "Luna",
    mood: "Quiet",
    vibe: "Prism",
    color: "#2448ff",
    accent: "#35ecff",
    bg: "linear-gradient(145deg, #2448ff 0%, #8b5cff 46%, #151943 100%)",
  },
  {
    name: "Mika",
    mood: "Balanced",
    vibe: "Aqua",
    color: "#12cce7",
    accent: "#ffe96a",
    bg: "linear-gradient(145deg, #35ecff 0%, #2448ff 58%, #0f1a42 100%)",
  },
  {
    name: "Kumo",
    mood: "Playful",
    vibe: "Glow",
    color: "#ff4fd8",
    accent: "#ffe96a",
    bg: "linear-gradient(145deg, #ff4fd8 0%, #8b5cff 50%, #1c133f 100%)",
  },
  {
    name: "Nori",
    mood: "Excited",
    vibe: "Aurora",
    color: "#8b5cff",
    accent: "#35ecff",
    bg: "linear-gradient(145deg, #8b5cff 0%, #35ecff 46%, #12204a 100%)",
  },
  {
    name: "Sora",
    mood: "Calm",
    vibe: "Sky",
    color: "#2448ff",
    accent: "#ff4fd8",
    bg: "linear-gradient(145deg, #172fff 0%, #35ecff 54%, #102044 100%)",
  },
  {
    name: "Yuki",
    mood: "Happy",
    vibe: "Gold",
    color: "#ffe96a",
    accent: "#ff4fd8",
    bg: "linear-gradient(145deg, #ffe96a 0%, #ff4fd8 48%, #27194a 100%)",
  },
];

function ShowcaseCard({
  card,
}: {
  card: (typeof showcaseCards)[number];
}) {
  return (
    <div className="nft-placeholder-card shrink-0" style={{ background: card.bg }}>
      <div className="mb-2">
        <div className="text-lg font-black leading-none">{card.name}</div>
        <div className="text-[9px] font-bold uppercase text-white/55">
          Mochi Companion
        </div>
      </div>

      <div
        className="nft-placeholder-art"
        style={{
          background:
            "radial-gradient(circle at 50% 35%, rgb(255 255 255 / 0.18), transparent 34%), linear-gradient(145deg, rgb(255 255 255 / 0.12), rgb(0 0 0 / 0.28))",
        }}
      >
        <div
          className="grid h-20 w-20 place-items-center rounded-full"
          style={{
            background: card.color,
            boxShadow: `0 0 34px ${card.accent}66`,
          }}
        >
          <Cat className="h-10 w-10" style={{ color: card.accent }} />
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-lg bg-black/30 p-2">
          <div className="text-white/50">MOOD</div>
          <div className="font-bold">{card.mood}</div>
        </div>
        <div className="rounded-lg bg-black/30 p-2">
          <div className="text-white/50">VIBE</div>
          <div className="font-bold">{card.vibe}</div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { connectWallet, isLoading, isWalletInstalled } = useWallet();
  const cards = [...showcaseCards, ...showcaseCards];

  return (
    <div className="mochi-shell">
      <header className="mochi-nav relative z-10">
        <div className="mochi-container flex min-h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="mochi-logo-mark">
              <Cat className="h-6 w-6" />
            </div>
            <div>
              <div className="text-lg font-black leading-none">Mochi</div>
              <div className="text-[10px] font-bold text-white/45">
                on GenLayer Testnet
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="mochi-badge hidden sm:inline-flex">
              <CircleDot className="h-3.5 w-3.5 fill-teal-400 text-teal-400" />
              Testnet
            </div>
            <button
              onClick={connectWallet}
              disabled={isLoading}
              className="mochi-primary-button px-5 py-2.5 text-sm"
            >
              <WalletCards className="h-4 w-4" />
              {isLoading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mochi-container grid min-h-[620px] items-center gap-12 py-16 lg:grid-cols-[1fr_390px] lg:py-20">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-200/25 bg-cyan-300/12 px-4 py-2 text-xs font-black uppercase text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Companion ready
            </div>

            <h1 className="text-5xl font-black leading-[0.95] tracking-normal text-white md:text-7xl">
              Mochi
            </h1>
            <p className="mt-6 max-w-lg text-lg font-medium leading-8 text-white/76">
              Customize, raise, mint, and share your on-chain companion.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={connectWallet}
                disabled={isLoading}
                className="mochi-primary-button px-6 py-3 text-sm"
              >
                <WalletCards className="h-4 w-4" />
                {isLoading ? "Connecting..." : "Connect Wallet"}
              </button>
              {!isWalletInstalled && (
                <a
                  href="https://ethereum.org/en/wallets/find-wallet/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-bold text-amber-200 underline-offset-4 hover:underline"
                >
                  Install a Wallet
                </a>
              )}
            </div>
          </div>

          <div className="mochi-card relative mx-auto w-full max-w-[360px] overflow-hidden p-8">
            <div className="absolute -left-20 top-10 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
            <div className="absolute -bottom-16 right-2 h-44 w-44 rounded-full bg-fuchsia-400/18 blur-3xl" />
            <div className="relative grid gap-8 sm:grid-cols-[96px_1fr] lg:grid-cols-1">
              <div className="grid place-items-center">
                <div className="grid h-28 w-28 place-items-center rounded-full bg-[#172052] shadow-[0_0_56px_rgba(53,236,255,0.22)]">
                  <Cat className="h-14 w-14 text-cyan-100" />
                </div>
              </div>
              <div>
                <div className="text-xs font-black uppercase tracking-[0.28em] text-cyan-100">
                  Companion Ready
                </div>
                <h2 className="mt-4 text-4xl font-black leading-tight text-white">
                  Your first Mochi is waiting.
                </h2>
                <p className="mt-5 text-sm font-semibold leading-7 text-white/78">
                  Start with a default pet, then rename, recolor, customize the
                  room, equip items, generate a card, and mint your favorite
                  moment.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="mochi-container pb-10">
          <div className="showcase-frame">
            <div className="showcase-track">
              {cards.map((card, index) => (
                <ShowcaseCard key={`${card.name}-${index}`} card={card} />
              ))}
            </div>
          </div>
        </section>

        <RoadmapSection />
      </main>
    </div>
  );
}
