"use client";

import { useCallback, useMemo, useState } from "react";
import { Download, IdCard, X } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { CardViewer, CardData } from "./CardViewer";
import { CardTheme, getThemeForLevel } from "@/lib/data/cardThemes";
import { DEFAULT_MOCHI_AVATAR_ID, getMochiAvatar } from "@/lib/data/mochiAvatars";
import { getItemById } from "@/lib/data/itemManifest";
import { getRoomById } from "@/lib/data/roomManifest";
import {
  MOCHI_SCENE_AVATAR_CENTER_Y_RATIO,
  MOCHI_SCENE_AVATAR_WIDTH_RATIO,
  MOCHI_SCENE_REFERENCE_AVATAR_WIDTH,
} from "@/lib/data/sceneLayout";
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
  itemPositions?: Record<string, { x: number; y: number }>;
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  options: { font: string; color: string; align?: CanvasTextAlign; alpha?: number },
) {
  ctx.save();
  ctx.font = options.font;
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align ?? "center";
  ctx.textBaseline = "middle";
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const imageRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;

  if (imageRatio > targetRatio) {
    sw = img.naturalHeight * targetRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / targetRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
}

function drawMiniBar(
  ctx: CanvasRenderingContext2D,
  label: string,
  value: number,
  x: number,
  y: number,
  width: number,
  accent: string,
  textColor: string,
) {
  const clamped = Math.max(0, Math.min(100, value));
  drawText(ctx, label, x, y, { font: "600 11px Arial", color: textColor, align: "left", alpha: 0.82 });
  drawText(ctx, String(value), x + width, y, { font: "700 11px Arial", color: textColor, align: "right", alpha: 0.82 });

  roundRect(ctx, x, y + 10, width, 5, 3);
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fill();
  roundRect(ctx, x, y + 10, (width * clamped) / 100, 5, 3);
  ctx.fillStyle = accent;
  ctx.fill();
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

async function renderCardImage(data: CardData, theme: CardTheme): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const exportScale = 2;
  const cardWidth = 288;
  const cardHeight = 384;
  canvas.width = cardWidth * exportScale;
  canvas.height = cardHeight * exportScale;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  ctx.scale(exportScale, exportScale);

  const displayName = data.nickname ? `Mochi / ${data.nickname}` : "Mochi";
  const avatar = getMochiAvatar(data.petAvatarId ?? DEFAULT_MOCHI_AVATAR_ID);
  const room = getRoomById(data.roomId ?? "starter_room");
  const [avatarImg, roomImg] = await Promise.all([
    loadImage(avatar.src),
    room.image ? loadImage(room.image).catch(() => null) : Promise.resolve(null),
  ]);

  roundRect(ctx, 0, 0, cardWidth, cardHeight, 16);
  ctx.fillStyle = theme.bgColor;
  ctx.fill();
  ctx.save();
  roundRect(ctx, 0, 0, cardWidth, cardHeight, 16);
  ctx.strokeStyle = theme.borderColor;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  const glow = ctx.createRadialGradient(144, 120, 20, 144, 120, 220);
  glow.addColorStop(0, `${theme.accentColor}22`);
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, cardWidth, cardHeight);

  drawText(ctx, `${theme.name.toUpperCase()} CARD`, 144, 26, {
    font: "900 12px Arial",
    color: theme.accentColor,
    alpha: 0.78,
  });
  drawText(ctx, displayName, 144, 50, { font: "900 16px Arial", color: theme.textColor });
  drawText(ctx, `Level ${data.level}`, 144, 72, { font: "800 14px Arial", color: theme.textColor, alpha: 0.76 });

  const sceneX = 28;
  const sceneY = 112;
  const sceneWidth = 232;
  const sceneHeight = 174;
  ctx.save();
  roundRect(ctx, sceneX, sceneY, sceneWidth, sceneHeight, 12);
  ctx.clip();
  if (roomImg) {
    drawImageCover(ctx, roomImg, sceneX, sceneY, sceneWidth, sceneHeight);
  } else {
    const bg = ctx.createLinearGradient(sceneX, sceneY, sceneX + sceneWidth, sceneY + sceneHeight);
    bg.addColorStop(0, theme.bgColor);
    bg.addColorStop(1, data.petColor);
    ctx.fillStyle = bg;
    ctx.fillRect(sceneX, sceneY, sceneWidth, sceneHeight);
  }
  const sceneGlow = ctx.createRadialGradient(sceneX + sceneWidth / 2, sceneY + sceneHeight * 0.38, 20, sceneX + sceneWidth / 2, sceneY + sceneHeight * 0.38, 140);
  sceneGlow.addColorStop(0, "rgba(255,255,255,0.14)");
  sceneGlow.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = sceneGlow;
  ctx.fillRect(sceneX, sceneY, sceneWidth, sceneHeight);
  const bottomShade = ctx.createLinearGradient(sceneX, sceneY, sceneX, sceneY + sceneHeight);
  bottomShade.addColorStop(0, "rgba(4,6,12,0.08)");
  bottomShade.addColorStop(1, "rgba(0,0,0,0.25)");
  ctx.fillStyle = bottomShade;
  ctx.fillRect(sceneX, sceneY, sceneWidth, sceneHeight);

  const avatarWidth = sceneWidth * MOCHI_SCENE_AVATAR_WIDTH_RATIO;
  const avatarX = sceneX + sceneWidth / 2 - avatarWidth / 2;
  const avatarY = sceneY + sceneHeight * MOCHI_SCENE_AVATAR_CENTER_Y_RATIO - avatarWidth / 2;
  ctx.shadowColor = `${data.petColor}88`;
  ctx.shadowBlur = 18;
  ctx.drawImage(avatarImg, avatarX, avatarY, avatarWidth, avatarWidth);
  ctx.shadowBlur = 0;

  const activeItems = Object.entries(data.equippedItems ?? {})
    .filter(([, itemId]) => Boolean(itemId) && !!getItemById(itemId as string))
    .map(([category, itemId]) => ({ category, itemId: itemId as string, item: getItemById(itemId as string) }))
    .sort((a, b) => (a.item?.zIndex ?? 5) - (b.item?.zIndex ?? 5));
  const positionScale = avatarWidth / MOCHI_SCENE_REFERENCE_AVATAR_WIDTH;

  for (const active of activeItems) {
    const item = active.item;
    const imageSrc = item?.image?.startsWith("/") ? item.image : null;
    const customPos = data.itemPositions?.[active.itemId];
    const finalX = customPos?.x ?? item?.offsetX ?? 0;
    const finalY = customPos?.y ?? item?.offsetY ?? 0;
    const centerX = sceneX + sceneWidth / 2 + finalX * positionScale;
    const centerY = sceneY + sceneHeight * MOCHI_SCENE_AVATAR_CENTER_Y_RATIO + finalY * positionScale;
    const itemScale = item?.scale ?? 1;
    const itemWidth = (imageSrc ? 224 : 48) * positionScale * itemScale;
    const itemHeight = (imageSrc ? 96 : 48) * positionScale * itemScale;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(((item?.rotation ?? 0) * Math.PI) / 180);
    if (imageSrc) {
      const img = await loadImage(imageSrc).catch(() => null);
      if (img) {
        ctx.drawImage(img, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight);
        ctx.restore();
        continue;
      }
    }

    {
      roundRect(ctx, -itemWidth / 2, -itemHeight / 2, itemWidth, itemHeight, itemWidth / 2);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.stroke();
      drawText(ctx, active.category.slice(0, 2).toUpperCase(), 0, 0, {
        font: "900 9px Arial",
        color: theme.textColor,
      });
    }
    ctx.restore();
  }
  ctx.restore();

  ctx.save();
  roundRect(ctx, sceneX, sceneY, sceneWidth, sceneHeight, 12);
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const statY = 312;
  drawMiniBar(ctx, "Hunger", data.hunger, 16, statY, 96, theme.accentColor, theme.textColor);
  drawMiniBar(ctx, "Cleanliness", data.cleanliness, 158, statY, 96, theme.accentColor, theme.textColor);
  drawMiniBar(ctx, "Happiness", data.happiness, 16, statY + 38, 96, theme.accentColor, theme.textColor);
  drawMiniBar(ctx, "Energy", data.energy, 158, statY + 38, 96, theme.accentColor, theme.textColor);
  drawText(ctx, "Powered by GenLayer | Mochi", 144, 368, {
    font: "800 12px Arial",
    color: theme.textColor,
    alpha: 0.35,
  });

  return canvasToBlob(canvas);
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
      const blob = await renderCardImage(currentCardData, theme);
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
  }, [currentCardData, theme]);

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
