"use client";

import { useState } from "react";
import {
  Backpack,
  BookOpen,
  Cat,
  ClipboardCheck,
  Edit3,
  Home,
  IdCard,
  LogOut,
  MessageCircle,
  Save,
  Trophy,
  WalletCards,
} from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { useDecayTick } from "@/lib/hooks/useDecayTick";
import { ROOM_MANIFEST } from "@/lib/data/roomManifest";
import { MOCHI_ROOM_MAX_WIDTH } from "@/lib/data/sceneLayout";
import { PetPreview } from "./PetPreview";
import { StatsPanel } from "./StatsPanel";
import { LevelProgress } from "./LevelProgress";
import { ActionButtons } from "./ActionButtons";
import { ChatWithPet } from "./ChatWithPet";
import { InventoryEditor } from "./InventoryEditor";
import { CardMinter } from "./CardMinter";
import { MemoryTimeline } from "./MemoryTimeline";
import { MilestoneGallery } from "./MilestoneGallery";
import { QuestEvaluator } from "./QuestEvaluator";

type ActiveTab = "home" | "inventory" | "card" | "memory" | "quest";
type MemorySubTab = "timeline" | "milestones";

const tabs: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
  { id: "home", label: "Home", icon: <Home className="h-4 w-4" /> },
  { id: "inventory", label: "Inventory", icon: <Backpack className="h-4 w-4" /> },
  { id: "card", label: "Card", icon: <IdCard className="h-4 w-4" /> },
  { id: "memory", label: "Memory", icon: <BookOpen className="h-4 w-4" /> },
];

