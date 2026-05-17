"use client";

import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionHashVariant, TransactionStatus } from "genlayer-js/types";
import { getContractAddress, getStudioUrl } from "../genlayer/client";

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
  last_mood?: string;
  minted_cards: MintedCard[];
}

export type ItemCategory = "hat" | "glasses" | "necklace" | "shirt" | "handheld";

// ── Client factory ────────────────────────────────────────────────────

function makeWalletClient(address?: string | null) {
  const config: any = { chain: studionet };
  if (address) config.account = address as `0x${string}`;
  const studioUrl = getStudioUrl();
  if (studioUrl) config.endpoint = studioUrl;
  return createClient(config);
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

async function checkReceipt(client: ReturnType<typeof createClient>, txHash: string) {
  const receipt = await waitForReadableReceipt(client, txHash);

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

  // ── write functions ───────────────────────────────────────────────

  async createPet(nickname: string): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "create_pet",
      args: [nickname],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async feed(): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "feed",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async play(): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "play",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async sleep(): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "sleep",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async clean(): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "clean",
      args: [],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async chat(message: string): Promise<string> {
    const client = makeWalletClient(this.account);
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

  async setNickname(nickname: string): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "set_nickname",
      args: [nickname],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async setPetColor(hexColor: string): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "set_pet_color",
      args: [hexColor],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async equipItem(category: ItemCategory, itemId: string): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "equip_item",
      args: [category, itemId],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async unequipItem(category: ItemCategory): Promise<void> {
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "unequip_item",
      args: [category],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }

  async setRoom(roomId: string): Promise<void> {
    const client = makeWalletClient(this.account);
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
    const client = makeWalletClient(this.account);
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
    const client = makeWalletClient(this.account);
    const txHash = await client.writeContract({
      address: this.contractAddress,
      functionName: "mint_card",
      args: [snapshot],
      value: BigInt(0),
    });
    await checkReceipt(makeReadClient(this.account), txHash);
  }
}

// ── Named exports (15 wrapper functions) ─────────────────────────────

export function createMochiPetContract(account?: string | null): MochiPetContract {
  return new MochiPetContract(account);
}

export async function getPet(account?: string): Promise<PetState> {
  return new MochiPetContract(account).getPet(account);
}

export async function hasPet(account?: string): Promise<boolean> {
  return new MochiPetContract(account).hasPet(account);
}

export async function getMintedCards(account?: string): Promise<MintedCard[]> {
  return new MochiPetContract(account).getMintedCards(account);
}

export async function createPet(account: string, nickname: string): Promise<void> {
  return new MochiPetContract(account).createPet(nickname);
}

export async function feed(account: string): Promise<void> {
  return new MochiPetContract(account).feed();
}

export async function play(account: string): Promise<void> {
  return new MochiPetContract(account).play();
}

export async function sleep(account: string): Promise<void> {
  return new MochiPetContract(account).sleep();
}

export async function clean(account: string): Promise<void> {
  return new MochiPetContract(account).clean();
}

export async function chat(account: string, message: string): Promise<string> {
  return new MochiPetContract(account).chat(message);
}

export async function setNickname(account: string, nickname: string): Promise<void> {
  return new MochiPetContract(account).setNickname(nickname);
}

export async function setPetColor(account: string, hexColor: string): Promise<void> {
  return new MochiPetContract(account).setPetColor(hexColor);
}

export async function equipItem(account: string, category: ItemCategory, itemId: string): Promise<void> {
  return new MochiPetContract(account).equipItem(category, itemId);
}

export async function unequipItem(account: string, category: ItemCategory): Promise<void> {
  return new MochiPetContract(account).unequipItem(category);
}

export async function setRoom(account: string, roomId: string): Promise<void> {
  return new MochiPetContract(account).setRoom(roomId);
}

export async function saveCustomization(
  account: string,
  args: {
    petAvatarId: string;
    roomId: string;
    equippedItems: EquippedItems;
    itemPositions: string;
  },
): Promise<void> {
  return new MochiPetContract(account).saveCustomization(args);
}

export async function mintCard(account: string, snapshot: string): Promise<void> {
  return new MochiPetContract(account).mintCard(snapshot);
}

export { MochiPetContract };
export default MochiPetContract;
