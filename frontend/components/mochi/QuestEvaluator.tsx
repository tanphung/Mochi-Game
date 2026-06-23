"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Cat,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  FileSearch,
  ShieldCheck,
} from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import { QuestEvidence, RequirementStatus } from "@/lib/contracts/MochiPet";

interface Props {
  onBack: () => void;
}

const URL_RE = /^https?:\/\/.+/i;

const STATUS_META: Record<
  RequirementStatus,
  { icon: React.ReactNode; cls: string }
> = {
  met: { icon: <CheckCircle2 className="h-4 w-4" />, cls: "text-emerald-300" },
  partial: { icon: <AlertTriangle className="h-4 w-4" />, cls: "text-amber-300" },
  missing: { icon: <XCircle className="h-4 w-4" />, cls: "text-rose-300" },
};

export function QuestEvaluator({ onBack }: Props) {
  const {
    isEvaluating,
    lastEvaluation,
    lastEvaluationTxHash,
    evaluateQuest,
    questRequirements: requirements,
    questEvidence: evidence,
    setQuestRequirements: setRequirements,
    setQuestEvidence: setEvidence,
  } = usePetStore();

  const [reqError, setReqError] = useState(false);
  const [evidenceError, setEvidenceError] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);

  const updateEvidence = (i: number, patch: Partial<QuestEvidence>) =>
    setEvidence((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addEvidence = () => setEvidence((list) => [...list, { url: "", note: "" }]);
  const removeEvidence = (i: number) =>
    setEvidence((list) => list.filter((_, idx) => idx !== i));

  const handleEvaluate = async () => {
    const noReq = !requirements.trim();
    const filled = evidence.filter((e) => e.url.trim().length > 0);
    setReqError(noReq);
    setEvidenceError(filled.length === 0);
    if (noReq || filled.length === 0) return;
    setResultDismissed(false);
    await evaluateQuest(requirements.trim(), filled);
  };

  const showResult = !!lastEvaluation && !resultDismissed && !isEvaluating;

  return (
    <div className="mx-auto max-w-3xl space-y-4 animate-fade-in">
      <button onClick={onBack} className="mochi-ghost-button px-3 py-2 text-xs">
        <ArrowLeft className="h-4 w-4" />
        Home
      </button>

      <div className="mochi-panel flex items-center gap-4 p-4">
        <div className="mochi-logo-mark shrink-0">
          <Cat className="h-7 w-7" />
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/80">
          Show me your quest submission. I&apos;ll fetch the public evidence on-chain, ask GenLayer AI to judge it, and store the consensus result.
        </div>
      </div>

      {/* Section 1 — Quest Requirements */}
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-teal-200">
            <FileSearch className="h-4 w-4" />
            Web evidence
          </div>
          <p className="mt-1 text-xs font-semibold text-white/50">
            Contract fetches public links before the LLM verdict.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-teal-200">
            <Sparkles className="h-4 w-4" />
            AI judgment
          </div>
          <p className="mt-1 text-xs font-semibold text-white/50">
            Requirements are checked for met, partial, or missing.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-teal-200">
            <ShieldCheck className="h-4 w-4" />
            Semantic validator
          </div>
          <p className="mt-1 text-xs font-semibold text-white/50">
            Passed is accepted only when every requirement is met.
          </p>
        </div>
      </div>

      <div className="mochi-panel space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-300/15 text-sm font-black text-teal-200">
            1
          </span>
          <h3 className="text-base font-black">Quest Requirements</h3>
        </div>
        <p className="text-xs font-semibold text-white/45">
          Paste the quest description and requirements from the GenLayer portal
        </p>
        <textarea
          value={requirements}
          onChange={(e) => {
            setRequirements(e.target.value);
            if (reqError) setReqError(false);
          }}
          rows={4}
          placeholder="e.g. Write a post on X about Optimistic Democracy, at least 3 paragraphs, include a visual, use #GenLayer..."
          className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-teal-300/50"
        />
        {reqError && (
          <p className="text-xs font-bold text-rose-300">Please paste the quest requirements first!</p>
        )}
      </div>

      {/* Section 2 — Your Submission */}
      <div className="mochi-panel space-y-3 p-4">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-teal-300/15 text-sm font-black text-teal-200">
            2
          </span>
          <h3 className="text-base font-black">Your Submission</h3>
        </div>
        <p className="text-xs font-semibold text-white/45">
          Add your evidence links: X post, GitHub repo, design file, blog post...
        </p>

        <div className="space-y-3">
          {evidence.map((e, i) => {
            const invalid = e.url.trim().length > 0 && !URL_RE.test(e.url.trim());
            const unreachable = !!lastEvaluation?.unreachable.includes(e.url.trim());
            return (
              <div key={i} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-white/55">
                    Evidence {i + 1}
                  </span>
                  {evidence.length > 1 && (
                    <button
                      onClick={() => removeEvidence(i)}
                      className="grid h-7 w-7 place-items-center rounded-full text-white/40 transition hover:bg-rose-400/15 hover:text-rose-300"
                      title="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <input
                  value={e.url}
                  onChange={(ev) => updateEvidence(i, { url: ev.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-teal-300/50"
                />
                {invalid && (
                  <p className="mt-1 text-xs font-bold text-amber-300">
                    This doesn&apos;t look like a valid URL
                  </p>
                )}
                {unreachable && (
                  <p className="mt-1 text-xs font-bold text-rose-300">
                    Mochi couldn&apos;t open this link — make sure it&apos;s public
                  </p>
                )}
                <input
                  value={e.note}
                  onChange={(ev) => updateEvidence(i, { note: ev.target.value })}
                  placeholder="Short note (optional): what is this link?"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs outline-none focus:border-teal-300/40"
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={addEvidence}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/20 px-4 py-3 text-sm font-bold text-white/55 transition hover:border-teal-300/50 hover:text-teal-200"
        >
          <Plus className="h-4 w-4" />
          Add Evidence
        </button>
        {evidenceError && (
          <p className="text-xs font-bold text-rose-300">Add at least one evidence link!</p>
        )}
      </div>

      <button
        onClick={handleEvaluate}
        disabled={isEvaluating}
        className="mochi-primary-button w-full px-5 py-3 text-sm disabled:opacity-60"
      >
        {isEvaluating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Mochi is reviewing...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            Ask Mochi to Evaluate
          </>
        )}
      </button>
      {isEvaluating && (
        <p className="text-center text-[11px] font-semibold text-white/40">
          GenLayer validators are reaching consensus. This can take 15-60 seconds.
        </p>
      )}

      {/* Result */}
      {showResult && lastEvaluation && (
        <div className="mochi-panel space-y-4 p-4 animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-black ${
                lastEvaluation.verdict === "passed"
                  ? "bg-emerald-400/15 text-emerald-300"
                  : "bg-amber-400/15 text-amber-300"
              }`}
            >
              {lastEvaluation.verdict === "passed" ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  PASSED
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4" />
                  NEEDS WORK
                </>
              )}
            </span>
            <span className="text-xs font-bold text-white/50">
              Mochi&apos;s confidence: {lastEvaluation.confidence}%
            </span>
          </div>

          <div className="grid gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3 text-xs font-semibold text-white/58 sm:grid-cols-3">
            <div>
              <div className="font-black uppercase tracking-wider text-white/38">Evidence fetched</div>
              <div className="mt-1 text-white/80">
                {lastEvaluation.fetched_count}/{lastEvaluation.evidence_count} public links
              </div>
            </div>
            <div>
              <div className="font-black uppercase tracking-wider text-white/38">Validator check</div>
              <div className="mt-1 break-words text-white/80">
                {lastEvaluation.meaning_check || "semantic_result_checked"}
              </div>
            </div>
            <div>
              <div className="font-black uppercase tracking-wider text-white/38">GenLayer tx</div>
              <div className="mt-1 break-all font-mono text-[11px] text-white/80">
                {lastEvaluationTxHash ?? "confirmed"}
              </div>
            </div>
          </div>

          {lastEvaluation.summary && (
            <p className="text-sm font-semibold text-white/80">{lastEvaluation.summary}</p>
          )}

          {lastEvaluation.requirements.length > 0 && (
            <div className="space-y-2">
              {lastEvaluation.requirements.map((r, i) => {
                const meta = STATUS_META[r.status];
                return (
                  <div
                    key={i}
                    className="flex gap-2 rounded-xl border border-white/8 bg-white/[0.03] p-3"
                  >
                    <span className={`mt-0.5 shrink-0 ${meta.cls}`}>{meta.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold">{r.text}</p>
                      {r.note && <p className="text-xs font-semibold text-white/50">{r.note}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lastEvaluation.suggestions.length > 0 && (
            <div className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
              <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-white/45">
                Suggestions
              </h4>
              <ul className="list-disc space-y-1 pl-5 text-sm font-semibold text-white/70">
                {lastEvaluation.suggestions.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => setResultDismissed(true)}
            className="mochi-ghost-button w-full px-4 py-2.5 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Re-evaluate
          </button>
        </div>
      )}
    </div>
  );
}
