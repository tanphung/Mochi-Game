"use client";

import { usePetStore } from "@/lib/store/petStore";
import { LandingPage } from "@/components/mochi/LandingPage";
import { CreatePetForm } from "@/components/mochi/CreatePetForm";
import { Dashboard } from "@/components/mochi/Dashboard";

export default function HomePage() {
  const { appPhase } = usePetStore();

  if (appPhase === "landing")    return <LandingPage />;
  if (appPhase === "create_pet") return <CreatePetForm />;
  return <Dashboard />;
}
