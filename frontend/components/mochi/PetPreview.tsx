"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Home } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { getItemById } from "@/lib/data/itemManifest";
import { getRoomById } from "@/lib/data/roomManifest";
import { getMochiAvatar } from "@/lib/data/mochiAvatars";
import {
  MOCHI_SCENE_AVATAR_CENTER_Y_PERCENT,
  MOCHI_SCENE_AVATAR_WIDTH_RATIO,
  MOCHI_SCENE_REFERENCE_AVATAR_WIDTH,
  MOCHI_ROOM_ASPECT_RATIO,
  MOCHI_ROOM_MAX_WIDTH,
} from "@/lib/data/sceneLayout";

interface MoodOverlay {
  label: string;
  className: string;
  style?: React.CSSProperties;
}

function getMoodOverlay(
  hunger: number,
  energy: number,
  cleanliness: number,
  happiness: number,
): MoodOverlay | null {
  const min = Math.min(happiness, hunger, energy, cleanliness);

  if (happiness < 20 && happiness === min) {
    return { label: "Sad", className: "text-xs", style: { top: 12, left: 12 } };
  }
  if (hunger < 20 && hunger === min) {
    return { label: "Hungry", className: "text-xs animate-bounce", style: { top: 12, right: 12 } };
  }
  if (energy < 20 && energy === min) {
    return { label: "Tired", className: "text-xs animate-pulse", style: { top: 12, left: 12 } };
  }
  if (cleanliness < 20) {
    return { label: "Clean me", className: "text-xs animate-bounce", style: { top: 20, right: 20 } };
  }
  if (happiness > 80 && hunger > 80 && energy > 80 && cleanliness > 80) {
    return { label: "Glowing", className: "text-xs animate-pulse", style: { top: 8, right: 8 } };
  }
  return null;
}

interface AccessoryProps {
  itemId: string;
  category: string;
  draggable?: boolean;
}

function AccessoryLayer({ itemId, category, draggable = false }: AccessoryProps) {
  const { itemPositions, setItemPosition } = usePetStore();
  const item = getItemById(itemId);
  const display = item?.name?.slice(0, 2).toUpperCase() ?? category.slice(0, 2).toUpperCase();
  const imageSrc = item?.image?.startsWith("/") ? item.image : null;

  const customPos = itemPositions[itemId];
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const baseX = item?.offsetX ?? 0;
  const baseY = item?.offsetY ?? 0;
  const finalX = customPos?.x ?? baseX;
  const finalY = customPos?.y ?? baseY;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!draggable) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: finalX, origY: finalY };
    setDragging(true);
  }, [draggable, finalX, finalY]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current || !draggable) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setItemPosition(itemId, dragRef.current.origX + dx, dragRef.current.origY + dy);
  }, [draggable, itemId, setItemPosition]);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
    setDragging(false);
  }, []);

const style: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: MOCHI_SCENE_AVATAR_CENTER_Y_PERCENT,
    transform: `translate(calc(-50% + ${finalX}px), calc(-50% + ${finalY}px)) scale(${item?.scale ?? 1}) rotate(${item?.rotation ?? 0}deg)`,
    zIndex: item?.zIndex ?? 5,
    pointerEvents: draggable ? "auto" : "none",
    userSelect: "none",
    cursor: draggable ? (dragging ? "grabbing" : "grab") : "default",
    transition: dragging ? "none" : "transform 0.2s ease",
  };

  return (
    <span
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onLostPointerCapture={onPointerUp}
      className={`grid place-items-center text-[11px] font-black text-white/85 shadow-lg ${
        imageSrc
          ? "h-24 w-56"
          : "h-12 w-12 rounded-full border border-white/15 bg-black/35 backdrop-blur-sm"
      }`}
      title={item?.name ?? category}
    >
      {imageSrc ? (
        <img
          src={imageSrc}
          alt={item?.name ?? category}
          className="h-full w-full object-contain select-none"
          draggable={false}
        />
      ) : (
        display
      )}
      {draggable && !dragging && (
        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white/40 bg-teal-300" />
      )}
    </span>
  );
}

interface PetPreviewProps {
  draggable?: boolean;
}

export function PetPreview({ draggable = false }: PetPreviewProps) {
  const { petAvatarId, petColor, equippedItems, hunger, energy, cleanliness, happiness, roomId } =
    usePetStore();

  const avatar = useMemo(() => getMochiAvatar(petAvatarId), [petAvatarId]);
  const room = useMemo(() => getRoomById(roomId), [roomId]);
  const overlay = useMemo(
    () => getMoodOverlay(hunger, energy, cleanliness, happiness),
    [hunger, energy, cleanliness, happiness],
  );

  return (
    <div
      className="relative mx-auto w-full overflow-hidden"
      style={{ aspectRatio: MOCHI_ROOM_ASPECT_RATIO, maxWidth: MOCHI_ROOM_MAX_WIDTH, minHeight: 300 }}
    >
      <div
        className="absolute inset-0"
        style={{
          zIndex: 0,
          background: room.image
            ? `linear-gradient(180deg, rgb(4 6 12 / 0.08), rgb(4 6 12 / 0.24)), url("${room.image}") center / cover`
            : room.background,
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,255,255,0.13),transparent_34%),linear-gradient(180deg,transparent,rgba(0,0,0,0.24))]" />
        {!room.image && (
          <span
            className="absolute grid h-24 w-24 place-items-center rounded-full bg-white/5 text-white/10"
            style={{ bottom: 16, right: 20 }}
          >
            <Home className="h-12 w-12" />
          </span>
        )}
        <div className="absolute left-4 top-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white/80 backdrop-blur-sm" style={{ zIndex: 9 }}>
          {room.name}
        </div>
      </div>

      <div
        className="absolute flex items-center justify-center transition-all duration-500"
        style={{
          width: `${MOCHI_SCENE_AVATAR_WIDTH_RATIO * 100}%`,
          maxWidth: MOCHI_SCENE_REFERENCE_AVATAR_WIDTH,
          aspectRatio: "1",
          left: "50%",
          top: MOCHI_SCENE_AVATAR_CENTER_Y_PERCENT,
          transform: "translate(-50%, -50%)",
          filter: `drop-shadow(0 0 34px ${petColor}66) drop-shadow(0 18px 24px rgba(0,0,0,0.45))`,
          zIndex: 1,
        }}
      >
        <img
          src={avatar.src}
          alt={avatar.name}
          className="h-full w-full object-contain select-none"
          draggable={false}
        />
      </div>

      {(["necklace", "handheld", "hat", "glasses"] as const).map((cat) => {
        const id = equippedItems[cat];
        if (!id) return null;
        return <AccessoryLayer key={cat} itemId={id} category={cat} draggable={draggable} />;
      })}

      {overlay && (
        <span
          className={`absolute select-none rounded-full border border-white/10 bg-black/45 px-3 py-1 font-bold text-white/78 backdrop-blur-sm ${overlay.className}`}
          style={{ zIndex: 7, ...overlay.style }}
        >
          {overlay.label}
        </span>
      )}
    </div>
  );
}
