import { ItemManifest, ItemRarity } from "../itemManifest";

const rarityForIndex = (index: number): ItemRarity => {
  if (index >= 9) return "legendary";
  if (index >= 6) return "epic";
  if (index >= 3) return "rare";
  return "common";
};

export const HANDHELD: ItemManifest[] = Array.from({ length: 10 }, (_, index) => {
  const number = index + 1;
  return {
    id: `handheld_${number}`,
    name: `Handheld ${number}`,
    category: "handheld",
    image: `/assets/mochi/items/handheld/${number}.png`,
    rarity: rarityForIndex(number),
    unlockLevel: 15,
    zIndex: 4,
    scale: 1,
    offsetX: 50,
    offsetY: 10,
    rotation: -10,
    enabled: true,
  };
});
