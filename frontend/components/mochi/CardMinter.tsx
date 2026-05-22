"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { Download, IdCard, X } from "lucide-react";
import { ItemTransform, usePetStore } from "@/lib/store/petStore";
import { CardViewer, CardData } from "./CardViewer";
import { getThemeForLevel } from "@/lib/data/cardThemes";
import { DEFAULT_MOCHI_AVATAR_ID, getMochiAvatar } from "@/lib/data/mochiAvatars";
import { MintedCard } from "@/lib/contracts/MochiPet";
import { error as toastError, success } from "@/lib/utils/toast";

interface SnapshotData {
  name?: string;
  nickname?: string;
  petAvatarId?: string;
  level?: number;
  petColor?: string;
  stats?: { hunger: number; energy: number; cleanliness: number; happiness: number };
  equippedItems?: CardData["equippedItems"];
  itemPositions?: Record<string, ItemTransform>;
  roomId?: string;
  mintedAt?: string;
  totalActions?: number;
  totalChats?: number;
}

function parseSnapshot(raw: string): SnapshotData {
  try {
    return JSON.parse(raw) as SnapshotData;
  } catch {
    return {};
  }
}

function mintedCardToCardData(card: MintedCard): CardData {
  const snap = parseSnapshot(card.snapshot);
  return {
    petColor: snap.petColor ?? "#F4A460",
    petAvatarId: snap.petAvatarId ?? DEFAULT_MOCHI_AVATAR_ID,
    level: snap.level ?? card.level_at_mint,
    nickname: snap.nickname ?? "",
    hunger: snap.stats?.hunger ?? 0,
    energy: snap.stats?.energy ?? 0,
    cleanliness: snap.stats?.cleanliness ?? 0,
    happiness: snap.stats?.happiness ?? 0,
    mintedAt: snap.mintedAt ?? card.minted_at,
    cardId: card.card_id,
    totalActions: snap.totalActions,
    totalChats: snap.totalChats,
    equippedItems: snap.equippedItems,
    itemPositions: snap.itemPositions,
    roomId: snap.roomId,
  };
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to create card image"));
      }
    }, "image/png");
  });
}

function CollectionCard({ card, onClick }: { card: MintedCard; onClick: () => void }) {
  const snap = parseSnapshot(card.snapshot);
  const theme = getThemeForLevel(snap.level ?? card.level_at_mint);
  const avatar = getMochiAvatar(snap.petAvatarId ?? DEFAULT_MOCHI_AVATAR_ID);
  const date = snap.mintedAt
    ? new Date(snap.mintedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : card.minted_at || "On-chain";

  return (
    <button
      onClick={onClick}
      className="mochi-panel p-3 text-left transition hover:-translate-y-0.5 hover:border-teal-300/35 active:scale-95"
    >
      <div
        className="grid h-20 w-full place-items-center overflow-hidden rounded-2xl"
        style={{
          background: `radial-gradient(circle at 50% 35%, rgb(255 255 255 / 0.18), transparent 34%), ${snap.petColor ?? "#F4A460"}`,
          boxShadow: `0 0 18px ${snap.petColor ?? "#F4A460"}66`,
        }}
      >
        <img
          src={avatar.src}
          alt={avatar.name}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </div>
      <div className="mt-3 space-y-1">
        <div className="text-xs font-black" style={{ color: theme.accentColor }}>
          Level {snap.level ?? card.level_at_mint}
        </div>
        <div className="truncate font-mono text-[10px] font-bold text-white/42">{card.card_id}</div>
        <div className="text-[10px] font-bold text-white/42">{date}</div>
      </div>
    </button>
  );
}

function CardModal({ card, onClose }: { card: MintedCard; onClose: () => void }) {
  const data = mintedCardToCardData(card);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <CardViewer data={data} interactive />
        <button onClick={onClose} className="mochi-ghost-button px-5 py-2 text-sm">
          <X className="h-4 w-4" />
          Close
        </button>
      </div>
    </div>
  );
}

export function CardMinter() {
  const {
    level, petColor, petNickname, hunger, energy, cleanliness, happiness,
    petAvatarId, equippedItems, itemPositions, roomId,
    actionHistory, chatHistory, mintedCards, isMinting, mintCard,
  } = usePetStore();

  const [selectedCard, setSelectedCard] = useState<MintedCard | null>(null);
  const downloadCardRef = useRef<HTMLDivElement>(null);

  const theme = getThemeForLevel(level);

  const currentCardData = useMemo<CardData>(() => ({
      petColor,
      petAvatarId,
      level,
      nickname: petNickname,
      hunger,
      energy,
      cleanliness,
      happiness,
      equippedItems,
      itemPositions,
      roomId,
      totalActions: actionHistory.filter((e) => e.type === "action").length,
      totalChats: chatHistory.filter((m) => m.role === "mochi").length,
  }), [petColor, petAvatarId, level, petNickname, hunger, energy, cleanliness, happiness, equippedItems, itemPositions, roomId, actionHistory, chatHistory]);

  const handleMint = useCallback(async () => {
    await mintCard();
  }, [mintCard]);

  const handleDownload = useCallback(async () => {
    try {
      if (!downloadCardRef.current) {
        throw new Error("Card preview is not ready yet");
      }
      const canvas = await html2canvas(downloadCardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const blob = await canvasToBlob(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mochi-card-level-${currentCardData.level}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      success("Card image downloaded!");
    } catch (err) {
      console.error("Download failed:", err);
      toastError("Failed to download card image");
    }
  }, []);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="flex items-center justify-center gap-2 text-2xl font-black">
          <IdCard className="h-6 w-6 text-teal-200" />
          Mochi Card
        </h2>
        <p className="mt-2 text-sm font-bold text-white/48">
          <span style={{ color: theme.accentColor }}>{theme.name}</span>
          {" "}theme | Level {theme.minLevel}
          {theme.minLevel !== theme.maxLevel ? `-${theme.maxLevel}` : ""}
        </p>
      </div>

      <div className="flex justify-center">
        <CardViewer data={currentCardData} interactive />
      </div>

      <div
        ref={downloadCardRef}
        aria-hidden
        className="fixed left-[-10000px] top-0"
        style={{ width: 430, height: 620, pointerEvents: "none" }}
      >
        <CardViewer data={currentCardData} interactive={false} exportMode />
      </div>

      <div className="mx-auto grid max-w-[760px] grid-cols-1 gap-3 sm:grid-cols-2">
        <button
          onClick={handleMint}
          disabled={isMinting}
          className="mochi-primary-button px-4 py-3 text-sm"
        >
          <IdCard className="h-4 w-4" />
          {isMinting ? "Minting..." : "Mint NFT"}
        </button>
        <button
          onClick={handleDownload}
          className="mochi-ghost-button px-4 py-3 text-sm"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>

      <div className="mochi-panel p-4">
        <h3 className="mb-3 text-sm font-black">
          Collection ({mintedCards.length})
        </h3>
        {mintedCards.length === 0 ? (
          <p className="py-4 text-center text-sm font-semibold text-white/45">
            No cards minted yet. Mint your first card when Mochi is ready.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {mintedCards.map((card) => (
              <CollectionCard
                key={card.card_id}
                card={card}
                onClick={() => setSelectedCard(card)}
              />
            ))}
          </div>
        )}
      </div>

      {selectedCard && (
        <CardModal card={selectedCard} onClose={() => setSelectedCard(null)} />
      )}
    </div>
  );
}
