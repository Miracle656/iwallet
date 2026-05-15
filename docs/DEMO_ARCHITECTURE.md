# Demo Architecture — Agentic Sports-Bet Platform (Trojan Horse)

**Owner:** Solution Engineer (@Web3Sultan) · **Date:** 2026-05-15

This is the test of I-Wallet. The demo shows an AI agent that takes a user's
budget, finds value bets, places them on a Sui-native sportsbook, and stays
inside a human-set mandate the whole time. **The point of the demo is
I-Wallet, not the sportsbook** — the sportsbook is a swappable integration
target.

## Why we pivoted away from DeepBook

Per George (2026-05-14, paraphrased): *"DeepBook was never the thing — the main
sense is to have an agent use the I-Wallet for transactions."* The original
roadmap line "AI Trading Agent on DeepBook" is replaced by **"AI Sports-Bet
Agent on the sportsbook package."** Same I-Wallet protocol, different venue.

Anything in older docs (`SOLUTION_ARCHITECTURE.md`, `INTEGRATION_SPEC.md`)
that references DeepBook is stale and will be updated to reference
`sportsbook` instead.

## Why we built our own sportsbook (instead of using SuiBets / DeepBook Predict)

- **SuiBets** (https://www.suibets.com/) — consumer site, no public API / SDK /
  GitHub / contract addresses surfaced. Not integrable without reverse
  engineering.
- **DeepBook Predict** — price-prediction protocol; sports outcomes would
  require us to add a sports oracle on top, and George explicitly off-roadmapped
  DeepBook anyway.
- **PredictPlay** (Sui Overflow 2025 winner) — closest fit conceptually but no
  public package or addresses.

So per George's "if it's whack you can make your[s]" — we wrote a minimal
`sportsbook` Move package, shaped like a real one would be (markets, bets,
oracle settlement, claims) so it can be swapped out later.

## End-to-end flow

```
  (bettor)                 (provisioner UI)                 (I-Wallet)
     │                            │                              │
     │  budget + mandate          │                              │
     ├───────────────────────────▶│                              │
     │                            │ generate w client-side       │
     │                            │ identity_hash = Poseidon(w)  │
     │                            ├─────────────────────────────▶│ provision_agent
     │                            │                              │ (shared AgentObject,
     │                            │                              │  BalanceManager + caps)
     │                            │  TTO budget into AgentObject │
     │                            ├─────────────────────────────▶│ deposit_received_coin
     │                            │                              │
     │                            │                              ▼
                                                          (agent daemon)
                                                                 │
              the-odds-api  ◀───────── fetch live odds ──────────┤
                Claude API  ◀───────── pick value bets ──────────┤
                                                                 │
                                                                 │ build Groth16 proof π
                                                                 │ (Poseidon(w) == id_hash,
                                                                 │  intent_hash bound)
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │  I-Wallet    │
                                                          │  execute_bet │
                                                          ├──────────────┤
                                                          │ verify π     │
                                                          │ check mandate│
                                                          │ withdraw cap │
                                                          └──────┬───────┘
                                                                 │
                                                          sportsbook::place_bet
                                                                 │
                                                                 ▼
                                                          ┌──────────────┐
                                                          │   Market<T>  │
                                                          │  (shared)    │
                                                          └──────┬───────┘
                                                                 │ event
                                                                 ▼
                                                            Walrus blob
                                                          (intent + π hash)
```

## Components in this PR (Phase 2 scaffold, **stubs**)

| Path | Owner | What it is |
|---|---|---|
| `packages/sportsbook/sources/sportsbook.move` | SE | Mock sportsbook: `Market<T>`, `ResolverCap`, `create_market`, `place_bet`, `resolve_market`, `claim`. Builds clean. |
| `agent/src/index.ts` | SE | Main tick: odds → picks → bet → audit |
| `agent/src/odds.ts` | SE | the-odds-api wrapper (stub) |
| `agent/src/picks.ts` | SE | Claude value-bet picker (stub) |
| `agent/src/iwallet.ts` | SE | I-Wallet + sportsbook tx builders (stub, blocked on TBD-4) |
| `agent/src/walrus.ts` | SE | Audit-trail blob writer (stub) |

## Scope boundary (important)

- The sportsbook is its own Move package (`packages/sportsbook/`). It does
  **not** touch `iwallet.move` — George owns the I-Wallet protocol. This
  package is application/demo code.
- The agent daemon is read-only against the I-Wallet contract until George
  finalizes the `execute_*` signature. We do not pre-empt that interface.

## How the pitch maps to the mandate

| Pitch claim | Enforced by |
|---|---|
| "AI agent can only bet what you allow" | `Mandate.max_amount_per_trade` |
| "AI agent can only lose so much per session" | `Mandate.max_total_outflow` |
| "AI agent only bets the leagues you whitelist" | `Mandate.whitelisted_pools` (= whitelisted Market IDs) |
| "AI agent stops at end of session" | `Mandate.expiry_ms` |
| "AI agent has no key — it can't be drained" | I-Wallet's ZK identity gate |

That last line is the whole pitch. The sportsbook is the proof.

## What's stubbed and when it lights up

Phase 3 (June 5–15) wires real implementations:
- Real the-odds-api fetch
- Real `claude-opus-4-7` calls with system-prompt caching
- Real tx builders against George's final `execute_*` signature
- Real Walrus blob writes

Phase 4 (June 16–21) is **polish + pitch video only** — no new functionality
after June 15 per the roadmap's three rules.

## Open dependencies (chase before Phase 3 starts)

| # | Question | Owner | Blocks |
|---|---|---|---|
| TBD-1 | Hashing primitive for `identity_hash` / `intent_hash` (Poseidon vs keccak) | PROTO + SE | proof payload assembly |
| TBD-4 | Final `execute_*` signature on the I-Wallet contract | PROTO | `agent/src/iwallet.ts` |
| NEW-A | Stake coin for the demo — SUI or USDC? | PM + SE | `STAKE_COIN_TYPE`, `Market<T>` deployments |
| NEW-B | Resolver model — script-driven for the demo (acceptable) or a real oracle later? | SE | `resolve_market` caller |
| NEW-C | Frontend re-scoping — Mandate UI now lists Market IDs (sportsbook), not pool IDs (DeepBook) | FE | Surface B in INTEGRATION_SPEC |
