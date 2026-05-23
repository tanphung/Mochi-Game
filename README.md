# Sample GenLayer project
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Discord](https://img.shields.io/badge/Discord-Join%20us-5865F2?logo=discord&logoColor=white)](https://discord.gg/8Jm4v89VAu)
[![Telegram](https://img.shields.io/badge/Telegram--T.svg?style=social&logo=telegram)](https://t.me/genlayer)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/yeagerai.svg?style=social&label=Follow%20%40GenLayer)](https://x.com/GenLayer)
[![GitHub star chart](https://img.shields.io/github/stars/yeagerai/genlayer-project-boilerplate?style=social)](https://star-history.com/#yeagerai/genlayer-js)

## 👀 About
This project is **Mochi** — a GenLayer intelligent-contract dApp where each wallet raises an on-chain AI pet companion: feed/play/clean it, chat with it (powered by an on-chain LLM), customize its look, and mint shareable cards.

## 📦 What's included
- Basic requirements to deploy and test your intelligent contracts locally
- Configuration file template
<!-- - Test functions to write complete end-to-end tests -->
- An intelligent contract for the Mochi pet (`MochiPet`)
- Example end-to-end tests for the contract provided
- A production-ready Next.js 15 frontend with TypeScript, TanStack Query, and Radix UI

## 🛠️ Requirements
- A running GenLayer Studio (Install from [Docs](https://docs.genlayer.com/developers/intelligent-contracts/tooling-setup#using-the-genlayer-studio) or work with the hosted version of [GenLayer Studio](https://studio.genlayer.com/)). If you are working locally, this repository code does not need to be located in the same directory as the Genlayer Studio.
- [GenLayer CLI](https://github.com/genlayerlabs/genlayer-cli) globally installed. To install or update the GenLayer CLI run `npm install -g genlayer`

## 🚀 Steps to run this example

### 1. Deploy the contract
   Deploy the contract from `/contracts/mochi_pet.py` using the GenLayer CLI:
   1. Choose the network that you want to use (studionet, localnet, or tesnet-*): `genlayer network`
   2. Execute the deploy command `genlayer deploy`. This command is going to execute the deploy script located in `/deploy/deployScript.ts`

### 2. Setup the frontend environment
  1. All the content of the dApp is located in the `/frontend` folder.
  2. Copy the `.env.example` file in the `frontend` folder and rename it to `.env`, then fill in the values for your configuration. The provided NEXT_PUBLIC_GENLAYER_RPC_URL value is the backend of the hosted GenLayer Studio.
  3. Add the deployed contract address to the `/frontend/.env` under the variable `NEXT_PUBLIC_CONTRACT_ADDRESS`

### 4. Run the frontend Next.js app
   Execute the following commands in your terminal:

   **Using bun:**
   ```shell
   cd frontend
   bun install
   bun dev
   ```

   **Using npm:**
   ```shell
   cd frontend
   npm install
   npm run dev
   ```

   The terminal should display a link to access your frontend app (usually at <http://localhost:3000/>).
   For more information on the code see [GenLayerJS](https://github.com/yeagerai/genlayer-js).
   
### 5. Test contracts
1. Install the Python packages listed in the `requirements.txt` file in a virtual environment.
2. Make sure your GenLayer Studio is running. Then execute the following command in your terminal:
   ```shell
   gltest
   ```

## 🐾 How the Mochi Contract Works

The `MochiPet` contract lets each wallet raise one on-chain AI pet. Here's a breakdown of its main functionalities:

1. Creating a pet:
   - A user calls `create_pet` once per address to mint their Mochi with starting stats.

2. Caring actions:
   - `feed`, `play`, `sleep`, and `clean` adjust the pet's stats (hunger, energy, cleanliness, happiness) and grant EXP, which drives leveling up (levels 1–20).

3. Chatting (AI / non-deterministic):
   - `chat` sends the owner's message to an on-chain LLM (`gl.nondet.exec_prompt`) with a custom leader/validator equivalence check. User input is sanitized to mitigate prompt injection.

4. Customization:
   - `set_pet_color`, `equip_item` / `unequip_item`, `set_room`, and `save_customization` persist the pet's look (avatar, color, equipped items, room, item positions).

5. Cards:
   - `mint_card` stores a shareable snapshot card; `get_minted_cards` lists them.

State is stored using GenLayer storage types (`TreeMap`, `@allow_storage` dataclasses, `u32`).

## 🧪 Tests

This project includes tests for the contract (see the `/test` folder). With the GenLayer Studio running, run them using the `gltest` command (or `pytest`) as mentioned in the "Steps to run this example" section.


## 💬 Community
Connect with the GenLayer community to discuss, collaborate, and share insights:
- **[Discord Channel](https://discord.gg/8Jm4v89VAu)**: Our primary hub for discussions, support, and announcements.
- **[Telegram Group](https://t.me/genlayer)**: For more informal chats and quick updates.

Your continuous feedback drives better product development. Please engage with us regularly to test, discuss, and improve GenLayer.

## 📖 Documentation
For detailed information on how to use GenLayerJS SDK, please refer to our [documentation](https://docs.genlayer.com/).

## 📜 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
