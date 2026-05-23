export type ActionType = "feed" | "play" | "sleep" | "clean";

export interface Stats {
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
}

export interface StatEffect extends Stats {
  exp: number;
}

// MUST match contract mochi_pet.py 100%
// play.cleanliness = 0 — intentionally unchanged (per contract)
export const ACTION_EFFECTS: Record<ActionType, StatEffect> = {
  feed:  { hunger: +20, energy:   0, cleanliness:  0, happiness:  +5, exp: 10 },
  play:  { hunger:  -5, energy: -10, cleanliness:  0, happiness: +20, exp: 15 },
  sleep: { hunger:   0, energy: +30, cleanliness:  0, happiness:  +5, exp:  8 },
  clean: { hunger:   0, energy:  -5, cleanliness: +25, happiness: +10, exp: 10 },
};

export const CHAT_EFFECT: StatEffect = {
  hunger: 0, energy: 0, cleanliness: 0, happiness: +5, exp: 5,
};

export const ACTION_LABELS: Record<ActionType, string> = {
  feed:  "Fed Mochi! 🍖",
  play:  "Played with Mochi! 🎾",
  sleep: "Mochi took a nap! 😴",
  clean: "Cleaned Mochi! 🛁",
};

export const ACTION_EMOJIS: Record<ActionType, string> = {
  feed:  "🍖",
  play:  "🎾",
  sleep: "😴",
  clean: "🛁",
};

export function clampStat(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function clampStats(stats: Stats): Stats {
  return {
    hunger:      clampStat(stats.hunger),
    energy:      clampStat(stats.energy),
    cleanliness: clampStat(stats.cleanliness),
    happiness:   clampStat(stats.happiness),
  };
}

export function applyEffect(stats: Stats, effect: StatEffect): Stats {
  return clampStats({
    hunger:      stats.hunger      + effect.hunger,
    energy:      stats.energy      + effect.energy,
    cleanliness: stats.cleanliness + effect.cleanliness,
    happiness:   stats.happiness   + effect.happiness,
  });
}
