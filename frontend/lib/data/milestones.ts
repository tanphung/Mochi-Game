export interface Milestone {
  id: string;
  name: string;
  description: string;
  emoji: string;
}

export interface MilestoneStatus {
  id: string;
  achieved: boolean;
  achievedAt?: number;
}

export const MILESTONES: Milestone[] = [
  { id: "first_feed",      name: "First Meal",       description: "Feed Mochi for the first time",           emoji: "🍖" },
  { id: "first_play",      name: "Playtime!",         description: "Play with Mochi for the first time",      emoji: "🎮" },
  { id: "first_chat",      name: "Hello Mochi!",      description: "Chat with Mochi for the first time",      emoji: "💬" },
  { id: "first_levelup",   name: "Growing Up",        description: "Reach Level 2",                           emoji: "⭐" },
  { id: "first_accessory", name: "Fashionista",       description: "Equip your first accessory",              emoji: "👑" },
  { id: "first_color",     name: "New Look",          description: "Change Mochi's color for the first time", emoji: "🎨" },
  { id: "first_mint",      name: "On-Chain Forever",  description: "Mint your first NFT card",                emoji: "🃏" },
  { id: "level_10",        name: "Veteran",           description: "Reach Level 10",                          emoji: "🔟" },
  { id: "level_20",        name: "Legend",            description: "Reach Level 20 — MAX!",                   emoji: "🏆" },
  { id: "chat_10",         name: "Chatterbox",        description: "Chat with Mochi 10 times",                emoji: "🗣️" },
];

export function createInitialMilestones(): MilestoneStatus[] {
  return MILESTONES.map((m) => ({ id: m.id, achieved: false }));
}

export function getMilestone(id: string): Milestone | undefined {
  return MILESTONES.find((m) => m.id === id);
}
