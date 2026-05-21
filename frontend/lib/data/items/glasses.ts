import { ItemManifest, ItemRarity } from "../itemManifest";

const rarityForIndex = (index: number): ItemRarity => {
  if (index >= 7) return "legendary";
  if (index >= 5) return "epic";
  if (index >= 3) return "rare";
  return "common";
};

export const GLASSES: ItemManifest[] = Array.from({ length: 8 }, (_, index) => {
  const number = index + 1;
  return {
    id: `glasses_${number}`,
    name: `Glasses ${number}`,
    category: "glasses",
    image: `/assets/mochi/items/glasses/${number}.png`,
    rarity: rarityForIndex(number),
    unlockLevel: 5,
    zIndex: 6,
    scale: 0.95,
    offsetX: 0,
    offsetY: -92,
    rotation: 0,
    enabled: true,
  };
});
