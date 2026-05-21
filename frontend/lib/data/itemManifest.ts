// zIndex convention (SINGLE SOURCE OF TRUTH):
// 0=room, 1=pet body, 3=necklace, 4=handheld, 5=hat, 6=glasses, 7=effects
//
// unlockLevel for each item must be >= CATEGORY_UNLOCK_LEVEL in unlock.ts:
//   hat>=3, glasses>=5, necklace>=10, handheld>=15

export type ItemCategory = "hat" | "glasses" | "necklace" | "handheld" | "room";
export type ItemRarity = "common" | "rare" | "epic" | "legendary";

export interface ItemManifest {
  id: string;
  name: string;
  category: ItemCategory;
  image: string;
  rarity: ItemRarity;
  unlockLevel: number;
  zIndex: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  enabled: boolean;
}

export { HATS }      from "./items/hats";
export { GLASSES }   from "./items/glasses";
export { NECKLACES } from "./items/necklaces";
export { HANDHELD }  from "./items/handheld";

import { HATS }      from "./items/hats";
import { GLASSES }   from "./items/glasses";
import { NECKLACES } from "./items/necklaces";
import { HANDHELD }  from "./items/handheld";

export const ITEM_MANIFEST: ItemManifest[] = [
  ...HATS,
  ...GLASSES,
  ...NECKLACES,
  ...HANDHELD,
];

export const CATEGORY_FALLBACK_EMOJI: Record<string, string> = {
  hat: "Hat",
  glasses: "Gl",
  necklace: "Ne",
  handheld: "Hd",
  room: "Rm",
};

export function getItemById(id: string): ItemManifest | undefined {
  return ITEM_MANIFEST.find((item) => item.id === id);
}

export function getItemsByCategory(category: ItemCategory): ItemManifest[] {
  return ITEM_MANIFEST.filter((item) => item.category === category && item.enabled);
}
