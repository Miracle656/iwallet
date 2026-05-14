# I-Wallet — Solution Architecture (v0, draft for team alignment)

**Owner:** Sui Solution Engineer
**Date:** 2026-05-14 (Phase 1, day 2)
**Status:** Draft — needs team sign-off before logic is written

This doc accompanies `sources/iwallet.move`, which contains the object model
with every function body stubbed. Read them together. The goal of v0 is to
**lock the data model and ownership semantics** so Move logic, the ZK circuit,
and the front-end can be built against a stable interface.

---

## 1. The biggest finding: DeepBook's `BalanceManager` *is* the vault

The PDF/diagram calls for a custom **`SharedStorage`** object that the contract
"pulls funds into." After reading `deepbookv3/packages/deepbook/sources/`,
**I recommend we do not build `SharedStorage`.** DeepBook already ships exactly
that primitive:

`deepbook::balance_manager::BalanceManager`
- A **shared object** holding multi-asset balances (a `Bag`).
- Has an `owner: address` plus a capability system: `TradeCap`, `DepositCap`,
  `WithdrawCap` — all `has store`, so they can be held *inside another object*.
- `pool::swap_exact_base_for_quote_with_manager(pool, balance_manager,
  trade_cap, deposit_cap, withdraw_cap, ...)` executes a trade driven **only by
  those caps** — no signing key, no `ctx.sender()` owner check.

This maps 1:1 onto I-Wallet's "no private key" thesis. So:

> **The `AgentObject` holds the three DeepBook caps. The `BalanceManager` is the
> vault. There is no custom `SharedStorage`.**

This deletes a whole sprint item, removes a class of bugs (our own balance
accounting), and means trade execution is a thin, well-trodden DeepBook call.

---

## 2. Object model

| Object | Sui ownership | Lives where | Mutated by |
|---|---|---|---|
| `IWalletRegistry` | **Shared** | published once at `init` | `AdminCap` holder (VK updates) |
| `AdminCap` | **Owned** | team deployer / multisig | — |
| `AgentObject` | **Shared** | one per agent | owner (governance) + anyone w/ valid proof (`execute_trade`) |
| `Mandate` | inline field of `AgentObject` (`store`, no `key`) | inside `AgentObject` | owner only |
| `BalanceManager` (DeepBook) | **Shared** | one per agent | via caps held by `AgentObject` |
| `TradeCap`/`DepositCap`/`WithdrawCap` (DeepBook) | dynamic object fields on `AgentObject.id` | inside `AgentObject` | — |

### Why these choices

- **`AgentObject` is shared, not owned.** It must (a) receive funds via
  transfer-to-object — its object ID is the "robot address" — and (b) be
  `&mut`-borrowed by `execute_trade`, which is permissionless (called by whoever
  submits a valid proof). Only a shared object supports both. The existing
  `prototype.move` already shares its object — consistent.
- **`Mandate` is an inline field, not a separate object.** The May 13 plan said
  "owned by the AgentObject." Sharper version: wrap it *inside* the struct. A
  separately-addressed object — even one owned-by-object — invites a class of
  "swap the mandate" bugs and needs extra plumbing to reach during a trade. As a
  plain `store` field it has no independent existence and `execute_trade` reads
  it for free.
- **DeepBook caps as dynamic object fields**, not typed struct fields — purely
  so `iwallet.move` compiles *today* without the DeepBook dependency. Once
  DeepBook is in `Move.toml` we can promote them to typed fields if we prefer.
- **VK in the registry**, not per-agent: it is identical for every agent and
  must be updatable on testnet while George iterates on the circuit.

---

## 3. End-to-end flow (maps to the 4 steps in the PDF diagram)

1. **Provision** — Front-end generates `w`, computes `identity_hash =
   Poseidon(w)`, creates a DeepBook `BalanceManager` + caps, calls
   `provision_agent` + `attach_deepbook_caps`. `AgentObject` is shared.
2. **Fund** — Anyone sends `Coin<T>` to the `AgentObject`'s ID (TTO).
   `deposit_received_coin` sweeps it into the `BalanceManager`. *Inflow is never
   gated.*
