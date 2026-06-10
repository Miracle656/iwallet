#[allow(unused_const)]
module iwallet::prototype;

use sui::table;
use sui::groth16;
use std::string::String;
use sui::coin;
use sui::balance;
use sui::transfer::Receiving;
use sui::bag;
use sui::hash::keccak256;
use sui::bcs;
use sui::event;


// ── Errors ──
const EInvalidProof: u64 = 0;
const EIdentityMismatch: u64 = 1;
const ENonceAlreadyUsed: u64 = 2;
const ENoBalanceForKey: u64 = 3;
const EIntentMismatch: u64 = 4;


// ── Errors ──
const EPolicyExpired: u64 = 5;
const EBudgetExceeded: u64 = 6;
const EInvalidProtocolScope: u64 = 7;

const ENotOwner: u64 = 8;

// Emitted when an agent extracts funds or makes a trade via ZK proof
public struct AgentExecutionEvent has copy, drop {
    identity_id: address,
    nonce: vector<u8>,
    amount: u64,
    recipient: address,
    coin_type: String,
}

// Emitted when the human owner updates the agent's constraints
public struct PolicyUpdatedEvent has copy, drop {
    identity_id: address,
    budget_cap: u64,
    expiration_ms: u64,
}

public struct AgentPolicy has store, drop {
    // Maximum amount the agent is allowed to spend
    budget_cap: u64,
    // Running total of what the agent has extracted
    amount_spent: u64,
    daily_limit: u64,
    spent_today: u64,
    last_reset_timestamp: u64,
    // The ONLY address this agent can send funds to (e.g., DeepBook Pool ID),
    allow_recipients: vector<address>,
    // The exact millisecond timestamp when the agent's keys become useless
    expiration_ms: u64,
    revoked: bool,
}

public struct IWalletOwner has key, store {
    id: UID
}


public struct IIdentity<phantom T> has key, store {
    id: UID,
    name: String,
    // The registered identity hash: Poseidon(witness) stored at creation time
    owner: address,
    identity_hash: vector<u8>,
    // The prepared verifying key — stored so we don't recompute each time
    pvk: groth16::PreparedVerifyingKey,
    // Nonce registry — prevents replay attacks
    used_nonces: table::Table<vector<u8>, bool>,
    staged_balances: bag::Bag,
    active_policy: Option<AgentPolicy>
}

public struct IdentityCreated has copy, drop {
    id: address,
    msg: std::string::String,
}


public fun set_policy<T>(
    identity: &mut IIdentity<T>,
    budget_cap: u64,
    allow_recipients: vector<address>,
    expiration_ms: u64,
    ctx: &mut TxContext
)
{

    assert!(ctx.sender() == identity.owner, ENotOwner);

    let policy = AgentPolicy {
        budget_cap,
        amount_spent: 0,
        // TODO(George): wire daily_limit as a set_policy param + enforce in
        // withdraw_with_proof. Defaulted here only so the contract compiles.
        daily_limit: budget_cap,
        spent_today: 0,
        last_reset_timestamp: 0,
        allow_recipients,
        expiration_ms,
        revoked: false,
    };

    // Lock the policy into the vault
    // Note: if a policy exists, extract it first to avoid aborts
    if (option::is_some(&identity.active_policy)) {
        let _ = option::extract(&mut identity.active_policy);
    };
    option::fill(&mut identity.active_policy, policy);

    event::emit(PolicyUpdatedEvent {
        identity_id: identity.id.uid_to_address(),
        budget_cap,
        expiration_ms,
    });
}





