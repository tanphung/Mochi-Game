# GenLayer Skills

**Source:** https://skills.genlayer.com/

**Tagline:** AI-native procedures for intelligent contract development and validator operations

**Description:** Claude Code plugin marketplace for GenLayer. Skills for writing intelligent contracts, running validators, and shipping code.

---

## Notation / Placeholder Convention

Throughout this document, text wrapped in angle brackets (e.g. `<file>`, `<addr>`, `<method>`, `<txHash>`, `<address>`, `<view_method>`, `<owner>`, `<operator-address>`, `<validator-address>`, `<amount>`) represents a **placeholder** — a value that the user must substitute with a real argument when running the command. The angle brackets themselves are NOT part of the command and should not be typed literally.

**Examples of placeholder substitution:**

| Documented form (placeholder) | Real example (after substitution) |
|-------------------------------|-----------------------------------|
| `genvm-lint check <file>` | `genvm-lint check my_contract.py` |
| `genvm-lint typecheck <file>` | `genvm-lint typecheck contracts/voting.py` |
| `genlayer call <addr> <method>` | `genlayer call 0xAbCd...1234 get_balance` |
| `genlayer write <addr> <method>` | `genlayer write 0xAbCd...1234 transfer` |
| `genlayer receipt <txHash>` | `genlayer receipt 0xf00d...beef` |
| `genlayer staking set-identity <validator-address> --account "<owner>"` | `genlayer staking set-identity 0xVal...01 --account "alice"` |

This is a standard CLI documentation convention. Note: on the rendered website (skills.genlayer.com), some browsers may visually hide these `<...>` placeholders because the page's markdown renderer interprets them as HTML tags. The angle-bracket placeholders ARE present in the canonical source data and must be honored when interpreting commands.

---

## Installation

**Step 1 — Add the marketplace:**

```
/plugin marketplace add genlayerlabs
```

(Underlying command: `/plugin marketplace add genlayerlabs/claude-code-skills`)

**Step 2 — Install a plugin:**

```
/plugin install genlayer-dev
```

or

```
/plugin install genlayernode
```

(Underlying commands: `/plugin install genlayer-dev@genlayerlabs` or `/plugin install genlayernode@genlayerlabs`)

---

# Build

## Write Contract

**Badge:** plugin

**Short description:** Production-quality intelligent contracts with equivalence principle guidance

The core skill for building GenLayer intelligent contracts — Python classes that run on GenVM with built-in AI capabilities.

### What It Covers

- **Equivalence Principle** — The critical decision: `strict_eq` for deterministic calls, custom validator functions for LLM/web operations
- **Runner Dependencies** — Pin `py-genlayer` hashes instead of using `test`, `latest`, or unversioned aliases
- **Storage Rules** — `TreeMap` instead of dict, `DynArray` instead of list, `u256` for money
- **LLM Resilience** — Defensive parsing, key variation handling, aggressive coercion, JSON response format
- **Cross-Contract Calls** — Synchronous reads, async writes with `emit()`, factory patterns
- **Error Classification** — `[EXPECTED]`, `[EXTERNAL]`, `[TRANSIENT]`, `[LLM_ERROR]` each with distinct validator behavior

### Contract Skeleton

```python
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *

@gl.contract
class MyContract:
    owner: Address
    items: TreeMap[str, Item]

    def __init__(self):
        self.owner = gl.message.sender_account

    @gl.public.view
    def get_item(self, item_id: str) -> dict:
        return {"id": item_id}

    @gl.public.write
    def set_item(self, item_id: str, value: str):
        if gl.message.sender_account != self.owner:
            raise gl.UserError("Only owner")
```

### Runner Dependencies

Always pin a specific runner hash in the contract's first line. Do not use `test`, `latest`, or an unversioned runner alias.

| Contract Type | Dependency |
|---------------|------------|
| Single-file Python | `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` |
| Multi-file Python package | `py-genlayer-multi:06zyvrlivjga0d5jlpdbprksc0pa6jmllxvp8s20hq1l512vh5yk` |
| Embeddings / semantic search | Add `py-lib-genlayer-embeddings:0bmbm3cyfwxsyh454z53vxqjf47wz2q7smcqp1q4g4a6k2kidnyk` before `py-genlayer` in a `Seq` block |

### Anti-Patterns

- `test`, `latest`, or unversioned runner dependencies — pin the documented runner hash
- `strict_eq()` for LLM calls — LLM outputs are non-deterministic
- `dict` / `list` for storage — use `TreeMap` / `DynArray`
- `float` for money — use atto-scale `u256`
- Inserting fields in middle of dataclass — always append at END