3. **Prove** — Agent daemon builds a Groth16 proof: knows `w`, proves
   `Poseidon(w) == identity_hash` AND binds the trade intent
   (`pool_id + amount + is_bid + nonce`) as a public input.
4. **Verify & execute** — `execute_trade` verifies the proof via `sui::groth16`,
   enforces the `Mandate` (amount / outflow cap / whitelist / expiry), bumps the
   nonce, then drives the DeepBook swap with the held caps. Proceeds settle back
   into the `BalanceManager`.

---

## 4. Interface contract with the Protocol Engineer (George)

I-Wallet (SE) owns: the `execute_trade` signature, mandate checks, the DeepBook
call. George owns: the circuit, the verification key, and the byte layout below.

- **Private input:** `w` (agent secret, never on-chain).
- **Public inputs:** `identity_hash = Poseidon(w)` **and** `intent_hash =
  hash(pool_id, amount, is_bid, nonce)`. Both must be reproducible on-chain by
  the Move contract so it can bind the proof to *this specific* agent and trade.
- **Constraint:** `Poseidon(w) == identity_hash`.
- **NOT in the circuit:** amount / whitelist / expiry limits — those are plain
  Move checks against the `Mandate` object. The circuit only proves *identity*
  and *intent binding*.
- **George must confirm:** the exact `sui::groth16` call shape and the
  serialized byte order of `public_inputs` so the Move side can deserialize it.

---

## 5. Open decisions — need a call this week

1. **`prototype.move` → delete or migrate?** `IIdentity<T>` is an embryonic
   AgentObject but the model diverged (single phantom coin type, unused balances
   table, no mandate, no access control). **Recommendation: delete it**, keep
   `iwallet.move` as the single source of truth. It's still published at
   testnet v3, so we just upgrade.
2. **DeepBook dependency + `BalanceManager` creation path.** `BalanceManager`
   with a non-sender owner is created via `new_with_custom_owner_caps<App>`,
   which calls `registry.assert_app_is_authorized<App>()` — **I-Wallet may need
   to be a registered DeepBook app.** This is a potential external blocker;
   needs investigation now, not in Phase 3. (Fallback: create the BM with the
   provisioner as owner, then mint + hand caps to the `AgentObject`.)
3. **`Move.toml` has no dependencies declared.** Add `Sui` explicitly and
   `DeepBook` (testnet rev) before `execute_trade` can be uncommented.
4. **Hashing primitive.** `intent_hash` must be computable both in-circuit and
   in Move. Poseidon in Move is not native — confirm whether we hash intent with
   Poseidon (circuit-friendly, needs a Move impl) or keccak/blake2b (native in
   Move, but then the circuit must implement it). George + SE decision.

---

## 6. Risks I'm flagging (SE "owns the outcome")

- **`w` custody.** "No private key" is true: a compromised daemon *cannot drain
  funds* (can't forge Groth16). But it *can* generate valid proofs for bad
  trades **within the mandate**. **The `Mandate` is the real last line of
  defense** — tight per-trade and total-outflow caps, short expiry, narrow
  whitelist. Docs/pitch should state this honestly.
- **Integration timing.** DeepBook + Walrus + ZK verifier all landing in Phase 3
  with one week to submission is the top schedule risk — not the ZK math.
  Mitigation: spike a dummy DeepBook `swap` on testnet *during Phase 1*, in
  parallel with the circuit work.
- **DeepBook app authorization** (open decision #2) — could block
  `BalanceManager` creation. Resolve in week 1.

---

## 7. What's done / next

- [x] `sources/iwallet.move` — object model, stubbed. Compiles against Sui fw.
- [x] This doc.
- [ ] Team sign-off on object model + open decisions.
- [ ] Add `Sui` + `DeepBook` to `Move.toml`.
- [ ] Testnet PoC: off-chain Groth16 proof → `sui::groth16::verify` → pass/fail
      (George, critical path, target ~day 4).
- [ ] Testnet PoC: dummy DeepBook `swap_exact_*_with_manager` call (SE, parallel).
- [ ] Decide `prototype.move` fate.
