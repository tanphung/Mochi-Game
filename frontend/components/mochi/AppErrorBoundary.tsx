"use client";

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("Mochi UI recovered from an error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="grid min-h-screen place-items-center bg-[#090b16] px-4 text-white">
        <div className="mochi-panel max-w-md space-y-4 p-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-400/15 text-amber-200">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-black">Mochi needs a quick refresh</h1>
            <p className="mt-2 text-sm font-semibold text-white/55">
              The page recovered from a stale browser or wallet state. Your on-chain data is safe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mochi-primary-button mx-auto px-4 py-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </button>
        </div>
      </main>
    );
  }
}