// ── Create the agent identity ──
// Owner registers the identity hash and verification key at creation time.
// After this, the object is shared and no owner key can touch it.
entry fun create_iidentity<T>(
    name: String,
    identity_hash: vector<u8>, // Poseidon(witness) — computed off-chain
    vk_bytes: vector<u8>, // Groth16 verifying key bytes from trusted setup
    active_policy: Option<AgentPolicy>,
    ctx: &mut TxContext
): address {
    // Prepare the verifying key once at creation — stored in the object
    let pvk = groth16::prepare_verifying_key(&groth16::bn254(), &vk_bytes);

    let identity = IIdentity<T> {
        id: object::new(ctx),
        name,
        identity_hash,
        pvk,
        used_nonces: table::new<vector<u8>, bool>(ctx),
        staged_balances: bag::new(ctx),
        active_policy,
        owner: ctx.sender()
    };

    let iwallet_owner = createIWalletOwner(ctx);

    let event_id = identity.id.uid_to_address();
    let identity_addr = identity.id.uid_to_address();
    let create_identity_event = IdentityCreated { id: event_id, msg: b"identity created".to_string() };
    transfer::public_transfer(iwallet_owner, ctx.sender());
    transfer::public_share_object(identity);
    event::emit(create_identity_event);
    // id for event
    identity_addr
}

fun createIWalletOwner(ctx: &mut TxContext): IWalletOwner
{
    IWalletOwner { id: object::new(ctx) }
}



fun receive_coin<T>(
    identity: &mut IIdentity<T>,
    key: String,
    sent_coin: Receiving<coin::Coin<T>>,
)
{
    let coin = transfer::public_receive<coin::Coin<T>>(&mut identity.id, sent_coin);
    let received_balance = coin::into_balance(coin);
    if (identity.staged_balances.contains(key)) {
        balance::join(identity.staged_balances.borrow_mut(key), received_balance);
    } else {
        identity.staged_balances.add(key, received_balance);
    }
}

// ── Step 2: Withdraw — PROOF REQUIRED ──
// This is the authentication gate.
// The caller must present a valid Groth16 proof that:
//   - proves knowledge of witness w such that Poseidon(w) == identity.identity_hash
//   - includes the nonce (to prevent replay)
//   - includes the amount and recipient as public inputs (binds the proof to this tx)
//
// Public inputs layout (each 32 bytes, little-endian, concatenated):
//   [0] identity_hash  — must match stored hash
//   [1] nonce          — single-use, checked against used_nonces table
//   [2] amount         — how much to withdraw
//   [3] recipient      — destination address as bytes
//
// Private input (never on-chain):
//   witness w          — only the legitimate agent daemon knows this

