/// I-Wallet — ZK-governed account abstraction for autonomous AI agents on Sui.
///
/// This file is the OBJECT MODEL ONLY. Every function body is stubbed with
/// `abort ENotImplemented` so the team can lock the data model + ownership
/// semantics before any logic is written. It compiles today against the Sui
/// framework alone (no DeepBook dependency yet — see the commented sections).
///
/// Companion doc: docs/SOLUTION_ARCHITECTURE.md
//
// Skeleton stage: error codes, struct fields, and the `T` on
// `deposit_received_coin` are declared ahead of the logic that will use them.
#[allow(unused_const, unused_field, unused_type_parameter)]
module iwallet::iwallet;

use sui::vec_set::VecSet;

// === Errors ===
const ENotImplemented: u64 = 0;
const ENotOwner: u64 = 1;
const EAgentNotActive: u64 = 2;
const EMandateExpired: u64 = 3;
const EAmountExceedsMandate: u64 = 4;
const EOutflowCapExceeded: u64 = 5;
const EPoolNotWhitelisted: u64 = 6;
const EInvalidProof: u64 = 7;
const EIdentityMismatch: u64 = 8;

// === Agent status ===
const STATUS_ACTIVE: u8 = 0;
const STATUS_FROZEN: u8 = 1;
const STATUS_REVOKED: u8 = 2;

// =====================================================================
// OBJECTS
// =====================================================================

/// Protocol-wide registry, published once. SHARED object.
/// Holds the Groth16 verification key every agent's proof is checked against,
/// plus light bookkeeping. The VK lives here (not per-agent) because it is
/// common to all agents and must be updatable while iterating on testnet.
public struct IWalletRegistry has key {
    id: UID,
    /// Groth16 verification key bytes (BN254). Owned by the Protocol Engineer's
    /// circuit output. Updatable via `AdminCap` during testnet.
    verification_key: vector<u8>,
    /// Number of agents provisioned through this registry.
    agent_count: u64,
}

/// Admin capability, minted once at publish and held by the team.
/// Gates verification-key updates. OWNED object (team multisig / deployer).
public struct AdminCap has key, store {
    id: UID,
}

/// The robot's on-chain identity + wallet. SHARED object.
///
/// Why shared: it must (a) receive assets via transfer-to-object (its object
/// ID is the "robot address"), and (b) be mutably borrowed by `execute_trade`,
/// which is called permissionlessly by whoever submits a valid proof. Only a
/// shared object supports both.
///
/// There is NO private key for this object. The human `owner` governs it; the
/// agent daemon only holds the ZK secret `w` off-chain and proves knowledge of
/// it — it never signs as this object.
///
/// The DeepBook `BalanceManager` named by `balance_manager_id` is the actual
/// fund vault. Its `TradeCap` / `DepositCap` / `WithdrawCap` are attached to
/// `id` as dynamic object fields at provisioning time — kept off the struct
/// definition so this file stays free of the DeepBook dependency for now.
/// See SOLUTION_ARCHITECTURE.md → "Open Decisions".
public struct AgentObject has key {
    id: UID,
    /// Human owner. Governs the agent: mandate edits, freeze, revoke.
    /// NOT a key the agent daemon holds.
    owner: address,
    /// Public Poseidon hash of the agent secret `w`, registered at creation.
    /// A valid proof must show `Poseidon(w) == identity_hash`.
    identity_hash: vector<u8>,
    /// The DeepBook BalanceManager that holds this agent's funds.
    balance_manager_id: ID,
    /// Spending policy. Wrapped INLINE (not a separate object) so it cannot be
    /// detached or swapped. Enforced on-chain by `execute_trade` — NOT in the
    /// ZK circuit.
    mandate: Mandate,
    /// Monotonic counter bound into every proof's public input (replay
    /// protection / intent freshness).
    nonce: u64,
    /// STATUS_ACTIVE / STATUS_FROZEN / STATUS_REVOKED.
    status: u8,
}

