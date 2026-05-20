# I-Wallet — Autonomous AI Agents That Bet On-Chain, Safely

**I-Wallet is ZK-governed account abstraction for AI agents on Sui.** It lets an
autonomous agent move funds and act on-chain **without ever holding the keys to
your wallet** — every action is gated by a zero-knowledge proof bound to the
exact intent.

Our first showcase is an **agentic sports-betting platform**: an AI agent that
reads live odds, finds value bets, and places them autonomously — each bet a
real, proof-verified transaction on Sui testnet.

---

## The problem

To let an AI agent transact for you today, you hand it a private key. That key
can do *anything* — drain the wallet, sign any transaction, with no limits and
no recourse. For autonomous agents handling real value, that's a non-starter.

## The I-Wallet model

Your funds live in an on-chain **Identity** object, not in the agent's wallet.
The agent holds only a secret witness `w` — never a key to your funds. To move
value, it must produce a **Groth16 zero-knowledge proof** that:

1. **It is the authorized agent** — it knows `w` such that `Poseidon(w)` equals
   the `identity_hash` registered on-chain.
2. **The action matches a specific intent** — the proof is bound to the exact
   `amount` and `recipient` via an on-chain-recomputed `keccak256` intent hash.
3. **It can't be replayed** — every withdrawal carries a single-use nonce,
   tracked on-chain.

The Move contract verifies the proof natively (`sui::groth16`, BN254) **before**
releasing a single coin. No valid proof, no movement. The agent operates within
a **mandate** you define — what it's allowed to do, how much, how often.

## The demo: agentic sports betting

A "Trojan Horse" that makes the tech tangible:

1. **Live odds** — the agent pulls upcoming events from a real odds feed.
2. **AI judgement** — Claude estimates true probabilities, computes expected
   value, and proposes value bets sized by a fractional-Kelly mandate.
3. **Autonomous, proof-verified execution** — for each pick the agent generates
   a fresh ZK proof and, in a single atomic transaction, withdraws the stake
   from its Identity and places the bet into an on-chain sportsbook market.
4. **Verifiable audit trail** — every bet is written as an encrypted blob to
   **Walrus**, linkable from the live feed.

Every bet you see in the feed is a real Sui transaction with a real on-chain
ZK verification — not a simulation.

## Memory that persists and stays private

The agent has **encrypted, persistent memory on Walrus** via
[MemWal](https://memwal.ai): it remembers every bet it places and **recalls its
own track record** (semantic search) before each new decision — so it reasons
with its history instead of starting cold. Memories are SEAL-encrypted and
owner-controlled; only you and your authorized agents can read them.

## Why it's different

- **Agent autonomy without key custody** — the agent never holds the keys to
  your funds; withdrawals require a fresh, intent-bound ZK proof.
- **Intent-bound** — a proof authorizes exactly one `(amount, recipient)`, not a
  blanket spending right.
- **Replay-safe** — single-use nonces, enforced on-chain.
- **Verifiable + private** — encrypted memory and an auditable trail, both on
  Walrus, on a fully decentralized stack.
- **Built on Sui** — object-centric Identity, native Groth16 verification,
  atomic programmable transactions.

## Live on testnet today

- Real ZK-verified agent bets on Sui testnet (proof generated off-chain with
  snarkjs, verified on-chain by the Move contract).
- A one-command provisioner that deploys the packages, registers an Identity,
  mints markets, and stages a balance.
- Encrypted agent memory via MemWal.

## The vision: your wallet, your agents

I-Wallet generalizes beyond betting. Any user can provision an Identity, fund
it, define a mandate, and **delegate it to a personal AI agent** — or spawn
multiple agents, each scoped to its own Identity and limits. Your agents act on
your behalf, within cryptographic bounds, and everything they do is auditable.

The betting platform is the proof point. The model is general:
**autonomous agents that can act for you, that you never have to fully trust.**

---

## Stack

Sui Move · `sui::groth16` (BN254) · circom + snarkjs · Poseidon / keccak256 ·
Walrus (audit + memory) · SEAL (encryption) · MemWal (agent memory) ·
Claude (agent reasoning) · TypeScript agent daemon.
