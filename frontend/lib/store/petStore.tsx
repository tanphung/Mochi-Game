"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  ReactNode,
} from "react";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import {
  createMochiPetContract,
  MintedCard,
  ItemCategory,
  QuestEvidence,
  QuestEvaluation,
  parseQuestEvaluation,
} from "@/lib/contracts/MochiPet";
import { getContractAddress } from "@/lib/genlayer/client";
import {
  ActionType,
  Stats,
  ACTION_EFFECTS,
  CHAT_EFFECT,
  ACTION_LABELS,
  ACTION_EMOJIS,
  applyEffect,
  clampStats,
} from "@/lib/game/actions";
import { levelForExp, getExpToNextLevel, getExpProgress, MAX_LEVEL } from "@/lib/game/exp";
import { getUnlocksAtLevel, unlockDisplayName } from "@/lib/game/unlock";
import { calculateDecay, applyDecayToStats } from "@/lib/game/decay";
import {
  MilestoneStatus,
  createInitialMilestones,
  getMilestone,
} from "@/lib/data/milestones";
import { DEFAULT_MOCHI_AVATAR_ID } from "@/lib/data/mochiAvatars";
import { success, error as toastError } from "@/lib/utils/toast";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: "user" | "mochi";
  message: string;
  timestamp: number;
}

export interface HistoryEntry {
  id: string;
  type: "action" | "milestone" | "levelup" | "chat";
  detail: string;
  timestamp: number;
  level: number;
  emoji: string;
  extra?: string; // chat type: mochi's response text
}

export interface EquippedItems {
  hat: string | null;
  glasses: string | null;
  necklace: string | null;
  shirt: string | null;
  handheld: string | null;
}

export interface ItemTransform {
  x?: number;
  y?: number;
  scale?: number;
}

export const ITEM_SCALE_MIN = 0.35;
export const ITEM_SCALE_MAX = 2.5;
export const ITEM_SCALE_STEP = 0.05;

interface PetState {
  isLoading: boolean;
  hasPetOnChain: boolean;
  petName: "Mochi";
  petNickname: string;
  petAvatarId: string;
  petColor: string;
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
  level: number;
  exp: number;
  equippedItems: EquippedItems;
  roomId: string;
  lastResponse: string;
  chatHistory: ChatMessage[];
  isChatLoading: boolean;
  isEvaluating: boolean;
  questStatus: "submitting" | "consensus" | "reading" | null;
  questTxHash: string | null;
  lastEvaluation: QuestEvaluation | null;
  questRequirements: string;
  questEvidence: QuestEvidence[];
  mintedCards: MintedCard[];
  isMinting: boolean;
  isSavingCustomization: boolean;
  actionHistory: HistoryEntry[];
  milestones: MilestoneStatus[];
  lastDecayAt: number;
  recentlyUnlocked: string[];
  cooldowns: Record<string, number>;
  itemPositions: Record<string, ItemTransform>;
}

const COOLDOWN_MS = 3 * 60 * 1000;
const LOCAL_MEMORY_VERSION = 1;
const MAX_STORED_CHAT_MESSAGES = 200;
const MAX_STORED_HISTORY_ENTRIES = 200;

interface StoredPetMemory {
  chatHistory: ChatMessage[];
  actionHistory: HistoryEntry[];
  milestones: MilestoneStatus[];
}

