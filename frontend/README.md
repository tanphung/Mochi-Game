# Mochi Pet DApp

Next.js frontend for Mochi, an on-chain AI pet companion on GenLayer.

## Setup

1. Install dependencies:

**Using bun:**
```bash
bun install
```

**Using npm:**
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Configure environment variables:
   - `NEXT_PUBLIC_CONTRACT_ADDRESS` - deployed `contracts/mochi_pet.py` contract address
   - `NEXT_PUBLIC_GENLAYER_RPC_URL` - GenLayer Studio URL (default: https://studio.genlayer.com/api)

## Development

**Using bun:**
```bash
bun dev
```

**Using npm:**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Build

**Using bun:**
```bash
bun run build
bun start
```

**Using npm:**
```bash
npm run build
npm start
```

## Tech Stack

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS v4** - Styling with custom glass-morphism theme
- **genlayer-js** - GenLayer blockchain SDK
- **TanStack Query (React Query)** - Data fetching and caching
- **Radix UI** - Accessible component primitives
- **shadcn/ui** - Pre-built UI components

## Features

- **Create Pet**: Create one Mochi pet per connected wallet.
- **Care Actions**: Feed, play, sleep, and clean to update stats/EXP on-chain.
- **Chat with Mochi**: GenLayer LLM-backed pet replies stored as the latest on-chain response.
- **Inventory**: Preview avatar, room, and accessories, then save customization on-chain.
- **Cards**: Generate, mint, and download Mochi card snapshots.
