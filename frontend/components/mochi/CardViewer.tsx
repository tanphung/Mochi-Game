"use client";

import { forwardRef, useState } from "react";
import { MessageCircle, Sparkles, Trophy, Zap } from "lucide-react";
import { EquippedItems, usePetStore } from "@/lib/store/petStore";
import { getThemeForLevel, CardTheme } from "@/lib/data/cardThemes";
import { DEFAULT_MOCHI_AVATAR_ID, getMochiAvatar } from "@/lib/data/mochiAvatars";
import { getItemById } from "@/lib/data/itemManifest";
import { getRoomById } from "@/lib/data/roomManifest";
import {
  MOCHI_SCENE_AVATAR_CENTER_Y_PERCENT,
  MOCHI_SCENE_AVATAR_WIDTH_RATIO,
  MOCHI_SCENE_REFERENCE_AVATAR_WIDTH,
} from "@/lib/data/sceneLayout";

export interface CardData {
  petColor: string;
  petAvatarId?: string;
  level: number;
  nickname: string;
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
  mintedAt?: string;
  cardId?: string;
  totalActions?: number;
  totalChats?: number;
  equippedItems?: EquippedItems;
  itemPositions?: Record<string, { x: number; y: number }>;
  roomId?: string;
}

function MiniBar({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs" style={{ color: "inherit", opacity: 0.8 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: accent }}
        />
      </div>
    </div>
  );
}

function CardAccessory({
  itemId,
  category,
  itemPositions,
  positionScale,
}: {
  itemId: string;
  category: string;
  itemPositions?: Record<string, { x: number; y: number }>;
  positionScale: number;
}) {
  const item = getItemById(itemId);
  const label = item?.name.slice(0, 2).toUpperCase() ?? category.slice(0, 2).toUpperCase();
  const imageSrc = item?.image?.startsWith("/") ? item.image : null;
  const customPos = itemPositions?.[itemId];
  const finalX = customPos?.x ?? item?.offsetX ?? 0;
  const finalY = customPos?.y ?? item?.offsetY ?? 0;

  return (
    <span
      className="absolute left-1/2 grid place-items-center text-[9px] font-black text-white shadow-lg"
      style={{
        top: MOCHI_SCENE_AVATAR_CENTER_Y_PERCENT,
        width: imageSrc ? 224 * positionScale : 48 * positionScale,
        height: imageSrc ? 96 * positionScale : 48 * positionScale,
        transform: `translate(calc(-50% + ${finalX * positionScale}px), calc(-50% + ${finalY * positionScale}px)) scale(${item?.scale ?? 1}) rotate(${item?.rotation ?? 0}deg)`,
        zIndex: item?.zIndex ?? 5,
      }}
      title={item?.name ?? category}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={item?.name ?? category}
          className="h-full w-full object-contain"
          draggable={false}
        />
      ) : (
        <span className="grid h-full w-full place-items-center rounded-full border border-white/20 bg-black/45">
          {label}
        </span>
      )}
    </span>
  );
}

function CardScene({
  avatarId,
  color,
  equippedItems,
  itemPositions,
  roomId,
  exportMode = false,
}: {
  avatarId?: string;
  color: string;
  equippedItems?: EquippedItems;
  itemPositions?: Record<string, { x: number; y: number }>;
  roomId?: string;
  exportMode?: boolean;
}) {
  const avatar = getMochiAvatar(avatarId ?? DEFAULT_MOCHI_AVATAR_ID);
  const room = getRoomById(roomId ?? "starter_room");
  const activeItems = Object.entries(equippedItems ?? {}).filter(([, itemId]) => Boolean(itemId));
  const sceneWidth = exportMode ? 232 : 330;
  const sceneHeight = Math.round(sceneWidth * 0.75);
  const avatarWidth = sceneWidth * MOCHI_SCENE_AVATAR_WIDTH_RATIO;
  const positionScale = avatarWidth / MOCHI_SCENE_REFERENCE_AVATAR_WIDTH;

  return (
    <div
      className="relative mx-auto overflow-hidden rounded-xl border border-white/10"
      style={{
        width: exportMode ? sceneWidth : "min(330px, 100%)",
        height: exportMode ? sceneHeight : undefined,
        aspectRatio: `${sceneWidth} / ${sceneHeight}`,
        background: room.image
          ? `linear-gradient(180deg, rgb(4 6 12 / 0.08), rgb(4 6 12 / 0.24)), url("${room.image}") center / cover`
          : room.background,
      }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_38%,rgba(255,255,255,0.14),transparent_35%),linear-gradient(180deg,transparent,rgba(0,0,0,0.24))]" />
      <img
        src={avatar.src}
        alt={avatar.name}
        className="absolute left-1/2 aspect-square -translate-x-1/2 -translate-y-1/2 object-contain"
        style={{
          top: MOCHI_SCENE_AVATAR_CENTER_Y_PERCENT,
          width: `${MOCHI_SCENE_AVATAR_WIDTH_RATIO * 100}%`,
          filter: `drop-shadow(0 0 18px ${color}88) drop-shadow(0 10px 14px rgba(0,0,0,0.45))`,
          zIndex: 1,
        }}
        draggable={false}
      />
      {activeItems.map(([category, itemId]) => (
        <CardAccessory
          key={`${category}-${itemId}`}
          itemId={itemId as string}
          category={category}
          itemPositions={itemPositions}
          positionScale={positionScale}
        />
      ))}
    </div>
  );
}

