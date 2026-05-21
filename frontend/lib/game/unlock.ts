// Unlock progression matching UNLOCK_TABLE in prompt-2
// These levels mirror when categories and rooms become accessible

export const UNLOCK_TABLE: Record<number, string[]> = {
  1:  ["pet_skin_default", "room_starter"],
  3:  ["category:hat"],
  5:  ["category:glasses"],
  8:  ["room_cozy"],
  10: ["category:necklace", "room_garden"],
  12: ["room_space"],
  15: ["category:handheld", "room_fantasy"],
  18: ["color_advanced", "room_prism"],
  20: ["legendary_card_theme", "room_legendary", "room_dream"],
};

// Minimum level required to see/use each item category
export const CATEGORY_UNLOCK_LEVEL: Record<string, number> = {
  hat:      3,
  glasses:  5,
  necklace: 10,
  handheld: 15,
};

export function getUnlocksAtLevel(level: number): string[] {
  return UNLOCK_TABLE[level] ?? [];
}

export function isCategoryUnlocked(category: string, currentLevel: number): boolean {
  const required = CATEGORY_UNLOCK_LEVEL[category];
  if (required === undefined) return true;
  return currentLevel >= required;
}

export function unlockDisplayName(key: string): string {
  if (key.startsWith("category:")) {
    const cat = key.replace("category:", "");
    return `${cat.charAt(0).toUpperCase()}${cat.slice(1)} Category`;
  }
  if (key.startsWith("room_")) {
    const name = key.replace("room_", "").replace(/_/g, " ");
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} Room`;
  }
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
