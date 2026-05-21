import { ItemManifest, ItemRarity } from "../itemManifest";

const rarityForIndex = (index: number): ItemRarity => {
  if (index >= 10) return "legendary";
  if (index >= 7) return "epic";
  if (index >= 4) return "rare";
  return "common";
};

export const HATS: ItemManifest[] = Array.from({ length: 12 }, (_, index) => {
  const number = index + 1;
  return {
    id: `hat_${number}`,
    name: `Hat ${number}`,
    category: "hat",
    image: `/assets/mochi/items/hats/${number}.png`,
    rarity: rarityForIndex(number),
    unlockLevel: 3,
    zIndex: 5,
    scale: 1,
    offsetX: 0,
    offsetY: -68,
    rotation: 0,
    enabled: true,
  };
});