function CardFront({ data, theme, exportMode = false }: { data: CardData; theme: CardTheme; exportMode?: boolean }) {
  const displayName = data.nickname ? `Mochi / ${data.nickname}` : "Mochi";

  return (
    <div
      className="mochi-nft-card-face absolute inset-0 flex flex-col overflow-hidden rounded-2xl p-5"
      style={{
        background: `
          radial-gradient(circle at 18% 10%, ${theme.accentColor}55 0%, transparent 34%),
          radial-gradient(circle at 88% 18%, rgb(53 236 255 / 0.36) 0%, transparent 32%),
          radial-gradient(circle at 52% 106%, rgb(255 233 106 / 0.20) 0%, transparent 34%),
          linear-gradient(145deg, ${theme.bgColor} 0%, rgb(20 24 72) 46%, rgb(36 18 76) 100%)
        `,
        border: `2px solid ${theme.borderColor}`,
        boxShadow: `0 0 0 1px rgb(255 255 255 / 0.10), 0 24px 70px ${theme.accentColor}22, inset 0 1px 0 rgb(255 255 255 / 0.20)`,
        color: theme.textColor,
        backfaceVisibility: "hidden",
      }}
    >
      <div className="text-center">
        <div
          className="mb-1 text-xs font-black uppercase tracking-[0.2em] opacity-70"
          style={{ color: theme.accentColor }}
        >
          {theme.name} Card
        </div>
        <div className="text-xl font-black">{displayName}</div>
        <div className="mt-1 inline-flex items-center gap-1 text-base font-bold opacity-75">
          <Trophy className="h-4 w-4" />
          Level {data.level}
        </div>
      </div>

      <div className="my-4 flex justify-center">
        <CardScene
          avatarId={data.petAvatarId}
          color={data.petColor}
          equippedItems={data.equippedItems}
          itemPositions={data.itemPositions}
          roomId={data.roomId}
          exportMode={exportMode}
        />
      </div>

      <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-2">
        <MiniBar label="Hunger" value={data.hunger} accent={theme.accentColor} />
        <MiniBar label="Cleanliness" value={data.cleanliness} accent={theme.accentColor} />
        <MiniBar label="Happiness" value={data.happiness} accent={theme.accentColor} />
        <MiniBar label="Energy" value={data.energy} accent={theme.accentColor} />
      </div>

      <div className="mt-4 text-center text-xs font-bold opacity-35">
        Powered by GenLayer | Mochi
      </div>

      {!exportMode && (
        <div
          className="absolute bottom-3 right-4 text-[10px] font-bold opacity-55"
          style={{ color: theme.accentColor }}
        >
          tap to flip
        </div>
      )}
    </div>
  );
}

