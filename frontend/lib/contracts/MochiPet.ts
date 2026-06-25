"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import { parseEventLogs } from "viem";
import {
  getContractAddress,
  getStudioUrl,
  getEthereumProvider,
  isOnGenLayerNetwork,
  switchToGenLayerNetwork,
} from "../genlayer/client";

// ── Types ─────────────────────────────────────────────────────────────

export interface PetStats {
  hunger: number;
  energy: number;
  cleanliness: number;
  happiness: number;
}

export interface EquippedItems {
  hat: string;
  glasses: string;
  necklace: string;
  shirt: string;
  handheld: string;
}

export interface MintedCard {
  card_id: string;
  snapshot: string;
  minted_at: string;
  level_at_mint: number;
}

export interface PetState {
  name: string;
  nickname: string;
  level: number;
  exp: number;
  stats: PetStats;
  pet_color: string;
  pet_avatar_id?: string;
  equipped_items: EquippedItems;
  room_id: string;
  item_positions?: string;
  last_response: string;
  last_quest_eval?: string;
  last_mood?: string;
  minted_cards: MintedCard[];
}

export type ItemCategory = "hat" | "glasses" | "necklace" | "shirt" | "handheld";

// ── Quest Evaluator ─────────────────────────────────────────────────────

export interface QuestEvidence {
  url: string;
  note: string;
  text?: string;
}

export type RequirementStatus = "met" | "partial" | "missing";

export interface QuestRequirementResult {
  text: string;
  status: RequirementStatus;
  note: string;
}

export interface QuestEvaluation {
  summary: string;
  decision_reason?: string;
  verdict: "passed" | "needs_work";
  confidence: number; // 0-100
  requirements: QuestRequirementResult[];
  suggestions: string[];
  unreachable: string[]; // URLs the AI could not open
  checked_urls?: string[];
  evidence_count?: number;
  fetched_count?: number;
  met_count?: number;
  partial_count?: number;
  missing_count?: number;
  mode?: string;
}

export interface QuestCase {
  quest_id: string;
  owner_hex: string;
  requirements: string;
  evidence_json: string;
  result_json: string;
  status: "evaluated" | "appealed" | string;
  appeal_count: number;
  created_at: string;
}

// Defensive parser for the LLM JSON result (handles fences, key variants, scales).
export function parseQuestEvaluation(raw: string): QuestEvaluation {
  const fallback: QuestEvaluation = {
    summary: "",
    verdict: "needs_work",
    confidence: 0,
    requirements: [],
    suggestions: [],
    unreachable: [],
  };
  if (!raw || typeof raw !== "string") return fallback;

  let text = raw.trim();
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) text = fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) text = text.slice(start, end + 1);

  let obj: any;
  try {
    obj = JSON.parse(text);
  } catch {
    return fallback;
  }
  if (!obj || typeof obj !== "object") return fallback;

  const verdictRaw = String(obj.verdict ?? obj.result ?? "").toLowerCase();
  const verdict: QuestEvaluation["verdict"] = verdictRaw.includes("pass") ? "passed" : "needs_work";

  let confidence = Number(obj.confidence ?? obj.score ?? 0);
  if (!Number.isFinite(confidence)) confidence = 0;
  if (confidence > 0 && confidence <= 1) confidence = confidence * 100; // 0-1 scale
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  const normStatus = (s: unknown): RequirementStatus => {
    const v = String(s ?? "").toLowerCase();
    if (v.startsWith("met") || v === "pass" || v === "ok" || v === "yes") return "met";
    if (v.startsWith("part")) return "partial";
    return "missing";
  };

  const reqSource = Array.isArray(obj.requirements)
    ? obj.requirements
    : Array.isArray(obj.checklist)
      ? obj.checklist
      : [];
  const requirements: QuestRequirementResult[] = reqSource
    .map((r: any) => ({
      text: String(r?.text ?? r?.requirement ?? r?.name ?? ""),
      status: normStatus(r?.status ?? r?.result),
      note: String(r?.note ?? r?.detail ?? r?.reason ?? ""),
    }))
    .filter((r: QuestRequirementResult) => r.text.trim().length > 0);

  const toStringArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.map((x) => String(x)).filter((s) => s.trim().length > 0) : [];

  const toNumber = (v: unknown): number | undefined => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  return {
    summary: String(obj.summary ?? obj.message ?? ""),
    decision_reason: String(obj.decision_reason ?? obj.reason ?? ""),
    verdict,
    confidence,
    requirements,
    suggestions: toStringArray(obj.suggestions ?? obj.improvements),
    unreachable: toStringArray(obj.unreachable ?? obj.unreachable_urls ?? obj.failed_urls),
    checked_urls: toStringArray(obj.checked_urls ?? obj.checkedUrls),
    evidence_count: toNumber(obj.evidence_count ?? obj.evidenceCount),
    fetched_count: toNumber(obj.fetched_count ?? obj.fetchedCount),
    met_count: toNumber(obj.met_count ?? obj.metCount),
    partial_count: toNumber(obj.partial_count ?? obj.partialCount),
    missing_count: toNumber(obj.missing_count ?? obj.missingCount),
    mode: typeof obj.mode === "string" ? obj.mode : undefined,
  };
}