/// Spending policy for an `AgentObject`. Plain struct (`store`, no `key`):
/// it has no independent on-chain existence, cannot be addressed, and lives
/// and dies with its parent `AgentObject`.
public struct Mandate has store {
    /// Maximum value moved in a single trade.
    max_amount_per_trade: u64,
    /// Lifetime outflow ceiling for this agent.
    max_total_outflow: u64,
    /// Cumulative outflow so far. Invariant: `total_spent <= max_total_outflow`.
    total_spent: u64,
    /// DeepBook pool IDs this agent is permitted to trade against.
    whitelisted_pools: VecSet<ID>,
    /// Unix ms after which no trade is allowed (checked against `Clock`).
    expiry_ms: u64,
}

// =====================================================================
// INIT
// =====================================================================

/// Publishes the shared `IWalletRegistry` and sends the `AdminCap` to the
/// deployer.
fun init(_ctx: &mut TxContext) {
    abort ENotImplemented
}

// =====================================================================
// PROVISIONING  — driven by the front-end "Provisioner"
// =====================================================================

/// Create and share a new `AgentObject`. `identity_hash` is computed
/// client-side as `Poseidon(w)`; `w` never leaves the agent daemon.
/// The DeepBook BalanceManager + caps are created and attached separately
/// (see `attach_deepbook_caps`) until the DeepBook dependency is wired in.
public fun provision_agent(
    _registry: &mut IWalletRegistry,
    _owner: address,
    _identity_hash: vector<u8>,
    _balance_manager_id: ID,
    _max_amount_per_trade: u64,
    _max_total_outflow: u64,
    _expiry_ms: u64,
    _ctx: &mut TxContext,
) {
    abort ENotImplemented
}

/// Attach the DeepBook `TradeCap` / `DepositCap` / `WithdrawCap` to the agent
/// as dynamic object fields. Split out so the DeepBook dep can be added without
/// touching `provision_agent`'s signature.
///
/// Intended signature once DeepBook is a dependency:
///   public fun attach_deepbook_caps(
///       agent: &mut AgentObject,
///       trade_cap: deepbook::balance_manager::TradeCap,
///       deposit_cap: deepbook::balance_manager::DepositCap,
///       withdraw_cap: deepbook::balance_manager::WithdrawCap,
///       ctx: &TxContext,
///   )
public fun attach_deepbook_caps(_agent: &mut AgentObject, _ctx: &TxContext) {
    abort ENotImplemented
}

// =====================================================================
// OWNER GOVERNANCE  — gated on `ctx.sender() == agent.owner`
// =====================================================================

/// Owner-only. Replace the mandate's numeric limits.
public fun update_mandate(
    _agent: &mut AgentObject,
    _max_amount_per_trade: u64,
    _max_total_outflow: u64,
    _expiry_ms: u64,
    _ctx: &TxContext,
) {
    abort ENotImplemented
}

/// Owner-only. Add a DeepBook pool to the agent's whitelist.
public fun whitelist_pool(_agent: &mut AgentObject, _pool_id: ID, _ctx: &TxContext) {
    abort ENotImplemented
}

/// Owner-only. Remove a DeepBook pool from the whitelist.
public fun unwhitelist_pool(_agent: &mut AgentObject, _pool_id: ID, _ctx: &TxContext) {
    abort ENotImplemented
}

/// Owner-only. Freeze the agent: blocks `execute_trade`, funds stay recoverable.
public fun freeze_agent(_agent: &mut AgentObject, _ctx: &TxContext) {
    abort ENotImplemented
}

/// Owner-only. Lift a freeze.
public fun unfreeze_agent(_agent: &mut AgentObject, _ctx: &TxContext) {
    abort ENotImplemented
}

/// Owner-only. Permanently revoke the agent (terminal state).
public fun revoke_agent(_agent: &mut AgentObject, _ctx: &TxContext) {
    abort ENotImplemented
}