function CardBack({ data, theme }: { data: CardData; theme: CardTheme }) {
  const date = data.mintedAt
    ? new Date(data.mintedAt).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "Not minted";

  return (
    <div
      className="mochi-nft-card-face absolute inset-0 flex flex-col overflow-hidden rounded-2xl p-5"
      style={{
        background: `
          radial-gradient(circle at 20% 8%, rgb(53 236 255 / 0.32) 0%, transparent 34%),
          radial-gradient(circle at 84% 18%, ${theme.accentColor}55 0%, transparent 34%),
          linear-gradient(145deg, rgb(15 19 58) 0%, ${theme.bgColor} 54%, rgb(40 18 78) 100%)
        `,
        border: `2px solid ${theme.borderColor}`,
        boxShadow: `0 0 0 1px rgb(255 255 255 / 0.10), 0 24px 70px ${theme.accentColor}22, inset 0 1px 0 rgb(255 255 255 / 0.20)`,
        color: theme.textColor,
        backfaceVisibility: "hidden",
        transform: "rotateY(180deg)",
      }}
    >
      <div
        className="mb-4 flex items-center justify-center gap-2 border-b pb-3 text-sm font-black"
        style={{ borderColor: `${theme.borderColor}44`, color: theme.accentColor }}
      >
        <Sparkles className="h-4 w-4" />
        Stats Detail
      </div>

      <div className="flex-1 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="opacity-70">Hunger</span>
          <span className="font-mono">{data.hunger}/100</span>
        </div>
        <div className="flex justify-between">
          <span className="flex items-center gap-1 opacity-70"><Zap className="h-3 w-3" /> Energy</span>
          <span className="font-mono">{data.energy}/100</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Cleanliness</span>
          <span className="font-mono">{data.cleanliness}/100</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-70">Happiness</span>
          <span className="font-mono">{data.happiness}/100</span>
        </div>
        {data.equippedItems && Object.values(data.equippedItems).some(Boolean) && (
          <div className="pt-2">
            <div className="mb-1 font-black opacity-70">Equipped</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(data.equippedItems).map(([category, itemId]) => {
                if (!itemId) return null;
                const item = getItemById(itemId);
                return (
                  <span key={`${category}-${itemId}`} className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold">
                    {item?.name ?? category}
                  </span>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div
        className="mt-2 space-y-1 border-t pt-3 text-xs"
        style={{ borderColor: `${theme.borderColor}44` }}
      >
        <div className="flex justify-between">
          <span className="opacity-70">Generated</span>
          <span>{date}</span>
        </div>
        {data.totalActions !== undefined && (
          <div className="flex justify-between">
            <span className="opacity-70">Actions</span>
            <span>{data.totalActions}</span>
          </div>
        )}
        {data.totalChats !== undefined && (
          <div className="flex justify-between">
            <span className="flex items-center gap-1 opacity-70"><MessageCircle className="h-3 w-3" /> Chats</span>
            <span>{data.totalChats}</span>
          </div>
        )}
        {data.cardId && (
          <div className="flex justify-between">
            <span className="opacity-70">Card ID</span>
            <span className="font-mono">{data.cardId}</span>
          </div>
        )}
      </div>

      <div
        className="absolute bottom-3 right-4 text-[10px] font-bold opacity-55"
        style={{ color: theme.accentColor }}
      >
        tap to flip
      </div>
    </div>
  );
}

interface CardViewerProps {
  data?: CardData;
  interactive?: boolean;
  exportMode?: boolean;
}

export const CardViewer = forwardRef<HTMLDivElement, CardViewerProps>(
  function CardViewer({ data, interactive = true, exportMode = false }, ref) {
    const store = usePetStore();
    const [flipped, setFlipped] = useState(false);

    const cardData: CardData = data ?? {
      petColor: store.petColor,
      petAvatarId: store.petAvatarId,
      level: store.level,
      nickname: store.petNickname,
      hunger: store.hunger,
      energy: store.energy,
      cleanliness: store.cleanliness,
      happiness: store.happiness,
      totalActions: store.actionHistory.filter((e) => e.type === "action").length,
      totalChats: store.chatHistory.filter((m) => m.role === "mochi").length,
      equippedItems: store.equippedItems,
      itemPositions: store.itemPositions,
      roomId: store.roomId,
    };

    const theme = getThemeForLevel(cardData.level);

    return (
      <div
        ref={ref}
        className={!exportMode ? "mochi-nft-card" : undefined}
        style={{
          perspective: exportMode ? "none" : "1000px",
          width: exportMode ? 288 : "min(430px, calc(100vw - 40px))",
          height: exportMode ? 384 : undefined,
          aspectRatio: exportMode ? undefined : "3 / 4",
          cursor: interactive && !exportMode ? "pointer" : "default",
        }}
        onClick={() => interactive && !exportMode && setFlipped((f) => !f)}
        role={interactive && !exportMode ? "button" : undefined}
        aria-label={interactive && !exportMode ? "Click to flip card" : undefined}
      >
        <div
          className={!exportMode ? "mochi-nft-card-inner" : undefined}
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            transition: exportMode ? "none" : "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: !exportMode && flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          <CardFront data={cardData} theme={theme} exportMode={exportMode} />
          {!exportMode && <CardBack data={cardData} theme={theme} />}
        </div>
      </div>
    );
  },
);
