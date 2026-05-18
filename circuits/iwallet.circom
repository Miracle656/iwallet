pragma circom 2.1.6;

include "node_modules/circomlib/circuits/poseidon.circom";

template IWalletAuth() {
    // ── Private Input ──
    signal input w;

    // ── Public Inputs ──
    signal input identity_hash;
    signal input intent_hash;

    // ── 1. Identity Verification ──
    component hasher = Poseidon(1);
    hasher.inputs[0] <== w;

    // The hash of 'w' must perfectly match the public 'identity_hash'
    identity_hash === hasher.out;

    // ── 2. Intent Binding ──
    // Square the intent_hash to force it into the cryptographic proof footprint
    signal intent_squared;
    intent_squared <== intent_hash * intent_hash;
}

// Declare the main component and the public inputs
component main {public [identity_hash, intent_hash]} = IWalletAuth();
