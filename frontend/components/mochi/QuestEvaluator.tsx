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
  ExternalLink,
} from "lucide-react";
import { usePetStore } from "@/lib/store/petStore";
import {
  parseQuestEvaluation,
  QuestCase,
  QuestEvidence,
  RequirementStatus,
} from "@/lib/contracts/MochiPet";
import { getGenLayerExplorerTxUrl } from "@/lib/genlayer/client";

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

const SAMPLE_QUEST_REQUIREMENTS = String.raw`Campaign: Bring Back NFTs
NFTs lost the plot with high mint prices and empty promises. Rally is doing the opposite: a free mint that rewards people who actually show up and participate.

Your goal is to post on X about why NFTs went wrong and what they should have been, then connect it to what Rally is building with the Wingston NFT

1. What Broke NFTs?

Prepare your content for submission
Description
Post your take on X: what went wrong with NFTs and what they should have been all along. Make it personal, sharp, and authentic. This is about your unique perspective on the market's past and future.

Proposed angles:

Focus on the problem of high mint prices creating barriers to entry.

Discuss how the focus on floor price and speculation killed genuine community building.

Critique the trend of projects with big promises but no real utility or follow-through.

Rules
You must mention @rallyonchain.

Your post must be an original take in any language.

Do not start the post with a mention or hashtag.

Em dashes (—) are not allowed.

Highly generic or AI-generated-looking content is not allowed.

Style
Your take should be sharp, personal, and opinionated. We're looking for genuine analysis on the state of NFTs, not generic hype. Explain why the space needs a reset and how Wingston represents that change.

Knowledge Base
What is Wingston?

Wingston is Rally's community-first, free-mint NFT collection with top-tier art and real utility. It's a product NFT, directly tied to the Rally protocol and its business model. This campaign is about sharing your take on the NFT space: what went wrong, and why a free mint that rewards participation over speculation is a healthier model. You'll then connect this perspective to Wingston.

Why Wingston is the Reset

Wingston represents a fundamental shift away from the speculative hype that dominated the last NFT cycle.

Free Mint: Access isn't determined by your ability to pay a high price. It's about participation.

Rewards Participation: The model is built to reward people who actively contribute to the ecosystem, not just those who flip for a quick profit.

Real Utility: Wingston NFTs have tangible, working utilities within the Rally protocol from day one, not just vague promises on a roadmap.

Wingston Utilities

Staking: Stake your Wingston NFT to earn RLPs (Rally Protocol's points) every day.

VIP Community: Gain access to a private, token-gated space for Wingston holders with exclusive campaigns and opportunities.

Reputation Boost: Holding a Wingston will provide a boost to your Rally Score, a reputation metric that improves your standing and earning potential within the Rally ecosystem (Rally Score is in development).

How to Get Whitelisted There are two paths to get a whitelist spot for the Wingston mint:

Existing Creators: If you are already whitelisted from previous Rally activities, you're in. New Participants: To earn a spot, you must join at least 3 Rally campaigns and rank in the weekly Top 425 on the leaderboard. Performance is key.

Talking Points

A free mint changes who an NFT is for, shifting the focus from wealth to community. Rewarding genuine participation and contribution is more sustainable than rewarding pure speculation. Wingston isn't just art; it has utilities that are already live and providing value within the Rally protocol.`;

const SAMPLE_SUBMISSION_TEXT = String.raw`What bothered me most about the last NFT cycle was not the crash.

It was the idea that anyone could buy a badge of belonging before doing anything to belong.

That reversed the social contract. The wallet arrived first. Contribution was expected later.

NFTs should have been receipts for participation: proof that you helped build something, not prepaid costumes for communities still living on a roadmap.

Wingston from @RallyOnChain puts the order back where it belongs. New participants earn whitelist access by joining at least 3 campaigns and reaching the weekly Top 425, then mint for free. Holders can also stake Wingston to earn RLPs every day.

Reply with one action that should earn someone an NFT, not one price they should pay for it.`;

