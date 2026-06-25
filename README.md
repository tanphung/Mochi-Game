# Mochi - On-chain AI Pet and Quest Evaluator on GenLayer

Mochi is a GenLayer dApp where each wallet raises one on-chain pet, sends care actions, chats with an AI companion, customizes a room, mints shareable cards, and uses a Quest Evaluator to review quest submissions before sending them to a community quest.

## Live Submission

- Live app: https://mochi-game-frontend.vercel.app
- GitHub repo: https://github.com/tanphung/Mochi-Game
- Network used by the submitted app: GenLayer Studio
- Chain ID: `61999`
- RPC URL: `https://studio.genlayer.com/api`
- Current live contract: `0xf9dE834f2eC0D555A7CA01f31E035841fB0013E5`

## Why Mochi Needs GenLayer

The trust-critical feature is the Quest Evaluator. A user pastes quest requirements plus public evidence URLs, submission text, or both, then the Intelligent Contract:

1. Fetches the public evidence from the web with `gl.nondet.web.get`.
2. Uses `gl.nondet.exec_prompt` to judge whether the evidence satisfies each requirement.
3. Normalizes the AI JSON result and stores it in `last_quest_eval` on-chain.
4. Stores each evaluation as a `QuestCase` with `quest_id`, requirements, evidence, verdict JSON, status, and appeal count.
5. Uses a custom validator function to check the meaning of the verdict, requirement statuses, count consistency, confidence bounds, and evidence metadata before accepting consensus.

Without GenLayer, this review would be a normal off-chain AI checker controlled by the app. In Mochi, the web-aware AI judgment is part of the on-chain contract flow.

## Main User Flow

1. Open the live app and connect an EVM wallet.
2. Use GenLayer Studio network settings: chain ID `61999`, RPC `https://studio.genlayer.com/api`, symbol `GEN`.
3. Create or sync a Mochi pet for the connected wallet.
4. Run on-chain care actions: feed, play, sleep, clean.
5. Chat with Mochi; the AI reply is produced through GenLayer consensus and stored as `last_response`.
6. Open the featured "Quest" tab or "Let Mochi Check Your Quest".
7. Paste quest requirements and a public evidence URL, submission text, or both. Reviewers can use "Fill demo example" to load a ready-made quest and draft submission text.
8. Submit the evaluation transaction and wait for consensus.
9. Read the stored verdict, confidence, requirement statuses, suggestions, evidence counts, and unreachable links from contract state.
10. If the verdict needs work, submit one appeal with extra evidence and review the updated `QuestCase` history.

## Contract Quality

- Contract source: `contracts/mochi_pet.py`
- Pinned GenVM runner dependency in the contract header.
- Persistent state uses GenLayer storage types such as `TreeMap`, `@allow_storage` dataclasses, and sized integers.
- Nondeterministic chat and quest evaluation run through `gl.vm.run_nondet_unsafe`.
- LLM output is parsed defensively: markdown fences are stripped, JSON is validated, field lengths are bounded, and requirement statuses are normalized.
- Quest edge-cases are handled with `UserError`: empty requirements, invalid evidence JSON, empty evidence list, empty evidence items, invalid URLs, more than five evidence items, duplicate appeals, and malformed LLM JSON.
- Each quest submission creates an on-chain `QuestCase`; each case can be appealed once with extra evidence.
- Direct tests cover pet creation, care actions, chat, customization, card minting, quest evaluation, QuestCase storage, appeal flow, semantic verdict normalization, and validation edge-cases.

## Frontend / UX

- Frontend source: `frontend/`
- Uses `genlayer-js` to read and write the deployed contract.
- Wallet connect is separated from network switching so users can enter the app even if their wallet already has a GenLayer Studio RPC entry.
- Quest Evaluator shows transaction progress, links to the submitted transaction in GenLayer Studio Explorer, waits for GenLayer consensus, and then reads the on-chain result back from the contract.
- Quest is surfaced as a highlighted dashboard tab, with a one-click demo autofill so reviewers can test the full flow without preparing their own quest text or submission draft.
- Quest history displays on-chain cases, verdicts, confidence, met/missing counts, and the one-time appeal action.
- The dashboard includes a roadmap tab showing the current live pet features and future companion/social/gameplay plans.

## Project Structure

- `contracts/mochi_pet.py` - GenLayer Intelligent Contract.
- `deploy/deployScript.ts` - GenLayer deployment script.
- `test/test_mochi_pet.py` - direct tests for contract behavior and edge-cases.
- `frontend/lib/contracts/MochiPet.ts` - typed frontend contract client.
- `frontend/lib/genlayer/client.ts` - wallet and GenLayer network configuration.
- `frontend/lib/store/petStore.tsx` - app state and contract flow orchestration.
- `frontend/components/mochi/QuestEvaluator.tsx` - quest submission and verdict UX.
- `frontend/components/mochi/RoadmapSection.tsx` - in-app roadmap UX.

## Local Setup

Install dependencies:

```shell
npm install
cd frontend
npm install
```

Create `frontend/.env`:

```shell
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CHAIN_ID=61999
NEXT_PUBLIC_GENLAYER_CHAIN_NAME=GenLayer Studio
NEXT_PUBLIC_GENLAYER_SYMBOL=GEN
NEXT_PUBLIC_CONTRACT_ADDRESS=0xf9dE834f2eC0D555A7CA01f31E035841fB0013E5
```

Run the frontend:

```shell
cd frontend
npm run dev
```

## Verification

Frontend checks:

```shell
cd frontend
npx tsc --noEmit --incremental false
npm run build
```

Contract checks:

```shell
genvm-lint check contracts/mochi_pet.py --json
pytest test/test_mochi_pet.py -v
```

Direct pytest needs the GenLayer direct-test runtime to be available locally. This repo includes `test/conftest.py` to keep direct-mode stdin cleanup compatible with Windows.

## Demo Checklist

For the final demo video:

1. Open https://mochi-game-frontend.vercel.app.
2. Connect wallet.
3. Create or sync a Mochi pet.
4. Run one care action.
5. Chat with Mochi and show the stored AI reply.
6. Open the highlighted Quest tab.
7. Click "Fill demo example", review the prefilled requirements and draft submission text, then submit.
8. Show the GenLayer transaction link, consensus loading state, final stored verdict, and Quest Case History.
9. If a verdict needs work, add extra evidence once through the appeal flow.
10. Open the Roadmap tab to show the product direction.