> Part of the **genlayer-dev** plugin. Install with `/plugin install genlayer-dev@genlayerlabs`

---

## GenVM Lint

**Badge:** plugin

**Short description:** Validate contracts for safety, correctness, and SDK compliance

Static analysis and validation for GenLayer intelligent contracts. Always lint before testing.

### Commands

| Command | What It Does | Speed |
|---------|-------------|-------|
| `genvm-lint check <file>` | Lint + validate (recommended) | ~250ms |
| `genvm-lint lint <file>` | AST checks only | ~50ms |
| `genvm-lint validate <file>` | SDK semantic checks | ~200ms |
| `genvm-lint schema <file>` | Extract ABI | ~100ms |
| `genvm-lint typecheck <file>` | Pyright/Pylance type checking | ~1s |

### What It Catches

- **Forbidden imports**: `os`, `sys`, `subprocess`, `random`
- **Non-deterministic patterns**: bare float operations
- **Type validity**: `TreeMap`, `DynArray`, `Address` usage
- **Decorator correctness**: `@gl.public.view`, `@gl.public.write`
- **Storage field types**: no `dict`/`list` in state

### Agent Workflow

```
1. Run check with --json
2. Parse errors
3. Fix iteratively
4. Re-run until ok=true
```

### Exit Codes

- **0** — All checks passed
- **1** — Lint or validation errors
- **2** — Contract file not found
- **3** — SDK download failed

> Install: `pip install genvm-linter`

---

## Direct Tests

**Badge:** plugin

**Short description:** Fast in-memory tests — ~30ms per test, no server required

Fast, in-memory tests for intelligent contracts. No server, no Docker, no consensus — just pure logic testing at ~30ms per test.

### Running Tests

```bash
pytest tests/direct/ -v
pytest tests/direct/test_specific.py::test_one -v
```

### Basic Pattern

```python
def test_set_and_get(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy("contracts/my_contract.py")
    direct_vm.sender = direct_alice
    contract.set_data("hello")
    result = contract.get_data(direct_alice)
    assert result == "hello"
```

### Fixtures

| Fixture | Purpose |
|---------|---------|
| `direct_vm` | VMContext with cheatcodes |
| `direct_deploy` | Deploy contract function |
| `direct_alice`, `direct_bob`, `direct_charlie` | Test addresses |
| `direct_owner` | Owner address |

### Cheatcodes

- `direct_vm.sender = address` — Set transaction sender
- `direct_vm.expect_revert("msg")` — Expect a revert
- `direct_vm.prank(address)` — Temporary sender change
- `direct_vm.snapshot()` / `revert(id)` — State snapshots
- `direct_vm.warp("2024-06-01T12:00:00Z")` — Time travel
- `direct_vm.mock_web(regex, response)` — Mock HTTP calls
- `direct_vm.mock_llm(regex, response)` — Mock LLM calls

### Important

Direct mode runs the **leader function only**. Validator logic is not exercised. Use integration tests for consensus validation.

---

## Integration Tests

**Badge:** plugin

**Short description:** Full consensus validation against real GenLayer environments

Run contracts against real GenLayer environments with full consensus validation — leader execution, validator verification, and finalization.

### Running Tests

```bash
gltest tests/integration/ -v -s
gltest tests/integration/ -v -s --network localnet
gltest tests/integration/ -v -s --network testnet_bradbury
```

### Test Pattern

```python
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded

def test_full_flow():
    factory = get_contract_factory("MyContract")
    contract = factory.deploy(args=[])

    receipt = contract.set_data(args=["hello"]).transact()
    assert tx_execution_succeeded(receipt)

    result = contract.get_data(args=[contract.address]).call()
    assert result == "hello"
```

### Direct vs Integration

| Aspect | Direct | Integration |
|--------|--------|-------------|
| Speed | ~30ms | seconds–minutes |
| Server | No | Yes |
| Consensus | Leader only | Full + validators |
| Write methods | Return values | Return receipts |
| Mocking | Supported | Real calls |

### Environments

- **GLSim** — Lightweight, Python natively
- **Studio local** — Full GenVM, Docker required
- **studio.genlayer.com** — Hosted, no setup
- **Testnet Bradbury** — Real network, funded accounts

### When to Use

- Validating consensus behavior
- Testing real web/LLM interactions
- Smoke tests before deploy to testnet

---

## GenLayer CLI

**Badge:** plugin

**Short description:** Deploy, interact with, and debug contracts from the terminal

