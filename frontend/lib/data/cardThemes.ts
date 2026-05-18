export interface CardTheme {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
}

export const CARD_THEMES: CardTheme[] = [
  {
    id: "starter",
    name: "Starter",
    minLevel: 1,
    maxLevel: 4,
    bgColor: "#171B4C",
    borderColor: "#35ECFF",
    textColor: "#f8f8f2",
    accentColor: "#FF4FD8",
  },
  {
    id: "nature",
    name: "Nature",
    minLevel: 5,
    maxLevel: 9,
    bgColor: "#102D55",
    borderColor: "#36F3B9",
    textColor: "#e8f5e9",
    accentColor: "#35ECFF",
  },
  {
    id: "neon",
    name: "Neon",
    minLevel: 10,
    maxLevel: 14,
    bgColor: "#130B3F",
    borderColor: "#00FFFF",
    textColor: "#e0ffff",
    accentColor: "#FF00FF",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    minLevel: 15,
    maxLevel: 19,
    bgColor: "#171052",
    borderColor: "#8B5CFF",
    textColor: "#fff8dc",
    accentColor: "#FFE96A",
  },
  {
    id: "legendary",
    name: "Legendary",
    minLevel: 20,
    maxLevel: 20,
    bgColor: "#240B4D",
    borderColor: "#FFE96A",
    textColor: "#fff0e0",
    accentColor: "#FF4FD8",
  },
];

export function getThemeForLevel(level: number): CardTheme {
  return (
    CARD_THEMES.find((t) => level >= t.minLevel && level <= t.maxLevel) ??
    CARD_THEMES[0]
  );
}