export function QuestEvaluator({ onBack }: Props) {
  const {
    isEvaluating,
    questStatus,
    questTxHash,
    lastEvaluation,
    questCases,
    evaluateQuest,
    appealQuest,
    questRequirements: requirements,
    questEvidence: evidence,
    setQuestRequirements: setRequirements,
    setQuestEvidence: setEvidence,
  } = usePetStore();

  const [reqError, setReqError] = useState(false);
  const [evidenceError, setEvidenceError] = useState(false);
  const [resultDismissed, setResultDismissed] = useState(false);
  const [appealOpenId, setAppealOpenId] = useState<string | null>(null);
  const [appealEvidence, setAppealEvidence] = useState<QuestEvidence>({ url: "", note: "", text: "" });
  const [appealError, setAppealError] = useState(false);

  const updateEvidence = (i: number, patch: Partial<QuestEvidence>) =>
    setEvidence((list) => list.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  const addEvidence = () => setEvidence((list) => [...list, { url: "", note: "" }]);
  const removeEvidence = (i: number) =>
    setEvidence((list) => list.filter((_, idx) => idx !== i));
  const fillExample = () => {
    setRequirements(SAMPLE_QUEST_REQUIREMENTS);
    setEvidence([
      {
        url: "",
        note: "Example draft text for the Rally Wingston NFT quest",
        text: SAMPLE_SUBMISSION_TEXT,
      },
    ]);
    setReqError(false);
    setEvidenceError(false);
    setResultDismissed(true);
  };

  const handleEvaluate = async () => {
    const noReq = !requirements.trim();
    const filled = evidence
      .map((e) => ({
        url: e.url.trim(),
        note: e.note.trim(),
        text: e.text?.trim() || "",
      }))
      .filter((e) => e.url.length > 0 || e.text.length > 0);
    setReqError(noReq);
    setEvidenceError(filled.length === 0);
    if (noReq || filled.length === 0) return;
    setResultDismissed(false);
    await evaluateQuest(requirements.trim(), filled);
  };

  const handleAppeal = async (questId: string) => {
    const filled = {
      url: appealEvidence.url.trim(),
      note: appealEvidence.note.trim(),
      text: appealEvidence.text?.trim() || "",
    };
    const empty = filled.url.length === 0 && filled.text.length === 0;
    setAppealError(empty);
    if (empty) return;
    setResultDismissed(false);
    await appealQuest(questId, [filled]);
    setAppealOpenId(null);
    setAppealEvidence({ url: "", note: "", text: "" });
  };

  const renderCaseVerdict = (questCase: QuestCase) => {
    const result = parseQuestEvaluation(questCase.result_json);
    return {
      result,
      label: result.verdict === "passed" ? "PASSED" : "NEEDS WORK",
      cls: result.verdict === "passed"
        ? "bg-emerald-400/15 text-emerald-300"
        : "bg-amber-400/15 text-amber-300",
    };
  };

  const showResult = !!lastEvaluation && !resultDismissed && !isEvaluating;
  const questTxUrl = questTxHash ? getGenLayerExplorerTxUrl(questTxHash) : "";
  const shortTxHash = questTxHash
    ? `${questTxHash.slice(0, 10)}...${questTxHash.slice(-8)}`
    : "";
  const statusText =
    questStatus === "submitting"
      ? "Submitting transaction..."
      : questStatus === "consensus"
        ? "Waiting for GenLayer consensus..."
        : questStatus === "reading"
          ? "Reading on-chain result..."
          : "GenLayer validators are reaching consensus...";

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
        <div className="flex flex-1 flex-col gap-3 rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/80 sm:flex-row sm:items-center sm:justify-between">
          <span>Show me your quest submission — I&apos;ll check it before you submit!</span>
          <button
            type="button"
            onClick={fillExample}
            disabled={isEvaluating}
            className="mochi-ghost-button shrink-0 px-3 py-2 text-xs disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            Fill demo example
          </button>
        </div>
      </div>

      {/* Section 1 — Quest Requirements */}
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
          Add a public link, paste submission text, or provide both. Mochi can review whichever you have.
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
                <textarea
                  value={e.text || ""}
                  onChange={(ev) => updateEvidence(i, { text: ev.target.value })}
                  rows={5}
                  maxLength={2000}
                  placeholder="Submission text / context (optional): paste your draft if you do not have a public link yet."
                  className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 text-sm outline-none focus:border-teal-300/50"
                />
                <input
                  value={e.url}
                  onChange={(ev) => updateEvidence(i, { url: ev.target.value })}
                  placeholder="Public link (optional): https://..."
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm outline-none focus:border-teal-300/50"
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
                  placeholder="Short note (optional): what is this evidence?"
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
          <p className="text-xs font-bold text-rose-300">Add at least one public link or paste submission text.</p>
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
      {isEvaluating && questStatus && (
        <div className="rounded-2xl border border-teal-300/15 bg-teal-300/8 px-4 py-3 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-100">
            {statusText}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-white/45">
            Keep this page open while Mochi waits for the on-chain result.
          </p>
        </div>
      )}
      {questTxHash && (isEvaluating || showResult) && (
        <a
          href={questTxUrl}
          target="_blank"
          rel="noreferrer"
          className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-xs font-bold text-white/60 transition hover:border-teal-300/40 hover:text-teal-100"
        >
          <span className="text-teal-200">Transaction submitted</span>
          <span className="font-mono">{shortTxHash}</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
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
              {lastEvaluation.verdict === "passed" ? "✅ PASSED" : "⚠️ NEEDS WORK"}
            </span>
            <span className="text-xs font-bold text-white/50">
              Mochi&apos;s confidence: {lastEvaluation.confidence}%
            </span>
          </div>

          {lastEvaluation.summary && (
            <p className="text-sm font-semibold text-white/80">{lastEvaluation.summary}</p>
          )}

          {lastEvaluation.decision_reason && (
            <div className="rounded-xl border border-teal-300/15 bg-teal-300/10 p-3">
              <h4 className="mb-1 text-xs font-black uppercase tracking-wider text-teal-100">
                On-chain decision reason
              </h4>
              <p className="text-sm font-semibold text-white/75">{lastEvaluation.decision_reason}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Evidence", lastEvaluation.evidence_count],
              ["Met", lastEvaluation.met_count],
              ["Partial", lastEvaluation.partial_count],
              ["Missing", lastEvaluation.missing_count],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-center">
                <p className="text-[10px] font-black uppercase tracking-wider text-white/35">{label}</p>
                <p className="text-sm font-black text-teal-200">{value ?? 0}</p>
              </div>
            ))}
          </div>

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

      {questCases.length > 0 && (
        <div className="mochi-panel space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-black">Quest Case History</h3>
            <span className="text-xs font-bold text-white/40">{questCases.length} on-chain case{questCases.length === 1 ? "" : "s"}</span>
          </div>

          <div className="space-y-3">
            {questCases.map((questCase) => {
              const { result, label, cls } = renderCaseVerdict(questCase);
              const canAppeal = result.verdict === "needs_work" && Number(questCase.appeal_count) < 1;
              const isOpen = appealOpenId === questCase.quest_id;
              return (
                <div key={questCase.quest_id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-white/40">
                        {questCase.quest_id} · {questCase.status}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm font-semibold text-white/70">
                        {questCase.requirements}
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${cls}`}>{label}</span>
                  </div>

                  {result.summary && (
                    <p className="mt-3 text-xs font-semibold text-white/55">{result.summary}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold text-white/40">
                    <span>Confidence {result.confidence}%</span>
                    <span>Met {result.met_count ?? 0}</span>
                    <span>Missing {result.missing_count ?? 0}</span>
                    <span>Appeals {questCase.appeal_count}/1</span>
                  </div>

                  {canAppeal && !isOpen && (
                    <button
                      type="button"
                      onClick={() => {
                        setAppealOpenId(questCase.quest_id);
                        setAppealError(false);
                      }}
                      disabled={isEvaluating}
                      className="mochi-ghost-button mt-3 px-3 py-2 text-xs disabled:opacity-50"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Appeal with extra evidence
                    </button>
                  )}

                  {canAppeal && isOpen && (
                    <div className="mt-3 space-y-2 rounded-xl border border-white/8 bg-white/[0.03] p-3">
                      <input
                        value={appealEvidence.url}
                        onChange={(ev) => setAppealEvidence((prev) => ({ ...prev, url: ev.target.value }))}
                        placeholder="Extra public link (optional)"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs outline-none focus:border-teal-300/40"
                      />
                      <input
                        value={appealEvidence.note}
                        onChange={(ev) => setAppealEvidence((prev) => ({ ...prev, note: ev.target.value }))}
                        placeholder="Short note (optional)"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs outline-none focus:border-teal-300/40"
                      />
                      <textarea
                        value={appealEvidence.text || ""}
                        onChange={(ev) => setAppealEvidence((prev) => ({ ...prev, text: ev.target.value }))}
                        rows={2}
                        maxLength={2000}
                        placeholder="Extra submission text / context (optional)"
                        className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs outline-none focus:border-teal-300/40"
                      />
                      {appealError && (
                        <p className="text-xs font-bold text-rose-300">Add a link or paste extra text for the appeal.</p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleAppeal(questCase.quest_id)}
                          disabled={isEvaluating}
                          className="mochi-primary-button px-3 py-2 text-xs disabled:opacity-50"
                        >
                          <Sparkles className="h-4 w-4" />
                          Submit appeal
                        </button>
                        <button
                          type="button"
                          onClick={() => setAppealOpenId(null)}
                          disabled={isEvaluating}
                          className="mochi-ghost-button px-3 py-2 text-xs disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
