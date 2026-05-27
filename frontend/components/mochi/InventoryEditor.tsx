"use client";

import { useState } from "react";
import { Backpack, Cat, Crown, Gem, Glasses, Hand, Home, Save, X } from "lucide-react";
import { ITEM_SCALE_MAX, ITEM_SCALE_MIN, ITEM_SCALE_STEP, usePetStore } from "@/lib/store/petStore";
import { getItemsByCategory, ItemManifest } from "@/lib/data/itemManifest";
import { MOCHI_AVATARS } from "@/lib/data/mochiAvatars";
import { ROOM_MANIFEST } from "@/lib/data/roomManifest";
import { MOCHI_ROOM_MAX_WIDTH } from "@/lib/data/sceneLayout";
import { ItemCategory as ContractCategory } from "@/lib/contracts/MochiPet";
import { PetPreview } from "./PetPreview";

type Tab = "character" | "hat" | "glasses" | "necklace" | "handheld" | "room";

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "character", label: "Mochi", icon: <Cat className="h-4 w-4" /> },
  { id: "hat", label: "Hat", icon: <Crown className="h-4 w-4" /> },
  { id: "glasses", label: "Glasses", icon: <Glasses className="h-4 w-4" /> },
  { id: "necklace", label: "Necklace", icon: <Gem className="h-4 w-4" /> },
  { id: "handheld", label: "Handheld", icon: <Hand className="h-4 w-4" /> },
  { id: "room", label: "Room", icon: <Home className="h-4 w-4" /> },
];

interface Props {
  onClose: () => void;
  inline?: boolean;
}