function unwrapResult(value: unknown): unknown {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return record.value ?? record.result ?? record.data ?? record.calldata ?? value;
  }
  return value;
}

function normalizeQuestCase(value: unknown): QuestCase | null {
  const raw = unwrapResult(value);
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const questId = String(record.quest_id ?? record.questId ?? "");
  if (!questId.trim()) return null;
  return {
    quest_id: questId,
    owner_hex: String(record.owner_hex ?? record.ownerHex ?? ""),
    requirements: String(record.requirements ?? ""),
    evidence_json: String(record.evidence_json ?? record.evidenceJson ?? "[]"),
    result_json: String(record.result_json ?? record.resultJson ?? ""),
    status: String(record.status ?? "evaluated"),
    appeal_count: Number(record.appeal_count ?? record.appealCount ?? 0) || 0,
    created_at: String(record.created_at ?? record.createdAt ?? ""),
  };
}

function normalizeQuestCases(value: unknown): QuestCase[] {
  const raw = unwrapResult(value);
  const list = Array.isArray(raw) ? raw : [];
  return list
    .map(normalizeQuestCase)
    .filter((entry): entry is QuestCase => entry !== null)
    .reverse();
}

// ── Client factory ────────────────────────────────────────────────────

function makeWalletClient(address?: string | null) {
  const config: any = { chain: studionet };
  if (address) config.account = address as `0x${string}`;
  const studioUrl = getStudioUrl();
  if (studioUrl) config.endpoint = studioUrl;
  // Route signing (eth_*) to whichever wallet the user actually has
  // (OKX, MetaMask, Coinbase...). genlayer-js uses config.provider, falling
  // back to window.ethereum only if omitted.
  const provider = getEthereumProvider();
  if (provider) config.provider = provider;
  return createClient(config);
}

async function ensureWalletOnGenLayerNetwork() {
  if (typeof window === "undefined") return;

  const onGenLayer = await isOnGenLayerNetwork();
  if (onGenLayer) return;

  await switchToGenLayerNetwork();

  const switched = await isOnGenLayerNetwork();
  if (!switched) {
    throw new Error("Please switch your wallet to GenLayer Studio before signing.");
  }
}

async function makeWriteClient(address?: string | null) {
  await ensureWalletOnGenLayerNetwork();
  return makeWalletClient(address);
}

function makeReadClient(address?: string | null) {
  const config: any = { chain: studionet };
  if (address) config.account = { address: address as `0x${string}` };
  const studioUrl = getStudioUrl();
  if (studioUrl) config.endpoint = studioUrl;
  return createClient(config);
}

const RECEIPT_RETRIES = 200;
const RECEIPT_INTERVAL_MS = 3000;

const sleepMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isReceiptLookupPending(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const normalized = message.toLowerCase();
  return (
    normalized.includes("requested resource not found") ||
    normalized.includes("transaction not found") ||
    normalized.includes("not found") ||
    normalized.includes("transaction status is not")
  );
}