export function Dashboard() {
  useDecayTick();

  const { address, disconnectWallet } = useWallet();
  const {
    displayName, petNickname, isLoading, setNickname, setRoom, roomId,
    level, exp, isSavingCustomization, saveCustomization,
  } = usePetStore();

  const [tab, setTab] = useState<ActiveTab>("home");
  const [memorySubTab, setMemorySubTab] = useState<MemorySubTab>("timeline");
  const [showChat, setShowChat] = useState(false);
  const [editingNick, setEditingNick] = useState(false);
  const [nickInput, setNickInput] = useState(petNickname);

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const saveNickname = async () => {
    await setNickname(nickInput.trim());
    setEditingNick(false);
  };

  return (
    <div className="mochi-shell flex min-h-screen flex-col">
      <header className="mochi-nav sticky top-0 z-40">
        <div className="mochi-container flex min-h-16 flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="mochi-logo-mark shrink-0">
              <Cat className="h-6 w-6" />
            </div>
            {editingNick ? (
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <input
                  autoFocus
                  value={nickInput}
                  onChange={(e) => setNickInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveNickname()}
                  maxLength={32}
                  className="w-44 rounded-full border border-teal-300/40 bg-white/[0.06] px-3 py-2 text-sm font-semibold outline-none"
                />
                <button onClick={saveNickname} className="mochi-primary-button px-3 py-2 text-xs">
                  Save
                </button>
                <button onClick={() => setEditingNick(false)} className="text-xs font-bold text-white/45 hover:text-white">
                  Cancel
                </button>
              </div>
            ) : (
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-lg font-black">{displayName}</span>
                  <button
                    onClick={() => { setNickInput(petNickname); setEditingNick(true); }}
                    className="grid h-8 w-8 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
                    title="Edit name"
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs font-bold text-white/42">
                  Level {level} | {exp} total EXP
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-2 rounded-full bg-white/[0.06] px-3 py-2 font-mono text-xs font-bold text-white/52 sm:inline-flex">
              <WalletCards className="h-4 w-4" />
              {short}
            </span>
            <button onClick={disconnectWallet} className="mochi-ghost-button px-3 py-2 text-xs">
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {isLoading && (
        <div className="relative z-10 border-b border-white/5 bg-teal-300/8 py-2 text-center text-sm font-bold text-teal-100/75">
          Syncing with chain...
        </div>
      )}

      <main className="relative z-10 flex-1">
        <div className="mochi-container py-4">
          <div className="mb-4 flex gap-2 overflow-x-auto rounded-full border border-white/8 bg-black/20 p-1">
            {tabs.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`mochi-tab shrink-0 text-sm font-black ${
                  tab === item.id ? "mochi-tab-active" : "hover:text-white"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>

          {tab === "home" && (
            <div className="grid grid-cols-1 gap-4 animate-fade-in lg:grid-cols-[340px_1fr]">
              <div className="space-y-2.5">
                <StatsPanel />
                <LevelProgress />

                <div className="mochi-panel px-3 py-2.5">
                  <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/44">
                    Quick Actions
                  </h3>
                  <ActionButtons />
                </div>

                <button
                  onClick={() => setShowChat(true)}
                  className="mochi-primary-button w-full px-5 py-3 text-base"
                >
                  <MessageCircle className="h-5 w-5" />
                  Chat with Pet
                </button>
                <p className="-mt-1 text-center text-[13px] font-semibold text-white/42">
                  AI responses powered by GenLayer on-chain consensus
                </p>

                <button
                  onClick={() => setTab("quest")}
                  className="mochi-primary-button w-full px-5 py-3 text-base"
                >
                  <ClipboardCheck className="h-5 w-5" />
                  Let Mochi Check Your Quest
                </button>
                <p className="-mt-1 text-center text-[13px] font-semibold text-white/42">
                  Reviewed against the requirements before you submit
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-2xl font-black">
                      {petNickname ? `${petNickname}'s Room` : "Mochi's Room"}
                    </h2>
                  </div>
                  <button
                    onClick={saveCustomization}
                    disabled={isSavingCustomization}
                    className="mochi-primary-button px-4 py-2 text-xs"
                  >
                    <Save className="h-4 w-4" />
                    {isSavingCustomization ? "Saving..." : "Save On-chain"}
                  </button>
                </div>

                <div
                  className="mx-auto w-full overflow-hidden rounded-[28px] border border-white/10 shadow-[0_26px_80px_rgba(0,0,0,0.36)]"
                  style={{ maxWidth: MOCHI_ROOM_MAX_WIDTH * 0.95 }}
                >
                  <PetPreview animate />
                </div>

                <div className="mochi-panel p-4">
                  <h3 className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-white/44">
                    Room
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {ROOM_MANIFEST.map((room) => {
                      const locked = room.unlockLevel > level;
                      const active = roomId === room.id;
                      return (
                        <button
                          key={room.id}
                          onClick={() => !locked && setRoom(room.id)}
                          disabled={locked}
                          title={locked ? `Unlocks at Level ${room.unlockLevel}` : room.name}
                          className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-black transition ${
                            active
                              ? "border-teal-300/70 bg-teal-300/12 text-teal-100"
                              : "border-white/10 text-white/48 hover:border-white/25 hover:text-white"
                          } ${locked ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                        >
                          <Home className="h-4 w-4" />
                          <span>{room.name}</span>
                          {locked && <span className="text-[10px]">Lv.{room.unlockLevel}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "inventory" && (
            <div className="animate-fade-in">
              <InventoryEditor onClose={() => setTab("home")} inline />
            </div>
          )}

          {tab === "card" && (
            <div className="mx-auto max-w-3xl animate-fade-in">
              <CardMinter />
            </div>
          )}

          {tab === "memory" && (
            <div className="mx-auto max-w-3xl animate-fade-in space-y-4">
              <div className="grid grid-cols-2 gap-2 rounded-full border border-white/8 bg-black/20 p-1">
                <button
                  onClick={() => setMemorySubTab("timeline")}
                  className={`mochi-tab text-sm font-black ${
                    memorySubTab === "timeline" ? "mochi-tab-active" : "hover:text-white"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  Timeline
                </button>
                <button
                  onClick={() => setMemorySubTab("milestones")}
                  className={`mochi-tab text-sm font-black ${
                    memorySubTab === "milestones" ? "mochi-tab-active" : "hover:text-white"
                  }`}
                >
                  <Trophy className="h-4 w-4" />
                  Milestones
                </button>
              </div>
              {memorySubTab === "timeline" && <MemoryTimeline />}
              {memorySubTab === "milestones" && <MilestoneGallery />}
            </div>
          )}

          {tab === "quest" && (
            <div className="animate-fade-in">
              <QuestEvaluator onBack={() => setTab("home")} />
            </div>
          )}
        </div>
      </main>

      {showChat && <ChatWithPet onClose={() => setShowChat(false)} />}
    </div>
  );
}
