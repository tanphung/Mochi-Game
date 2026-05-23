"use client";

import { useState } from "react";
import { Cat, LogOut, Sparkles } from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { useWallet } from "@/lib/genlayer/WalletProvider";

export function CreatePetForm() {
  const { createPet, isLoading } = usePetStore();
  const { address, disconnectWallet } = useWallet();
  const [nickname, setNickname] = useState("");

  const short = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";

  const handleCreate = async () => {
    try {
      await createPet(nickname.trim());
    } catch {
      // error already toasted inside createPet
    }
  };

  return (
    <div className="mochi-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="mochi-logo-mark">
            <Cat className="h-6 w-6" />
          </div>
          <div>
            <div className="text-lg font-black leading-none">Mochi</div>
            <div className="text-[10px] font-bold text-white/45">Pet setup</div>
          </div>
        </div>

        <div className="mochi-card p-7">
          <div className="text-center">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-teal-300/10 text-teal-200 shadow-[0_0_54px_rgba(45,212,191,0.18)]">
              <Cat className="h-12 w-12" />
            </div>
            <h1 className="mt-5 text-3xl font-black">Create Your Mochi</h1>
            <p className="mt-2 text-sm font-mono text-white/50">{short}</p>
          </div>

          <div className="mt-7 space-y-2">
            <label className="text-sm font-bold text-white/68">
              Nickname optional
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Give Mochi a nickname..."
              maxLength={32}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-semibold outline-none transition focus:border-teal-300/50 placeholder:text-white/32"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={isLoading}
            className="mochi-primary-button mt-6 w-full px-5 py-3 text-sm"
          >
            <Sparkles className="h-4 w-4" />
            {isLoading ? "Creating..." : "Create Pet"}
          </button>

          <button
            onClick={disconnectWallet}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold text-white/52 transition hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Disconnect wallet
          </button>
        </div>
      </div>
    </div>
  );
}