async function waitForReadableReceipt(client: ReturnType<typeof createClient>, txHash: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < RECEIPT_RETRIES; attempt += 1) {
    try {
      return await client.waitForTransactionReceipt({
        hash: txHash as any,
        status: TransactionStatus.ACCEPTED,
        retries: 0,
        interval: RECEIPT_INTERVAL_MS,
        fullTransaction: true,
      } as any);
    } catch (err) {
      lastError = err;
      if (!isReceiptLookupPending(err)) {
        throw err;
      }
      await sleepMs(RECEIPT_INTERVAL_MS);
    }
  }

  const waitedSeconds = Math.round((RECEIPT_RETRIES * RECEIPT_INTERVAL_MS) / 1000);
  const detail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(
    `Transaction was submitted, but GenLayer RPC did not expose the transaction receipt within ${waitedSeconds} seconds.${detail}`,
  );
}

function readNewTransactionId(client: ReturnType<typeof createClient>, walletReceipt: any): string | null {
  const consensusAbi = (client as any).chain?.consensusMainContract?.abi;
  if (!consensusAbi || !Array.isArray(walletReceipt?.logs)) return null;

  const events = parseEventLogs({
    abi: consensusAbi,
    eventName: "NewTransaction",
    logs: walletReceipt.logs,
  } as any) as { args?: { txId?: string } }[];

  return events[0]?.args?.txId ?? null;
}

async function resolveConsensusTxHash(client: ReturnType<typeof createClient>, txHash: string) {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < RECEIPT_RETRIES; attempt += 1) {
    try {
      const walletReceipt = await (client as any).getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });
      if (!walletReceipt) {
        throw new Error("Transaction not found");
      }
      const consensusTxId = readNewTransactionId(client, walletReceipt);
      if (consensusTxId) return consensusTxId;
      throw new Error("Wallet transaction was mined, but no GenLayer NewTransaction event was found.");
    } catch (err) {
      lastError = err;
      if (!isReceiptLookupPending(err)) {
        throw err;
      }
    }

    try {
      await client.getTransaction({ hash: txHash as any });
      return txHash;
    } catch (err) {
      lastError = err;
      if (!isReceiptLookupPending(err)) {
        throw err;
      }
    }

    await sleepMs(RECEIPT_INTERVAL_MS);
  }

  const waitedSeconds = Math.round((RECEIPT_RETRIES * RECEIPT_INTERVAL_MS) / 1000);
  const detail = lastError instanceof Error ? ` Last error: ${lastError.message}` : "";
  throw new Error(
    `Transaction was submitted, but the GenLayer transaction id was not readable within ${waitedSeconds} seconds.${detail}`,
  );
}

