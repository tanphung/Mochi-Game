"use client";

import { useEffect, useRef, useState } from "react";
import { Cat, Send, X } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";

interface Props {
  onClose: () => void;
}

export function ChatWithPet({ onClose }: Props) {
  const { chatHistory, isChatLoading, sendChat, displayName } = usePetStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isChatLoading]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg || isChatLoading) return;
    setInput("");
    sendChat(msg);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center">
      <div className="mochi-card flex w-full max-w-md flex-col overflow-hidden" style={{ height: "min(620px, 90dvh)" }}>
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-teal-300/10 text-teal-200">
              <Cat className="h-5 w-5" />
            </span>
            <div>
              <div className="font-black">Chat with {displayName}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {chatHistory.length === 0 && (
            <p className="mt-8 text-center text-sm font-semibold text-white/42">
              Say something to Mochi.
            </p>
          )}
          {chatHistory.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm font-semibold leading-6 ${
                  msg.role === "user"
                    ? "rounded-br-sm bg-teal-300 text-black"
                    : "rounded-bl-sm bg-white/10 text-white/82"
                }`}
              >
                {msg.role === "mochi" && (
                  <Cat className="mr-1 inline h-3.5 w-3.5 text-teal-200" />
                )}
                {msg.message}
              </div>
            </div>
          ))}
          {isChatLoading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-white/10 px-3 py-2 text-sm font-semibold italic text-white/45">
                Mochi is thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 border-t border-white/10 px-3 py-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={isChatLoading}
            placeholder="Say something to Mochi..."
            className="min-w-0 flex-1 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold outline-none focus:border-teal-300/60 disabled:opacity-50 placeholder:text-white/32"
          />
          <button
            onClick={handleSend}
            disabled={isChatLoading || !input.trim()}
            className="mochi-primary-button px-4 py-2 text-sm"
          >
            <Send className="h-4 w-4" />
            Send
          </button>
        </div>

        <p className="px-4 pb-3 text-center text-xs font-semibold text-white/35">
          AI responses powered by GenLayer on-chain consensus
        </p>
      </div>
    </div>
  );
}
