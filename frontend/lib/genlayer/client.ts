"use client";

// GenLayer Network Configuration (from environment variables with fallbacks)
export const GENLAYER_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "61999");
export const GENLAYER_CHAIN_ID_HEX = `0x${GENLAYER_CHAIN_ID.toString(16).toUpperCase()}`;

export const GENLAYER_NETWORK = {
  chainId: GENLAYER_CHAIN_ID_HEX,
  chainName: process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME || "GenLayer Studio",
  nativeCurrency: {
    name: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL || "GEN",
    symbol: process.env.NEXT_PUBLIC_GENLAYER_SYMBOL || "GEN",
    decimals: 18,
  },
  rpcUrls: [process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api"],
};

// Ethereum provider type from window
interface EthereumProvider {
  isMetaMask?: boolean;
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, handler: (...args: any[]) => void) => void;
  removeListener: (event: string, handler: (...args: any[]) => void) => void;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

/**
 * Get the GenLayer RPC URL from environment variables
 */
export function getStudioUrl(): string {
  return (
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api"
  );
}

/**
 * Get the contract address from environment variables
 */
export function getContractAddress(): string {
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  if (!address) {
    // Return empty string during build, error will be shown in UI during runtime
    return "";
  }
  return address;
}

// ---- Wallet discovery (EIP-6963 multi-wallet + window.ethereum fallback) ----
// EIP-6963 lets us detect ANY injected wallet (MetaMask, OKX, Coinbase, Rabby...)
// via events. This avoids the race where a wallet injects after first render,
// and removes the MetaMask-only assumption.
interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: EthereumProvider;
}

const discoveredWallets: EIP6963ProviderDetail[] = [];

function recordWallet(detail?: EIP6963ProviderDetail) {
  if (!detail?.info?.uuid) return;
  if (!discoveredWallets.some((w) => w.info.uuid === detail.info.uuid)) {
    discoveredWallets.push(detail);
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (event: any) =>
    recordWallet(event.detail)
  );
  // Ask any already-injected wallets to announce themselves.
  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

/**
 * Subscribe to wallet discovery. Fires whenever a wallet announces itself,
 * including wallets injected after the page has rendered (production race).
 * Returns an unsubscribe function.
 */
export function subscribeToWalletDiscovery(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: any) => {
    recordWallet(event.detail);
    callback();
  };
  window.addEventListener("eip6963:announceProvider", handler);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  return () => window.removeEventListener("eip6963:announceProvider", handler);
}

/**
 * Check if ANY Web3 wallet is available (not just MetaMask).
 */
export function isWalletInstalled(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.ethereum || discoveredWallets.length > 0;
}

/**
 * Get the active injected EIP-1193 provider from whichever wallet is available.
 * Prefers window.ethereum (the user's active/default wallet), then any
 * EIP-6963 announced provider.
 */
export function getEthereumProvider(): EthereumProvider | null {
  if (typeof window === "undefined") return null;
  if (window.ethereum) return window.ethereum;
  if (discoveredWallets.length > 0) return discoveredWallets[0].provider;
  return null;
}

/**
 * Request accounts from MetaMask
 * @returns Array of addresses
 */
export async function requestAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("No wallet detected");
  }

  try {
    const accounts = await provider.request({
      method: "eth_requestAccounts",
    });
    return accounts;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected the connection request");
    }
    throw new Error(`Failed to connect to MetaMask: ${error.message}`);
  }
}

/**
 * Get current MetaMask accounts without requesting permission
 * @returns Array of addresses
 */
export async function getAccounts(): Promise<string[]> {
  const provider = getEthereumProvider();

  if (!provider) {
    return [];
  }

  try {
    const accounts = await provider.request({
      method: "eth_accounts",
    });
    return accounts;
  } catch (error) {
    console.error("Error getting accounts:", error);
    return [];
  }
}

/**
 * Get the current chain ID from MetaMask
 */
export async function getCurrentChainId(): Promise<string | null> {
  const provider = getEthereumProvider();

  if (!provider) {
    return null;
  }

  try {
    const chainId = await provider.request({
      method: "eth_chainId",
    });
    return chainId;
  } catch (error) {
    console.error("Error getting chain ID:", error);
    return null;
  }
}

/**
 * Add GenLayer network to MetaMask
 */
export async function addGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("No wallet detected");
  }

  try {
    await provider.request({
      method: "wallet_addEthereumChain",
      params: [GENLAYER_NETWORK],
    });
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected adding the network");
    }
    throw new Error(`Failed to add GenLayer network: ${error.message}`);
  }
}

function isExistingNetworkError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("already exists") ||
    message.includes("already added") ||
    message.includes("already used") ||
    (message.includes("url") && message.includes("used"))
  );
}

/**
 * Switch to GenLayer network
 */
export async function switchToGenLayerNetwork(): Promise<void> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("No wallet detected");
  }

  const requestSwitch = () =>
    provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: GENLAYER_CHAIN_ID_HEX }],
    });

  try {
    await requestSwitch();
  } catch (error: any) {
    if (error.code === 4902) {
      try {
        await addGenLayerNetwork();
      } catch (addError: any) {
        if (!isExistingNetworkError(addError)) {
          throw addError;
        }
      }

      try {
        await requestSwitch();
      } catch (switchError: any) {
        throw new Error(
          `${GENLAYER_NETWORK.chainName} is already in your wallet. Please select it manually and connect again.`
        );
      }
    } else if (error.code === 4001) {
      throw new Error("User rejected switching the network");
    } else {
      throw new Error(`Failed to switch network: ${error.message}`);
    }
  }
}

/**
 * Check if we're on the GenLayer network
 */
export async function isOnGenLayerNetwork(): Promise<boolean> {
  const chainId = await getCurrentChainId();

  if (!chainId) {
    return false;
  }

  // Convert both to decimal for comparison
  const currentChainIdDecimal = parseInt(chainId, 16);
  return currentChainIdDecimal === GENLAYER_CHAIN_ID;
}

/**
 * Connect to the user's wallet and ensure we're on the GenLayer network.
 * @returns The connected address
 */
export async function connectWallet(): Promise<string> {
  if (!isWalletInstalled()) {
    throw new Error("No wallet detected");
  }

  // Request accounts
  const accounts = await requestAccounts();

  if (!accounts || accounts.length === 0) {
    throw new Error("No accounts found");
  }

  // Check and switch to GenLayer network
  const onCorrectNetwork = await isOnGenLayerNetwork();

  if (!onCorrectNetwork) {
    await switchToGenLayerNetwork();
  }

  return accounts[0];
}

/**
 * Request user to switch MetaMask account
 * Shows MetaMask account picker even if already connected
 * Uses wallet_requestPermissions to force account selection dialog
 * @returns The newly selected account address
 */
export async function switchAccount(): Promise<string> {
  const provider = getEthereumProvider();

  if (!provider) {
    throw new Error("No wallet detected");
  }

  try {
    // Request permissions - this shows account picker
    await provider.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });

    // Get the newly selected account
    const accounts = await provider.request({
      method: "eth_accounts",
    });

    if (!accounts || accounts.length === 0) {
      throw new Error("No account selected");
    }

    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("User rejected account switch");
    } else if (error.code === -32002) {
      throw new Error("Account switch request already pending");
    }
    throw new Error(`Failed to switch account: ${error.message}`);
  }
}