async function checkReceipt(client: ReturnType<typeof createClient>, txHash: string) {
  const consensusTxHash = await resolveConsensusTxHash(client, txHash);
  const receipt = await waitForReadableReceipt(client, consensusTxHash);

  const raw = receipt as any;
  const statusNameByNumber: Record<string, string> = {
    "5": "ACCEPTED",
    "6": "UNDETERMINED",
    "7": "FINALIZED",
    "8": "CANCELED",
    "12": "VALIDATORS_TIMEOUT",
    "13": "LEADER_TIMEOUT",
  };
  const statusName = String(
    raw.statusName ??
      raw.status_name ??
      statusNameByNumber[String(raw.status)] ??
      "",
  ).toUpperCase();

  if (
    statusName === "UNDETERMINED" ||
    statusName === "CANCELED" ||
    statusName === "VALIDATORS_TIMEOUT" ||
    statusName === "LEADER_TIMEOUT"
  ) {
    throw new Error(`Transaction did not complete successfully: ${statusName}`);
  }

  const resultNameByNumber: Record<string, string> = {
    "0": "IDLE",
    "1": "AGREE",
    "2": "DISAGREE",
    "3": "TIMEOUT",
    "4": "DETERMINISTIC_VIOLATION",
    "5": "NO_MAJORITY",
    "6": "MAJORITY_AGREE",
    "7": "MAJORITY_DISAGREE",
  };
  const resultName = String(
    raw.result_name ??
      raw.resultName ??
      resultNameByNumber[String(raw.result)] ??
      "",
  ).toUpperCase();

  if (
    resultName === "DISAGREE" ||
    resultName === "TIMEOUT" ||
    resultName === "DETERMINISTIC_VIOLATION" ||
    resultName === "NO_MAJORITY" ||
    resultName === "MAJORITY_DISAGREE"
  ) {
    throw new Error(`Transaction failed: ${resultName}`);
  }

  if (resultName === "AGREE" || resultName === "MAJORITY_AGREE" || resultName === "SUCCESS") {
    return receipt;
  }

  const isFailureResult = (value: unknown) => {
    if (!value) return false;
    const normalized = String(value).trim().toUpperCase();
    return (
      normalized.includes("ERROR") ||
      normalized.includes("FAIL") ||
      normalized.includes("REVERT") ||
      normalized.includes("EXCEPTION") ||
      normalized.includes("TIMEOUT") ||
      normalized.includes("DETERMINISTIC_VIOLATION") ||
      normalized.includes("NO_MAJORITY") ||
      normalized.includes("DISAGREE")
    );
  };

  const isQuorumCancellation = (entry: any) => {
    const errorCode = String(entry?.genvm_result?.error_code ?? "").toUpperCase();
    const stderr = String(entry?.genvm_result?.stderr ?? "").toUpperCase();
    const causes = entry?.genvm_result?.raw_error?.causes;
    return (
      errorCode === "CONSENSUS_VALIDATOR_QUORUM_REACHED" ||
      stderr.includes("VALIDATOR EXECUTION CANCELLED AFTER QUORUM") ||
      (Array.isArray(causes) && causes.some((cause) => String(cause).toUpperCase() === "VALIDATOR_QUORUM_REACHED"))
    );
  };

  const executionResult =
    raw.txExecutionResultName ??
    raw.tx_execution_result_name ??
    raw.executionResultName ??
    raw.execution_result_name ??
    raw.executionResult?.name;

  if (isFailureResult(executionResult)) {
    throw new Error(`Transaction failed: ${executionResult}`);
  }

  if (raw.executionResult?.error) {
    throw new Error(`Transaction failed: ${raw.executionResult.error}`);
  }

  const leaderReceipt = raw.consensus_data?.leader_receipt;
  const leaderReceipts = Array.isArray(leaderReceipt)
    ? leaderReceipt
    : leaderReceipt
      ? [leaderReceipt]
      : [];

  for (const leader of leaderReceipts) {
    if (isQuorumCancellation(leader)) {
      continue;
    }

    if (leader?.error) {
      throw new Error(`Transaction failed: ${leader.error}`);
    }

    const leaderResult = leader?.execution_result ?? leader?.genvm_result;
    if (isFailureResult(leaderResult)) {
      throw new Error(`Transaction failed: ${leaderResult}`);
    }
  }

  return receipt;
}

function normalizeBooleanResult(result: unknown): boolean {
  if (typeof result === "boolean") return result;
  if (typeof result === "string") return result.toLowerCase() === "true";
  if (typeof result === "number") return result !== 0;
  if (result && typeof result === "object") {
    const value = (result as { value?: unknown; result?: unknown; data?: unknown }).value ??
      (result as { result?: unknown }).result ??
      (result as { data?: unknown }).data;
    if (value !== undefined) return normalizeBooleanResult(value);
  }
  return false;
}

// ── MochiPet contract class ───────────────────────────────────────────

class MochiPetContract {
  private contractAddress: `0x${string}`;
  private account: string | null;

  constructor(account?: string | null) {
    this.contractAddress = getContractAddress() as `0x${string}`;
    this.account = account ?? null;
  }

  updateAccount(account: string | null): void {
    this.account = account;
  }

  // ── read functions ────────────────────────────────────────────────

  async getPet(callerAddress?: string): Promise<PetState> {
    const client = makeReadClient(callerAddress ?? this.account);
    const result = await client.readContract({
      address: this.contractAddress,
      functionName: "get_pet",
      args: [],
      transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
      jsonSafeReturn: true,
    });
    return result as unknown as PetState;
  }

  async hasPet(callerAddress?: string): Promise<boolean> {
    const client = makeReadClient(callerAddress ?? this.account);
    const result = await client.readContract({
      address: this.contractAddress,
      functionName: "has_pet",
      args: [],
      transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
      jsonSafeReturn: true,
    });
    return normalizeBooleanResult(result);
  }

  async getMintedCards(callerAddress?: string): Promise<MintedCard[]> {
    const client = makeReadClient(callerAddress ?? this.account);
    const result = await client.readContract({
      address: this.contractAddress,
      functionName: "get_minted_cards",
      args: [],
      transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
      jsonSafeReturn: true,
    });
    return (result as unknown as MintedCard[]) ?? [];
  }