function getPetMemoryKey(address: string): string {
  const contractAddress = getContractAddress().toLowerCase() || "unknown-contract";
  return `mochi:pet-memory:v${LOCAL_MEMORY_VERSION}:${contractAddress}:${address.toLowerCase()}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function normalizeChatHistory(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is ChatMessage => {
      if (!isRecord(entry)) return false;
      return (
        (entry.role === "user" || entry.role === "mochi") &&
        typeof entry.message === "string" &&
        typeof entry.timestamp === "number"
      );
    })
    .slice(-MAX_STORED_CHAT_MESSAGES);
}

function normalizeActionHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const allowedTypes = new Set<HistoryEntry["type"]>(["action", "milestone", "levelup", "chat"]);
  return value
    .filter((entry): entry is HistoryEntry => {
      if (!isRecord(entry)) return false;
      return (
        typeof entry.id === "string" &&
        allowedTypes.has(entry.type as HistoryEntry["type"]) &&
        typeof entry.detail === "string" &&
        typeof entry.timestamp === "number" &&
        typeof entry.level === "number" &&
        typeof entry.emoji === "string" &&
        (entry.extra === undefined || typeof entry.extra === "string")
      );
    })
    .slice(0, MAX_STORED_HISTORY_ENTRIES);
}

function normalizeMilestones(value: unknown): MilestoneStatus[] {
  const saved = Array.isArray(value) ? value : [];
  const byId = new Map<string, MilestoneStatus>();

  for (const entry of saved) {
    if (!isRecord(entry)) continue;
    if (typeof entry.id !== "string" || typeof entry.achieved !== "boolean") continue;
    byId.set(entry.id, {
      id: entry.id,
      achieved: entry.achieved,
      achievedAt: typeof entry.achievedAt === "number" ? entry.achievedAt : undefined,
    });
  }

  return createInitialMilestones().map((status) => byId.get(status.id) ?? status);
}

function readStoredPetMemory(storageKey: string): StoredPetMemory {
  if (typeof window === "undefined") {
    return { chatHistory: [], actionHistory: [], milestones: createInitialMilestones() };
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return { chatHistory: [], actionHistory: [], milestones: createInitialMilestones() };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return { chatHistory: [], actionHistory: [], milestones: createInitialMilestones() };
    }

    return {
      chatHistory: normalizeChatHistory(parsed.chatHistory),
      actionHistory: normalizeActionHistory(parsed.actionHistory),
      milestones: normalizeMilestones(parsed.milestones),
    };
  } catch {
    return { chatHistory: [], actionHistory: [], milestones: createInitialMilestones() };
  }
}

function writeStoredPetMemory(storageKey: string, memory: StoredPetMemory): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({
        version: LOCAL_MEMORY_VERSION,
        savedAt: Date.now(),
        chatHistory: normalizeChatHistory(memory.chatHistory),
        actionHistory: normalizeActionHistory(memory.actionHistory),
        milestones: normalizeMilestones(memory.milestones),
      }),
    );
  } catch {
    // localStorage may be unavailable or full; the on-chain pet state is unaffected.
  }
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clampItemScale(scale: number): number {
  return Math.min(ITEM_SCALE_MAX, Math.max(ITEM_SCALE_MIN, scale));
}

interface PetStoreContext extends PetState {
  // Computed
  displayName: string;
  expToNextLevel: number;
  expProgress: number;
  appPhase: "landing" | "create_pet" | "dashboard";
  // Actions
  syncFromChain: () => Promise<void>;
  createPet: (nickname: string) => Promise<void>;
  performAction: (action: ActionType) => Promise<void>;
  sendChat: (message: string) => Promise<void>;
  evaluateQuest: (requirements: string, evidence: QuestEvidence[]) => Promise<void>;
  setQuestRequirements: (value: string) => void;
  setQuestEvidence: (value: QuestEvidence[] | ((prev: QuestEvidence[]) => QuestEvidence[])) => void;
  setNickname: (nick: string) => Promise<void>;
  setPetAvatar: (avatarId: string) => void;
  equipItem: (category: ItemCategory, id: string) => Promise<void>;
  unequipItem: (category: ItemCategory) => Promise<void>;
  setRoom: (roomId: string) => Promise<void>;
  saveCustomization: () => Promise<void>;
  mintCard: () => Promise<void>;
  applyDecay: () => void;
  clearRecentlyUnlocked: () => void;
  setItemPosition: (itemId: string, x: number, y: number) => void;
  setItemScale: (itemId: string, scale: number) => void;
  resetItemPosition: (itemId: string) => void;
}

// ── Initial state ──────────────────────────────────────────────────────────────

function makeInitialState(): PetState {
  return {
    isLoading: false,
    hasPetOnChain: false,
    petName: "Mochi",
    petNickname: "",
    petAvatarId: DEFAULT_MOCHI_AVATAR_ID,
    petColor: "#F4A460",
    hunger: 70,
    energy: 80,
    cleanliness: 80,
    happiness: 70,
    level: 1,
    exp: 0,
    equippedItems: { hat: null, glasses: null, necklace: null, shirt: null, handheld: null },
    roomId: "space",
    lastResponse: "",
    chatHistory: [],
    isChatLoading: false,
    isEvaluating: false,
    questStatus: null,
    questTxHash: null,
    lastEvaluation: null,
    questRequirements: "",
    questEvidence: [{ url: "", note: "" }],
    mintedCards: [],
    isMinting: false,
    isSavingCustomization: false,
    actionHistory: [],
    milestones: createInitialMilestones(),
    lastDecayAt: Date.now(),
    recentlyUnlocked: [],
    cooldowns: {},
    itemPositions: {},
  };
}

// ── Context ────────────────────────────────────────────────────────────────────

const PetContext = createContext<PetStoreContext | undefined>(undefined);

// ── Provider ───────────────────────────────────────────────────────────────────

export function PetProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [state, setState] = useState<PetState>(makeInitialState);
  const [memoryHydratedKey, setMemoryHydratedKey] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Computed ───────────────────────────────────────────────────────────────

  const appPhase = useMemo((): "landing" | "create_pet" | "dashboard" => {
    if (!wallet.isConnected) return "landing";
    if (!state.hasPetOnChain) return "create_pet";
    return "dashboard";
  }, [wallet.isConnected, state.hasPetOnChain]);

  const displayName = useMemo(
    () => (state.petNickname ? `Mochi ${state.petNickname}` : "Mochi"),
    [state.petNickname],
  );

  const expToNextLevel = useMemo(
    () => getExpToNextLevel(state.level, state.exp),
    [state.level, state.exp],
  );

  const expProgress = useMemo(
    () => getExpProgress(state.exp, state.level),
    [state.exp, state.level],
  );

  const localMemoryKey = useMemo(
    () => (wallet.address ? getPetMemoryKey(wallet.address) : null),
    [wallet.address],
  );

  // ── Internal helpers ───────────────────────────────────────────────────────

  const makeId = () => `${Date.now()}-${Math.random()}`;

  const readStringField = (value: unknown, keys: string[], seen = new Set<unknown>()): string | null => {
    if (!value || typeof value !== "object" || seen.has(value)) return null;
    seen.add(value);

    if (value instanceof Map) {
      for (const key of keys) {
        const field = value.get(key);
        if (typeof field === "string" && field.trim()) return field;
      }

      for (const nestedValue of value.values()) {
        const nested = readStringField(nestedValue, keys, seen);
        if (nested) return nested;
      }

      return null;
    }

    const record = value as Record<string, unknown>;
    for (const key of keys) {
      const field = record[key];
      if (typeof field === "string" && field.trim()) return field;
    }

    for (const key of ["value", "result", "data", "calldata", "returnValue"]) {
      const nested = readStringField(record[key], keys, seen);
      if (nested) return nested;
    }

    for (const nestedValue of Object.values(record)) {
      const nested = readStringField(nestedValue, keys, seen);
      if (nested) return nested;
    }

    return null;
  };

  const readPetResponse = (pet: unknown): string => {
    const response = readStringField(pet, ["last_response", "lastResponse"]);
    if (!response) {
      throw new Error("Chat transaction completed, but no Mochi response was returned from get_pet.");
    }
    return response;
  };

  const sleepMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const readUpdatedPetAfterChat = async (
    contract: ReturnType<typeof createMochiPetContract>,
    address: string,
  ) => {
    let latestError: unknown = null;

    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const latestPet = await contract.getPet(address);
        const response = readPetResponse(latestPet);
        return { pet: latestPet, response };
      } catch (err) {
        latestError = err;
      }

      await sleepMs(2000);
    }

    throw latestError instanceof Error
      ? latestError
      : new Error("Chat transaction completed, but get_pet could not be read.");
  };

  const readQuestEvalAfterTx = async (
    contract: ReturnType<typeof createMochiPetContract>,
    address: string,
  ): Promise<QuestEvaluation> => {
    let latestError: unknown = null;
    // Evaluation runs web fetch + LLM under validator consensus — allow a generous read window.
    for (let attempt = 0; attempt < 15; attempt += 1) {
      try {
        const latestPet = await contract.getPet(address);
        const raw = readStringField(latestPet, ["last_quest_eval", "lastQuestEval"]);
        if (raw) return parseQuestEvaluation(raw);
      } catch (err) {
        latestError = err;
      }
      await sleepMs(2000);
    }
    throw latestError instanceof Error
      ? latestError
      : new Error("Evaluation completed, but the result could not be read from get_pet.");
  };

  const parseItemPositions = (raw: unknown): Record<string, ItemTransform> => {
    if (typeof raw !== "string" || !raw.trim()) return {};
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
      const next: Record<string, ItemTransform> = {};
      Object.entries(parsed as Record<string, unknown>).forEach(([itemId, value]) => {
        if (!value || typeof value !== "object" || Array.isArray(value)) return;
        const pos = value as Record<string, unknown>;
        const x = readFiniteNumber(pos.x);
        const y = readFiniteNumber(pos.y);
        const scale = readFiniteNumber(pos.scale);
        const transform: ItemTransform = {};
        if (x !== undefined) transform.x = x;
        if (y !== undefined) transform.y = y;
        if (scale !== undefined) transform.scale = clampItemScale(scale);
        if (Object.keys(transform).length > 0) next[itemId] = transform;
      });
      return next;
    } catch {
      return {};
    }
  };

  const pushHistory = useCallback((entry: Omit<HistoryEntry, "id">) => {
    setState((prev) => {
      const full: HistoryEntry = { ...entry, id: makeId() };
      return { ...prev, actionHistory: [full, ...prev.actionHistory].slice(0, 200) };
    });
  }, []);

  const triggerMilestone = useCallback((id: string) => {
    setState((prev) => {
      const ms = prev.milestones.find((m) => m.id === id);
      if (!ms || ms.achieved) return prev;
      const def = getMilestone(id);
      if (!def) return prev;
      const updated = prev.milestones.map((m) =>
        m.id === id ? { ...m, achieved: true, achievedAt: Date.now() } : m,
      );
      const entry: HistoryEntry = {
        id: `ms-${Date.now()}-${Math.random()}`,
        type: "milestone",
        detail: `Milestone: ${def.name}`,
        timestamp: Date.now(),
        level: prev.level,
        emoji: def.emoji,
      };
      // Toast is a side-effect — acceptable here as it only fires when !achieved
      toast.success(`🎉 Milestone Achieved! ${def.emoji} ${def.name}`, {
        description: def.description,
        duration: 4000,
      });
      return {
        ...prev,
        milestones: updated,
        actionHistory: [entry, ...prev.actionHistory].slice(0, 200),
      };
    });
  }, []);

  // ── syncFromChain ──────────────────────────────────────────────────────────

  const syncFromChain = useCallback(async () => {
    const addr = wallet.address;
    if (!addr) return;
    setState((prev) => ({ ...prev, isLoading: true }));
    try {
      const contract = createMochiPetContract(addr);
      const hasPet = await contract.hasPet(addr);
      if (!hasPet) {
        setState((prev) => ({ ...prev, isLoading: false, hasPetOnChain: false }));
        return;
      }
      const [pet, cards] = await Promise.all([
        contract.getPet(addr),
        contract.getMintedCards(addr),
      ]);
      // GenLayer may return nested dataclasses or flatten them — handle both
      const raw = pet as any;
      const stats = raw.stats ?? raw;
      const equipped = raw.equipped_items ?? raw;
      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasPetOnChain: true,
        petName: "Mochi",
        petNickname: raw.nickname ?? "",
        petAvatarId: raw.pet_avatar_id || DEFAULT_MOCHI_AVATAR_ID,
        petColor: raw.pet_color ?? "#F4A460",
        hunger: stats.hunger ?? 70,
        energy: stats.energy ?? 80,
        cleanliness: stats.cleanliness ?? 80,
        happiness: stats.happiness ?? 70,
        level: raw.level ?? 1,
        exp: raw.exp ?? 0,
        equippedItems: {
          hat:      equipped.hat      || null,
          glasses:  equipped.glasses  || null,
          necklace: equipped.necklace || null,
          shirt:    null,
          handheld: equipped.handheld || null,
        },
        roomId: raw.room_id || "space",
        itemPositions: parseItemPositions(raw.item_positions),
        lastResponse: raw.last_response ?? "",
        mintedCards: cards ?? [],
        lastDecayAt: Date.now(),
      }));
    } catch (err) {
      setState((prev) => ({ ...prev, isLoading: false }));
      console.error("syncFromChain failed:", err);
    }
  }, [wallet.address]);

  useEffect(() => {
    setMemoryHydratedKey(null);
    if (!localMemoryKey) return;

    const stored = readStoredPetMemory(localMemoryKey);
    setState((prev) => ({
      ...prev,
      chatHistory: stored.chatHistory,
      actionHistory: stored.actionHistory,
      milestones: stored.milestones,
    }));
    setMemoryHydratedKey(localMemoryKey);
  }, [localMemoryKey]);

  useEffect(() => {
    if (!localMemoryKey || memoryHydratedKey !== localMemoryKey) return;

    writeStoredPetMemory(localMemoryKey, {
      chatHistory: state.chatHistory,
      actionHistory: state.actionHistory,
      milestones: state.milestones,
    });
  }, [localMemoryKey, memoryHydratedKey, state.chatHistory, state.actionHistory, state.milestones]);

  // Auto-sync when wallet address changes
  useEffect(() => {
    if (wallet.address) {
      syncFromChain();
    } else {
      setState(makeInitialState());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet.address]);

  // ── createPet ──────────────────────────────────────────────────────────────

  const createPet = useCallback(
    async (nickname: string) => {
      if (!wallet.address) return;
      const cleanNickname = nickname.trim();
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        await createMochiPetContract(wallet.address).createPet(cleanNickname);
        success("Mochi is here! 🐱");
        await syncFromChain();
        setState((prev) => ({
          ...prev,
          hasPetOnChain: true,
          petNickname: cleanNickname || prev.petNickname,
          isLoading: false,
        }));
      } catch (err) {
        setState((prev) => ({ ...prev, isLoading: false }));
        toastError("Failed to create pet", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
        throw err;
      }
    },
    [wallet.address, syncFromChain],
  );

  // ── performAction ──────────────────────────────────────────────────────────

  const performAction = useCallback(
    async (action: ActionType) => {
      if (!wallet.address) return;
      const s = stateRef.current;

      // Per-action cooldown check (3 minutes)
      const lastUsed = s.cooldowns[action] ?? 0;
      const remaining = COOLDOWN_MS - (Date.now() - lastUsed);
      if (remaining > 0) {
        const secs = Math.ceil(remaining / 1000);
        const m = Math.floor(secs / 60);
        const sec = secs % 60;
        toastError(`${ACTION_LABELS[action]} on cooldown`, {
          description: `Try again in ${m}:${sec.toString().padStart(2, "0")}`,
        });
        return;
      }

      // Snapshot for rollback
      const snapshot = {
        hunger: s.hunger, energy: s.energy,
        cleanliness: s.cleanliness, happiness: s.happiness,
        exp: s.exp, level: s.level,
      };

      // Compute new state
      const newStats = applyEffect(
        { hunger: s.hunger, energy: s.energy, cleanliness: s.cleanliness, happiness: s.happiness },
        ACTION_EFFECTS[action],
      );
      const newExp   = s.exp + ACTION_EFFECTS[action].exp;
      const newLevel = levelForExp(newExp);
      const oldLevel = s.level;

      // Optimistic update + set cooldown
      setState((prev) => ({
        ...prev, ...newStats, exp: newExp, level: newLevel, isLoading: true,
        cooldowns: { ...prev.cooldowns, [action]: Date.now() },
      }));

      // Push action history
      pushHistory({ type: "action", detail: ACTION_LABELS[action], timestamp: Date.now(), level: oldLevel, emoji: ACTION_EMOJIS[action] });

      // First-action milestone
      triggerMilestone(`first_${action}`);

      // Level-up processing for every new level gained
      if (newLevel > oldLevel) {
        const newlyUnlocked: string[] = [];
        for (let lv = oldLevel + 1; lv <= newLevel; lv++) {
          const unlocks = getUnlocksAtLevel(lv);
          newlyUnlocked.push(...unlocks);

          // History entries
          pushHistory({ type: "levelup", detail: `Level Up! Lv ${lv - 1} → Lv ${lv}`, timestamp: Date.now(), level: lv, emoji: "⭐" });
          unlocks.forEach((key) =>
            pushHistory({ type: "milestone", detail: `Unlocked: ${unlockDisplayName(key)}`, timestamp: Date.now(), level: lv, emoji: "🔓" }),
          );

          // Level-up toast with unlock list
          const unlockNames = unlocks.map(unlockDisplayName);
          toast.success(`🎉 Level Up! Mochi is now Level ${lv}!`, {
            description: unlockNames.length > 0 ? `🔓 Unlocked: ${unlockNames.join(", ")}` : undefined,
            duration: 3500,
          });

          // Milestone triggers
          if (lv === 2)          triggerMilestone("first_levelup");
          if (lv === 10)         triggerMilestone("level_10");
          if (lv >= MAX_LEVEL)   triggerMilestone("level_20");
        }

        // Persist recently unlocked items/rooms for NEW badge
        if (newlyUnlocked.length > 0) {
          setState((prev) => ({
            ...prev,
            recentlyUnlocked: [...prev.recentlyUnlocked, ...newlyUnlocked],
          }));
        }
      }

      // Blockchain call
      try {
        const contract = createMochiPetContract(wallet.address);
        if (action === "feed")  await contract.feed();
        if (action === "play")  await contract.play();
        if (action === "sleep") await contract.sleep();
        if (action === "clean") await contract.clean();
        success(ACTION_LABELS[action]);
      } catch (err) {
        setState((prev) => ({ ...prev, ...snapshot, isLoading: false }));
        toastError("Action failed", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
        return;
      }
      setState((prev) => ({ ...prev, isLoading: false }));
    },
    [wallet.address, pushHistory, triggerMilestone],
  );

  // ── sendChat ───────────────────────────────────────────────────────────────

  const sendChat = useCallback(
    async (message: string) => {
      if (!wallet.address) return;
      const userMsg: ChatMessage = { role: "user", message, timestamp: Date.now() };

      setState((prev) => ({
        ...prev,
        chatHistory: [...prev.chatHistory, userMsg],
        isChatLoading: true,
      }));

      try {
        const contract = createMochiPetContract(wallet.address);
        const txHash = await contract.chat(message);

        let response: string;
        try {
          ({ response } = await readUpdatedPetAfterChat(contract, wallet.address));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`${message} | tx: ${txHash}`);
        }

        const mochiMsg: ChatMessage = {
          role: "mochi",
          message: response,
          timestamp: Date.now(),
        };

        setState((prev) => {
          const newStats = clampStats({
            hunger: prev.hunger, energy: prev.energy,
            cleanliness: prev.cleanliness,
            happiness: prev.happiness + CHAT_EFFECT.happiness,
          });
          return {
            ...prev,
            ...newStats,
            exp: prev.exp + CHAT_EFFECT.exp,
            level: levelForExp(prev.exp + CHAT_EFFECT.exp),
            lastResponse: response,
            chatHistory: [...prev.chatHistory, mochiMsg],
            isChatLoading: false,
          };
        });

        const chatLevel = stateRef.current.level;
        pushHistory({
          type: "chat", detail: message, timestamp: Date.now(),
          level: chatLevel, emoji: "💬", extra: response,
        });

        triggerMilestone("first_chat");
        const mochiCountAfterThisReply =
          stateRef.current.chatHistory.filter((m) => m.role === "mochi").length + 1;
        if (mochiCountAfterThisReply >= 10) triggerMilestone("chat_10");
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Please try again.";
        setState((prev) => ({
          ...prev,
          chatHistory: [
            ...prev.chatHistory,
            {
              role: "mochi",
              message: `On-chain chat failed: ${errorMessage}`,
              timestamp: Date.now(),
            },
          ],
          isChatLoading: false,
        }));
        console.error("Chat failed:", err);
        toastError("Chat failed", {
          description: errorMessage,
        });
      }
    },
    [wallet.address, triggerMilestone, pushHistory],
  );

  // ── setNickname ────────────────────────────────────────────────────────────

  const setNickname = useCallback(
    async (nick: string) => {
      if (!wallet.address) {
        toastError("Connect wallet to update nickname");
        return;
      }

      const cleanNick = nick.trim();
      const previousNick = stateRef.current.petNickname;
      if (cleanNick === previousNick) return;

      setState((s) => ({ ...s, petNickname: cleanNick }));
      try {
        await createMochiPetContract(wallet.address).setNickname(cleanNick);
        success("Nickname saved on-chain!");
      } catch (err) {
        setState((s) => ({ ...s, petNickname: previousNick }));
        toastError("Failed to save nickname", {
          description: err instanceof Error ? err.message : "Please try again.",
        });
      }
    },
    [wallet.address],
  );

  const setPetAvatar = useCallback((avatarId: string) => {
    setState((s) => ({ ...s, petAvatarId: avatarId }));
  }, []);

  // ── equipItem ──────────────────────────────────────────────────────────────

  const equipItem = useCallback(
    async (category: ItemCategory, id: string) => {
      setState((s) => ({ ...s, equippedItems: { ...s.equippedItems, [category]: id } }));
      triggerMilestone("first_accessory");
    },
    [triggerMilestone],
  );

  // ── unequipItem ────────────────────────────────────────────────────────────

  const unequipItem = useCallback(
    async (category: ItemCategory) => {
      setState((s) => ({ ...s, equippedItems: { ...s.equippedItems, [category]: null } }));
    },
    [],
  );

  // ── setRoom ────────────────────────────────────────────────────────────────

  const setRoom = useCallback(
    async (roomId: string) => {
      setState((s) => ({ ...s, roomId }));
    },
    [],
  );

  const saveCustomization = useCallback(async () => {
    if (!wallet.address) return;
    const s = stateRef.current;
    setState((prev) => ({ ...prev, isSavingCustomization: true }));
    try {
      await createMochiPetContract(wallet.address).saveCustomization({
        petAvatarId: s.petAvatarId,
        roomId: s.roomId,
        equippedItems: {
          hat: s.equippedItems.hat ?? "",
          glasses: s.equippedItems.glasses ?? "",
          necklace: s.equippedItems.necklace ?? "",
          shirt: "",
          handheld: s.equippedItems.handheld ?? "",
        },
        itemPositions: JSON.stringify(s.itemPositions),
      });
      success("Customization saved on-chain!");
      triggerMilestone("first_accessory");
      await syncFromChain();
      setState((prev) => ({ ...prev, isSavingCustomization: false }));
    } catch (err) {
      setState((prev) => ({ ...prev, isSavingCustomization: false }));
      toastError("Failed to save customization", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  }, [wallet.address, syncFromChain, triggerMilestone]);

  // ── mintCard ───────────────────────────────────────────────────────────────

  const mintCard = useCallback(async () => {
    if (!wallet.address) return;
    const s = stateRef.current;
    setState((prev) => ({ ...prev, isMinting: true }));
    try {
      const snapshot = JSON.stringify({
        name: "Mochi",
        nickname: s.petNickname,
        petAvatarId: s.petAvatarId,
        level: s.level,
        petColor: s.petColor,
        stats: { hunger: s.hunger, energy: s.energy, cleanliness: s.cleanliness, happiness: s.happiness },
        equippedItems: s.equippedItems,
        itemPositions: s.itemPositions,
        roomId: s.roomId,
        mintedAt: new Date().toISOString(),
        totalActions: s.actionHistory.filter((e) => e.type === "action").length,
        totalChats: s.chatHistory.filter((m) => m.role === "mochi").length,
      });
      await createMochiPetContract(wallet.address).mintCard(snapshot);
      const cards = await createMochiPetContract(wallet.address).getMintedCards(wallet.address);
      setState((prev) => ({ ...prev, mintedCards: cards, isMinting: false }));
      success("Card minted! 🃏");
      triggerMilestone("first_mint");
    } catch {
      setState((prev) => ({ ...prev, isMinting: false }));
      toastError("Failed to mint card");
    }
  }, [wallet.address, triggerMilestone]);

  // ── applyDecay ─────────────────────────────────────────────────────────────

  const applyDecay = useCallback(() => {
    setState((prev) => {
      const now = Date.now();
      const amount = calculateDecay(prev.lastDecayAt, now);
      if (amount <= 0) return prev;
      const newStats = applyDecayToStats(
        { hunger: prev.hunger, energy: prev.energy, cleanliness: prev.cleanliness, happiness: prev.happiness },
        amount,
      );
      return { ...prev, ...newStats, lastDecayAt: now };
    });
  }, []);

  // ── clearRecentlyUnlocked ──────────────────────────────────────────────────

  const clearRecentlyUnlocked = useCallback(() => {
    setState((prev) => ({ ...prev, recentlyUnlocked: [] }));
  }, []);

  const setItemPosition = useCallback((itemId: string, x: number, y: number) => {
    setState((prev) => ({
      ...prev,
      itemPositions: {
        ...prev.itemPositions,
        [itemId]: { ...(prev.itemPositions[itemId] ?? {}), x, y },
      },
    }));
  }, []);

  const setItemScale = useCallback((itemId: string, scale: number) => {
    setState((prev) => ({
      ...prev,
      itemPositions: {
        ...prev.itemPositions,
        [itemId]: {
          ...(prev.itemPositions[itemId] ?? {}),
          scale: clampItemScale(scale),
        },
      },
    }));
  }, []);

  const resetItemPosition = useCallback((itemId: string) => {
    setState((prev) => {
      const next = { ...prev.itemPositions };
      delete next[itemId];
      return { ...prev, itemPositions: next };
    });
  }, []);

  // ── Context value ──────────────────────────────────────────────────────────

  // ── Quest form state (persisted in store so it survives tab switches) ─────────

  const setQuestRequirements = useCallback((value: string) => {
    setState((prev) => ({ ...prev, questRequirements: value }));
  }, []);

  const setQuestEvidence = useCallback(
    (value: QuestEvidence[] | ((prev: QuestEvidence[]) => QuestEvidence[])) => {
      setState((prev) => ({
        ...prev,
        questEvidence: typeof value === "function" ? value(prev.questEvidence) : value,
      }));
    },
    [],
  );

  // ── evaluateQuest ────────────────────────────────────────────────────────────

  const evaluateQuest = useCallback(
    async (requirements: string, evidence: QuestEvidence[]) => {
      if (!wallet.address) return;
      setState((prev) => ({
        ...prev,
        isEvaluating: true,
        questStatus: "submitting",
        questTxHash: null,
      }));
      try {
        const contract = createMochiPetContract(wallet.address);
        await Promise.resolve();
        setState((prev) => ({ ...prev, questStatus: "consensus" }));
        const txHash = await contract.evaluateQuest(requirements, evidence, {
          onTxHash: (hash) => {
            setState((prev) => ({ ...prev, questTxHash: hash }));
          },
        });
        let result: QuestEvaluation;
        try {
          setState((prev) => ({ ...prev, questStatus: "reading" }));
          result = await readQuestEvalAfterTx(contract, wallet.address);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`${message} | tx: ${txHash}`);
        }
        setState((prev) => ({
          ...prev,
          lastEvaluation: result,
          isEvaluating: false,
          questStatus: null,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Please try again.";
        setState((prev) => ({ ...prev, isEvaluating: false, questStatus: null }));
        console.error("Quest evaluation failed:", err);
        toastError("Something went wrong, please try again!", {
          description: errorMessage,
        });
      }
    },
    [wallet.address],
  );

  const value: PetStoreContext = {
    ...state,
    displayName,
    expToNextLevel,
    expProgress,
    appPhase,
    syncFromChain,
    createPet,
    performAction,
    sendChat,
    evaluateQuest,
    setQuestRequirements,
    setQuestEvidence,
    setNickname,
    setPetAvatar,
    equipItem,
    unequipItem,
    setRoom,
    saveCustomization,
    mintCard,
    applyDecay,
    clearRecentlyUnlocked,
    setItemPosition,
    setItemScale,
    resetItemPosition,
  };

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePetStore() {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error("usePetStore must be used within PetProvider");
  return ctx;
}
