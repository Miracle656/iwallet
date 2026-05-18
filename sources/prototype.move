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


// ── Errors ──
const EInvalidProof: u64 = 0;
const EIdentityMismatch: u64 = 1;
const ENonceAlreadyUsed: u64 = 2;
const ENoBalanceForKey: u64 = 3;
const EIntentMismatch: u64 = 4;


public struct IIdentity<phantom T> has key, store {
    id: UID,
    name: String,
    // The registered identity hash: Poseidon(witness) stored at creation time
    identity_hash: vector<u8>,
    // The prepared verifying key — stored so we don't recompute each time
    pvk: groth16::PreparedVerifyingKey,
    // Nonce registry — prevents replay attacks
    used_nonces: table::Table<vector<u8>, bool>,
    staged_balances: bag::Bag,
}




entry fun get_iidentity<T>(identity: &IIdentity<T>): address {
    identity.id.uid_to_address()
}

public fun get_iidentity_v2<T>(identity: &IIdentity<T>): address {
    identity.id.uid_to_address()
}

// ── Create the agent identity ──
// Owner registers the identity hash and verification key at creation time.
// After this, the object is shared and no owner key can touch it.
entry fun create_iidentity<T>(
    name: String,
    identity_hash: vector<u8>, // Poseidon(witness) — computed off-chain
    vk_bytes: vector<u8>, // Groth16 verifying key bytes from trusted setup
    ctx: &mut TxContext
) {
    // Prepare the verifying key once at creation — stored in the object
    let pvk = groth16::prepare_verifying_key(&groth16::bn254(), &vk_bytes);

    let identity = IIdentity<T> {
        id: object::new(ctx),
        name,
        identity_hash,
        pvk,
        used_nonces: table::new<vector<u8>, bool>(ctx),
        staged_balances: bag::new(ctx),
    };

    transfer::public_share_object(identity);
}

public fun withdraw_received_coin<T>(
    identity: &mut IIdentity<T>,
    sent_coin: Receiving<coin::Coin<T>>,
    recipient: address,
) {
    // 1. Authenticate the coin (verifies it was sent to this identity)
    let coin = transfer::public_receive<coin::Coin<T>>(&mut identity.id, sent_coin);

    // 2. Transfer it out to the human user
    transfer::public_transfer(coin, recipient);
}

public fun receive_coin<T>(
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
    proof_bytes: vector<u8>,
    // Only pass the 2 required public inputs [identity_hash, intent_hash]
    public_inputs_bytes: vector<u8>,
    nonce: vector<u8>,
    amount: u64,
    recipient: address,
    key: String,
    ctx: &mut TxContext,
): coin::Coin<T> {
    // ── 1. Replay protection ──
    assert!(!identity.used_nonces.contains(nonce), ENonceAlreadyUsed);

    // ── 2. ON-CHAIN INTENT BINDING (THE FIX) ──
    // Serialize the actual execution parameters into bytes
    let mut intent_data = vector[];
    vector::append(&mut intent_data, nonce);
    vector::append(&mut intent_data, bcs::to_bytes(&amount));
    vector::append(&mut intent_data, bcs::to_bytes(&recipient));

    // Hash them to create the on-chain intent hash
    let actual_intent_hash = keccak256(&intent_data);

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
    let withdrawn = balance::split<T>(identity.staged_balances.borrow_mut(key), amount);
    let out_coin = coin::from_balance<T>(withdrawn, ctx);
    out_coin
}

// ── Helper: get staged balance ──
public fun staged_balance<T>(identity: &IIdentity<T>, key: String): u64 {
    assert!(sui::bag::contains(&identity.staged_balances, key) ,ENoBalanceForKey);
    let bal = sui::bag::borrow(&identity.staged_balances, key);
    balance::value<T>(bal)
}