  async getQuestCases(callerAddress?: string): Promise<QuestCase[]> {
    const client = makeReadClient(callerAddress ?? this.account);
    const result = await client.readContract({
      address: this.contractAddress,
      functionName: "get_quest_cases",
      args: [],
      transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
      jsonSafeReturn: true,
    });
    return normalizeQuestCases(result);
  }

  async getQuestCase(questId: string, callerAddress?: string): Promise<QuestCase | null> {
    const client = makeReadClient(callerAddress ?? this.account);
    const result = await client.readContract({
      address: this.contractAddress,
      functionName: "get_quest_case",
      args: [questId],
      transactionHashVariant: TransactionHashVariant.LATEST_NONFINAL,
      jsonSafeReturn: true,
    });
    return normalizeQuestCase(result);
  }

  // ── write functions ───────────────────────────────────────────────

  async createPet(nickname: string): Promise<void> {
    const client = await makeWriteClient(this.account);
    // Submit transaction — wallet signs here
    await client.writeContract({
      address: this.contractAddress,
      functionName: "create_pet",
      args: [nickname],
      value: BigInt(0),
    });
    // Poll hasPet until GenLayer validators confirm (up to ~3 minutes)
    const MAX_ATTEMPTS = 60;
    const POLL_INTERVAL = 3000;
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await sleepMs(POLL_INTERVAL);
      try {
        const has = await this.hasPet(this.account ?? undefined);
        if (has) return;
      } catch {
        // Ignore read errors during polling, keep trying
      }
    }
    throw new Error(
      "Transaction was submitted but pet creation timed out after 3 minutes. " +
      "Please refresh the page — your pet may already be created.",
    );
  }

  async feed(): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "feed",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async play(): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "play",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async sleep(): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "sleep",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async clean(): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "clean",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async chat(message: string): Promise<string> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "chat",
      args: [message],
      value: BigInt(0),
    });
    try {
      await checkReceipt(makeReadClient(this.account), txHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${message} | tx: ${txHash}`);
    }
    return txHash;
  }

  async evaluateQuest(
    requirements: string,
    evidence: QuestEvidence[],
    options?: { onTxHash?: (txHash: string) => void },
  ): Promise<string> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "evaluate_quest",
      args: [requirements, JSON.stringify(evidence)],
      value: BigInt(0),
    });
    options?.onTxHash?.(txHash);
    try {
      await checkReceipt(makeReadClient(this.account), txHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${message} | tx: ${txHash}`);
    }
    return txHash;
  }

  async appealQuest(
    questId: string,
    extraEvidence: QuestEvidence[],
    options?: { onTxHash?: (txHash: string) => void },
  ): Promise<string> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "appeal_quest",
      args: [questId, JSON.stringify(extraEvidence)],
      value: BigInt(0),
    });
    options?.onTxHash?.(txHash);
    try {
      await checkReceipt(makeReadClient(this.account), txHash);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`${message} | tx: ${txHash}`);
    }
    return txHash;
  }

  async setNickname(nickname: string): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "set_nickname",
      args: [nickname],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async equipItem(category: ItemCategory, itemId: string): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "equip_item",
      args: [category, itemId],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async unequipItem(category: ItemCategory): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "unequip_item",
      args: [category],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async setRoom(roomId: string): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "set_room",
      args: [roomId],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async saveCustomization(args: {
    petAvatarId: string;
    roomId: string;
    equippedItems: EquippedItems;
    itemPositions: string;
  }): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "save_customization",
      args: [
        args.petAvatarId,
        args.roomId,
        args.equippedItems.hat,
        args.equippedItems.glasses,
        args.equippedItems.necklace,
        args.equippedItems.shirt,
        args.equippedItems.handheld,
        args.itemPositions,
      ],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async mintCard(snapshot: string): Promise<void> {
    const client = await makeWriteClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "mint_card",
      args: [snapshot],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }
}

// ── Factory ──────────────────────────────────────────────────────────
// The store uses createMochiPetContract(account).<method>() directly.

export function createMochiPetContract(account?: string | null): MochiPetContract {
  return new MochiPetContract(account);
}

export { MochiPetContract };
export default MochiPetContract;