export function InventoryEditor({ onClose, inline = false }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("character");
  const {
    petAvatarId,
    setPetAvatar,
    equippedItems,
    equipItem,
    unequipItem,
    itemPositions,
    resetItemPosition,
    setItemScale,
    roomId,
    setRoom,
    level,
    isSavingCustomization,
    saveCustomization,
  } = usePetStore();

  const handleEquip = (item: ItemManifest) => {
    const cat = item.category as ContractCategory;
    if (equippedItems[cat] === item.id) {
      unequipItem(cat);
    } else {
      equipItem(cat, item.id);
    }
  };

  const handleResetPosition = (item: ItemManifest) => {
    resetItemPosition(item.id);
  };

  const content = (
    <div className={inline ? "grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]" : "flex h-full flex-col"}>
      <div className={inline ? "space-y-4" : "flex flex-1 flex-col overflow-hidden"}>
        {!inline && (
          <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="flex items-center gap-2 text-lg font-black">
              <Backpack className="h-5 w-5 text-teal-200" />
              Inventory Editor
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={saveCustomization}
                disabled={isSavingCustomization}
                className="mochi-primary-button px-4 py-2 text-xs"
              >
                <Save className="h-4 w-4" />
                {isSavingCustomization ? "Saving..." : "Save On-chain"}
              </button>
              <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full text-white/45 hover:bg-white/10 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {inline && (
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-black">
                <Backpack className="h-5 w-5 text-teal-200" />
                Inventory Editor
              </h2>
              <p className="mt-1 text-xs font-semibold text-white/42">
                Drag equipped items on the preview to reposition them.
              </p>
            </div>
            <button
              onClick={saveCustomization}
              disabled={isSavingCustomization}
              className="mochi-primary-button px-4 py-2 text-xs"
            >
              <Save className="h-4 w-4" />
              {isSavingCustomization ? "Saving..." : "Save On-chain"}
            </button>
          </div>
        )}

        <div className="flex shrink-0 gap-2 overflow-x-auto rounded-full border border-white/10 bg-black/20 p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mochi-tab shrink-0 text-sm font-black ${
                activeTab === tab.id ? "mochi-tab-active" : "hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className={inline ? "" : "flex-1 overflow-y-auto p-4"}>
          {activeTab === "character" ? (
            <div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3">
              {MOCHI_AVATARS.map((avatar) => {
                const selected = petAvatarId === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => setPetAvatar(avatar.id)}
                    className={`mochi-panel flex flex-col items-center gap-3 p-3 text-center transition active:scale-95 ${
                      selected ? "border-teal-300/70 bg-teal-300/10" : "hover:border-white/25"
                    }`}
                  >
                    <span className="grid h-24 w-24 place-items-center overflow-hidden rounded-2xl bg-white/[0.06]">
                      <img
                        src={avatar.src}
                        alt={avatar.name}
                        className="h-full w-full object-contain"
                        draggable={false}
                      />
                    </span>
                    <span className="text-xs font-black">{avatar.name}</span>
                    {selected && (
                      <span className="rounded-full bg-teal-300/15 px-2 py-1 text-[10px] font-black text-teal-100">
                        SELECTED
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : activeTab === "room" ? (
            <div className="grid grid-cols-1 gap-3 p-1 sm:grid-cols-2">
              {ROOM_MANIFEST.map((room) => {
                const selected = roomId === room.id;
                const locked = room.unlockLevel > level;

                return (
                  <button
                    key={room.id}
                    onClick={() => !locked && setRoom(room.id)}
                    disabled={locked}
                    className={`mochi-panel overflow-hidden text-left transition active:scale-[0.98] ${
                      selected ? "border-teal-300/70 bg-teal-300/10" : "hover:border-white/25"
                    } ${locked ? "cursor-not-allowed opacity-45" : ""}`}
                  >
                    <span
                      className="block aspect-[4/3] border-b border-white/8"
                      style={{
                        background: room.image
                          ? `linear-gradient(180deg, rgb(4 6 12 / 0.06), rgb(4 6 12 / 0.20)), url("${room.image}") center / contain no-repeat, ${room.background}`
                          : room.background,
                      }}
                    />
                    <span className="flex items-center justify-between gap-3 p-3">
                      <span>
                        <span className="block text-sm font-black">{room.name}</span>
                        <span className="mt-1 block text-xs font-bold text-white/42">
                          {locked ? `Unlocks at Level ${room.unlockLevel}` : "Available"}
                        </span>
                      </span>
                      {selected && (
                        <span className="rounded-full bg-teal-300/15 px-2 py-1 text-[10px] font-black text-teal-100">
                          SELECTED
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 p-1 sm:grid-cols-3">
              {getItemsByCategory(activeTab).map((item) => {
                const cat = item.category as ContractCategory;
                const equipped = equippedItems[cat] === item.id;
                const initials = item.name.slice(0, 2).toUpperCase();
                const imageSrc = item.image.startsWith("/") ? item.image : null;
                const itemScale = itemPositions[item.id]?.scale ?? 1;

                return (
                  <div key={item.id} className="space-y-2">
                    <button
                      onClick={() => handleEquip(item)}
                      className={`mochi-panel relative flex w-full cursor-pointer flex-col items-center gap-2 p-3 text-center transition active:scale-95 ${
                        equipped ? "border-teal-300/70 bg-teal-300/10" : "hover:border-white/25"
                      }`}
                    >
                      <span className="grid h-16 w-20 place-items-center rounded-2xl bg-white/[0.06] text-sm font-black text-teal-100">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={item.name}
                            className="h-full w-full object-contain"
                            draggable={false}
                          />
                        ) : (
                          initials
                        )}
                      </span>
                      <span className="text-xs font-black">{item.name}</span>
                      <span className="text-xs font-bold capitalize text-white/42">{item.rarity}</span>
                      {equipped && (
                        <span className="rounded-full bg-teal-300/15 px-2 py-1 text-[10px] font-black text-teal-100">
                          ON
                        </span>
                      )}
                    </button>
                    {equipped && (
                      <div className="space-y-2">
                        <label className="block rounded-2xl bg-white/[0.05] px-3 py-2">
                          <span className="mb-1 flex items-center justify-between text-[10px] font-black uppercase text-white/50">
                            <span>Scale</span>
                            <span>{Math.round(itemScale * 100)}%</span>
                          </span>
                          <input
                            type="range"
                            min={ITEM_SCALE_MIN}
                            max={ITEM_SCALE_MAX}
                            step={ITEM_SCALE_STEP}
                            value={itemScale}
                            onChange={(event) => setItemScale(item.id, Number(event.target.value))}
                            className="w-full accent-teal-300"
                          />
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => handleResetPosition(item)}
                          className="rounded-full bg-white/[0.06] py-1 text-[10px] font-bold text-white/55 hover:text-white"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() => unequipItem(cat)}
                          className="rounded-full bg-red-400/10 py-1 text-[10px] font-bold text-red-200 hover:text-red-100"
                        >
                          Remove
                        </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className={inline ? "space-y-3" : "px-4 pb-4"}>
        <div
          className="mx-auto w-full overflow-hidden rounded-[28px] border border-white/10"
          style={{ maxWidth: MOCHI_ROOM_MAX_WIDTH * 0.95 }}
        >
          <PetPreview draggable />
        </div>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div
        className="mochi-card flex w-full max-w-4xl flex-col overflow-hidden"
        style={{ maxHeight: "90dvh" }}
      >
        {content}
      </div>
    </div>
  );
}
