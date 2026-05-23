"use client";

import { useState } from "react";
import { BookOpen, MessageCircle, Sparkles, Trophy } from "lucide-react";
import { usePetStore, HistoryEntry } from "@/lib/store/petStore";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function groupByDay(entries: HistoryEntry[]): { label: string; items: HistoryEntry[] }[] {
  const map = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.timestamp).toDateString();
    const existing = map.get(key);
    if (existing) existing.push(entry);
    else map.set(key, [entry]);
  }
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

function formatDayLabel(dateString: string): string {
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (dateString === today) return "Today";
  if (dateString === yesterday) return "Yesterday";
  return dateString;
}

function EntryIcon({ type }: { type: HistoryEntry["type"] }) {
  if (type === "chat") return <MessageCircle className="h-4 w-4" />;
  if (type === "levelup") return <Trophy className="h-4 w-4" />;
  if (type === "milestone") return <Sparkles className="h-4 w-4" />;
  return <BookOpen className="h-4 w-4" />;
}

function EntryRow({ entry }: { entry: HistoryEntry }) {
  const [expanded, setExpanded] = useState(false);
  const isChat = entry.type === "chat";

  return (
    <div className="space-y-2">
      <div
        className={`flex items-start gap-3 text-sm ${isChat ? "cursor-pointer select-none" : ""}`}
        onClick={() => isChat && setExpanded((e) => !e)}
      >
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-teal-200">
          <EntryIcon type={entry.type} />
        </span>
        <div className="min-w-0 flex-1">
          <span className={entry.type === "milestone" ? "font-black text-teal-100" : "font-bold text-white/78"}>
            {entry.detail}
          </span>
          {isChat && (
            <span className="ml-2 text-xs font-bold text-white/42">
              {expanded ? "Hide" : "Show"}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black text-white/48">
            Lv{entry.level}
          </span>
          <span className="font-mono text-[10px] font-bold text-white/42">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      </div>

      {isChat && expanded && entry.extra && (
        <div className="ml-11 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-semibold text-white/55">
          {entry.extra}
        </div>
      )}
    </div>
  );
}

export function MemoryTimeline() {
  const { actionHistory } = usePetStore();
  const groups = groupByDay(actionHistory);

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-black">
        <BookOpen className="h-5 w-5 text-teal-200" />
        Mochi Journey
      </h2>

      {actionHistory.length === 0 ? (
        <div className="mochi-panel p-8 text-center text-sm font-bold text-white/45">
          No activity yet. Start caring for Mochi.
        </div>
      ) : (
        <div className="max-h-[60dvh] space-y-5 overflow-y-auto pr-1">
          {groups.map(({ label, items }) => (
            <div key={label} className="space-y-2">
              <div className="sticky top-0 rounded-full bg-black/40 px-3 py-1 backdrop-blur-sm">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-white/42">
                  {formatDayLabel(label)}
                </span>
              </div>
              <div className="mochi-panel divide-y divide-white/5 overflow-hidden">
                {items.map((entry) => (
                  <div key={entry.id} className="px-3 py-3">
                    <EntryRow entry={entry} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