The command-line interface for deploying, calling, and debugging intelligent contracts across all GenLayer networks.

### Setup

```bash
npm install -g genlayer
```

### Core Commands

| Command | Purpose |
|---------|---------|
| `genlayer deploy --contract file.py` | Deploy a contract |
| `genlayer call <addr> <method>` | Read (view) call |
| `genlayer write <addr> <method>` | Write transaction |
| `genlayer receipt <txHash>` | Get transaction receipt |
| `genlayer schema <addr>` | View contract ABI |
| `genlayer code <addr>` | View deployed source |

### Network Management

```bash
genlayer network set testnet-bradbury
genlayer network info
genlayer network list
```

Networks: `localnet`, `testnet-asimov`, `testnet-bradbury`, `mainnet`

### Debugging Workflow

```
1. Get receipt: genlayer receipt <txHash> --stdout --stderr
2. Check schema: genlayer schema <address>
3. Read source:  genlayer code <address>
4. Try read:     genlayer call <address> <view_method>
5. Appeal:       genlayer appeal <txHash>
```

### Account Management

```bash
genlayer account create --name dev1
genlayer account use dev1
genlayer account list
genlayer account send 0x123...abc 10gen
```

---

# Operate

## Validator Node Setup

**Badge:** plugin

**Short description:** Interactive wizard — from bare Linux to running validator in 20–45 minutes

A comprehensive interactive wizard that takes you from a bare Linux server to a fully operational GenLayer validator node.

### Process Overview

```
Step 0   Determine server location (local / SSH / cloud)
Step 1   Check prerequisites (arch, Node.js, Docker, Python)
Step 2   New validator or existing? (staking wizard)
Step 3   Download & setup (tarball, GenVM, symlinks)
Step 4   Environment config (.env — RPC, LLM key)
Step 5   Node config (config.yaml — addresses, ports)
Step 6   Operator key (upload / copy / generate)
Step 7   Start WebDriver (Docker Compose)
Step 8   Doctor check (verify configuration)
Step 9   Deployment method (systemd / Docker / manual)
Step 10  Verify node running (health, sync)
Step 11  Monitoring setup (optional telemetry)
```

### Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| Architecture | AMD64 only | — |
| RAM | 16 GB | 32 GB |
| CPU | 8 cores | 16+ cores |
| Storage | 128 GB SSD | 256+ GB |
| GEN tokens | 42,000+ | — |
| ETH for gas | ~0.1 ETH | — |

### Three Key Addresses

| Address | Purpose |
|---------|---------|
| **Owner** | Cold wallet — controls validator, stays local |
| **Operator** | Hot wallet — signs blocks, goes on server |
| **Validator** | Smart contract on-chain, used in config |

### Deployment Methods

- **Systemd** (recommended) — Auto-restart, journal logs
- **Docker Compose** — Container isolation
- **Manual** — Screen/tmux for testing

### Supported LLM Providers

Heurist, Comput3, io.net, LibertAI, Anthropic, Google, xAI, Atoma

> Install: `/plugin install genlayernode@genlayerlabs`

---

## Validator Management

**Badge:** dev

**Short description:** Manage validators across testnets — join, fund, set identity, monitor

Manage GenLayer validators across multiple testnets using the `genlayer` CLI. Handle joining, funding, identity, and monitoring.

### Key Concepts

- **Owner** — Controls validator on-chain. Can own many validators.
- **Operator** — Runs node software. Each validator has exactly one.
- **Network isolation** — Each testnet has its own staking contract.

### Common Operations

```bash
# Switch network
genlayer network set testnet-bradbury

# List all validators
genlayer staking validators

# Join as validator
genlayer staking validator-join \
  --amount "100000gen" \
  --operator <address> \
  --account "<owner>"

# Fund operator
genlayer account send \
  --account "<owner>" <operator-address> <amount>

# Set validator identity
genlayer staking set-identity <validator-address> \
  --moniker "My Validator" \
  --account "<owner>"
```

### Monitoring

```bash
genlayer staking epoch-info
genlayer staking active-validators
genlayer staking quarantined-validators
genlayer staking banned-validators
```

### Batch Workflow

```
1. Create operator accounts
2. Join validators
3. Fund operators
4. Set monikers
5. Verify all
6. Update memory
```

---

# Contributing

Something wrong or missing? Humans and agents alike are welcome to [open a PR](https://github.com/genlayerlabs/skills).

---

# Footer

- MIT License
- [GitHub](https://github.com/genlayerlabs/skills)
- [Docs](https://docs.genlayer.com)
- [GenLayer](https://genlayer.com)