// =====================================================================
// FUNDING
// =====================================================================

/// Sweep a coin sent to the `AgentObject` via transfer-to-object into the
/// DeepBook BalanceManager vault. Permissionless: anyone may top the agent up.
/// Inflow is never gated — only outflow (`execute_trade`) is.
///
/// Intended signature once DeepBook + TTO are wired in:
///   public fun deposit_received_coin<T>(
///       agent: &mut AgentObject,
///       balance_manager: &mut deepbook::balance_manager::BalanceManager,
///       sent_coin: sui::transfer::Receiving<sui::coin::Coin<T>>,
///       ctx: &mut TxContext,
///   )
public fun deposit_received_coin<T>(_agent: &mut AgentObject, _ctx: &mut TxContext) {
    abort ENotImplemented
}

// =====================================================================
// ZK-GATED TRADE EXECUTION  — the core of the protocol
// =====================================================================
//
// INTERFACE CONTRACT with the Protocol Engineer (George):
//   - I-Wallet (SE) owns this signature, the mandate checks, and the DeepBook
//     call.
//   - George owns the circuit, the verification key, and the byte layout of
//     `proof_points` / `public_inputs`.
//
// Full intended signature (commented until DeepBook is in Move.toml — see
// SOLUTION_ARCHITECTURE.md → "Open Decisions"):
//
//   public fun execute_trade<Base, Quote>(
//       agent: &mut AgentObject,
//       registry: &IWalletRegistry,
//       pool: &mut deepbook::pool::Pool<Base, Quote>,
//       balance_manager: &mut deepbook::balance_manager::BalanceManager,
//       proof_points: vector<u8>,    // Groth16 proof bytes from the agent daemon
//       public_inputs: vector<u8>,   // [identity_hash, intent_hash]
//       amount: u64,                 // intent: trade size
//       is_bid: bool,                // intent: direction
//       min_out: u64,                // intent: slippage bound
//       clock: &Clock,
//       ctx: &mut TxContext,
//   )
//
// Logic order (to be implemented):
//   1. assert agent.status == STATUS_ACTIVE
//   2. intent_hash = hash(object::id(pool), amount, is_bid, agent.nonce);
//      assert it equals the intent_hash carried in `public_inputs`
//   3. assert the identity_hash in `public_inputs` == agent.identity_hash
//   4. sui::groth16 verify(registry.verification_key, public_inputs, proof_points)
//   5. mandate: not expired (clock.timestamp_ms() < expiry_ms),
//      amount <= max_amount_per_trade,
//      total_spent + amount <= max_total_outflow,
//      whitelisted_pools.contains(object::id(pool))
//   6. agent.nonce += 1; agent.mandate.total_spent += amount
//   7. borrow the attached caps -> generate a DeepBook TradeProof ->
//      pool.swap_exact_*_with_manager(...) -> proceeds settle into
//      `balance_manager`
//
// `execute_trade` is intentionally NOT declared yet: declaring it without the
// DeepBook types would force placeholder params that the team would then have
// to change. The signature above is the agreed contract.

// =====================================================================
// ACCESSORS  — read-only, for tests / front-end / off-chain indexers
// =====================================================================

public fun owner(agent: &AgentObject): address { agent.owner }

public fun identity_hash(agent: &AgentObject): vector<u8> { agent.identity_hash }

public fun balance_manager_id(agent: &AgentObject): ID { agent.balance_manager_id }

public fun nonce(agent: &AgentObject): u64 { agent.nonce }

public fun status(agent: &AgentObject): u8 { agent.status }

public fun is_active(agent: &AgentObject): bool { agent.status == STATUS_ACTIVE }

public fun mandate_limits(agent: &AgentObject): (u64, u64, u64, u64) {
    let m = &agent.mandate;
    (m.max_amount_per_trade, m.max_total_outflow, m.total_spent, m.expiry_ms)
}