public fun withdraw_with_proof<T>(
    identity: &mut IIdentity<T>,
    _: &IWalletOwner,
    proof_bytes: vector<u8>,
    // Only pass the 2 required public inputs [identity_hash, intent_hash]
    public_inputs_bytes: vector<u8>,
    nonce: vector<u8>,
    amount: u64,
    opt_sent_coin: Option<Receiving<coin::Coin<T>>>,
    recipient: address,
    key: String,
    clock: &sui::clock::Clock,
    ctx: &mut TxContext,
): coin::Coin<T> {

    // ── 0. POLICY ENFORCEMENT (THE MISSING BLOCK) ──
    assert!(option::is_some(&identity.active_policy), EPolicyExpired);
    let policy = option::borrow_mut(&mut identity.active_policy);

    // Rule A: Is the agent dead?
    assert!(sui::clock::timestamp_ms(clock) <= policy.expiration_ms, EPolicyExpired);
    // Rule B: Did the agent hit its spend limit?
    assert!(policy.amount_spent + amount <= policy.budget_cap, EBudgetExceeded);
    // Rule C: Is the recipient in the allowed list?
    assert!(std::vector::contains(&policy.allow_recipients, &recipient), EInvalidProtocolScope);

    // Update the tracker
    policy.amount_spent = policy.amount_spent + amount;

    // ── 1. Replay protection ──
    assert!(!identity.used_nonces.contains(nonce), ENonceAlreadyUsed);

    // ── 2. ON-CHAIN INTENT BINDING (THE FIX) ──
    // Serialize the actual execution parameters into bytes
    let mut intent_data = vector[];
    vector::append(&mut intent_data, nonce);
    vector::append(&mut intent_data, bcs::to_bytes(&amount));
    vector::append(&mut intent_data, bcs::to_bytes(&recipient));

    // Hash them to create the on-chain intent hash
    let mut actual_intent_hash = keccak256(&intent_data);


    // 🔥  This guarantees the hash will never trigger the 14% overflow abort.
    let first_byte = vector::borrow_mut(&mut actual_intent_hash, 0);
    *first_byte = *first_byte & 0x1F;

    std::vector::reverse(&mut actual_intent_hash);

    // Ensure the public_inputs_bytes contains the identity.identity_hash
    // AND the actual_intent_hash we just calculated.
    let mut expected_public_inputs = vector[];
    vector::append(&mut expected_public_inputs, identity.identity_hash); // Input 1
    vector::append(&mut expected_public_inputs, actual_intent_hash);     // Input 2

    // ── 3. STRICT INTENT ENFORCEMENT ──
    // If the ZK proof was generated for a different amount or recipient,
    // the public_inputs_bytes will not match our expected bytes, and this will abort.
    assert!(public_inputs_bytes == expected_public_inputs, EIntentMismatch);

    // ── 3. Verify the Groth16 proof ──
    let proof_points = groth16::proof_points_from_bytes(proof_bytes);
    let public_inputs = groth16::public_proof_inputs_from_bytes(public_inputs_bytes);

    let valid = groth16::verify_groth16_proof(
        &groth16::bn254(),
        &identity.pvk,
        &public_inputs,
        &proof_points,
    );
    assert!(valid, EInvalidProof);

    // ── 4. Mark nonce as used ──
    identity.used_nonces.add(nonce, true);

    // ── 5. Release funds ──
    if (option::is_some(&opt_sent_coin)) {
        let sent_coin = option::destroy_some(opt_sent_coin);
        receive_coin(identity, key, sent_coin);
    } else {
        option::destroy_none(opt_sent_coin);
    };
    // Ensure the bag actually has the key before borrowing
    assert!(bag::contains(&identity.staged_balances, key), ENoBalanceForKey);

    // Withdraw the requested amount
    let withdrawn = balance::split<T>(identity.staged_balances.borrow_mut(key), amount);
    let out_coin = coin::from_balance<T>(withdrawn, ctx);

    event::emit(AgentExecutionEvent {
        identity_id: identity.id.uid_to_address(),
        nonce,
        amount,
        recipient,
        coin_type: key, // Using your balance key string as the coin identifier
    });
    out_coin
}

// ── Helper: get staged balance ──
public fun staged_balance<T>(identity: &IIdentity<T>, key: String): u64 {
    assert!(sui::bag::contains(&identity.staged_balances, key) ,ENoBalanceForKey);
    let bal = sui::bag::borrow(&identity.staged_balances, key);
    balance::value<T>(bal)
}

public fun revoke_policy<T>(identity: &mut IIdentity<T>, ctx: &mut TxContext){
    assert!(ctx.sender() == identity.owner, ENotOwner);

    if (option::is_some(&identity.active_policy)) {
        let _old_policy = option::extract(&mut identity.active_policy);
    }
}

public fun owner_withdraw<T>(
    identity: &mut IIdentity<T>,
    amount: u64,
    key: String,
    ctx: &mut TxContext
): coin::Coin<T>
{
    // 1. Check native Passkey wallet signature
    assert!(tx_context::sender(ctx) == identity.owner, ENotOwner);

    // 2. Ensure funds exist
    assert!(bag::contains(&identity.staged_balances, key), ENoBalanceForKey);

    // 3. Bypass ZK, extract funds directly
    let withdrawn = balance::split<T>(
        identity.staged_balances.borrow_mut(key),
        amount
    );

    coin::from_balance<T>(withdrawn, ctx)
}
