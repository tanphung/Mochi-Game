import { ItemManifest, ItemRarity } from "../itemManifest";

const necklaceNumbers = [1, 2, 3, 5];

const rarityForIndex = (index: number): ItemRarity => {
  if (index >= 4) return "legendary";
  if (index === 3) return "epic";
  if (index === 2) return "rare";
  return "common";
};

export const NECKLACES: ItemManifest[] = necklaceNumbers.map((number, index) => ({
  id: `necklace_${number}`,
  name: `Necklace ${number}`,
  category: "necklace",
  image: `/assets/mochi/items/necklaces/${number}.png`,
  rarity: rarityForIndex(index + 1),
  unlockLevel: 10,
  zIndex: 3,
  scale: 0.9,
  offsetX: 0,
  offsetY: 14,
  rotation: 0,
  enabled: true,
}));
