# IWallet Architecture
## Trustless ZK Authorization for Autonomous On-Chain Agents

**Architect:** George Goldman

---

# Executive Summary

IWallet is a cryptographic authorization protocol built on the Sui blockchain that enables autonomous AI agents to execute decentralized finance (DeFi) operations without taking custody of user funds or relying on persistent private keys.

The protocol combines:

- Groth16 Zero-Knowledge Proofs
- BN254 elliptic curve cryptography
- Trusted Execution Environments (TEEs)
- Sui Programmable Transaction Blocks (PTBs)
- Sponsored Transactions

to create a fully non-custodial execution framework where authorization is derived from mathematical proofs rather than traditional wallet signatures.

Unlike conventional “AI wallet” systems that centralize key management on backend infrastructure, IWallet enforces user sovereignty at the protocol level through client-side witness generation and cryptographic intent binding.

---

# 1. Problem Statement

## The Custodial Failure of Existing AI Agents

Most existing Web3 AI agents fundamentally operate as custodial systems.

In typical architectures:

1. The backend server generates or stores private keys
2. The AI agent controls transaction execution
3. Users trust infrastructure operators not to misuse funds

This creates a critical security contradiction:

> The system claims decentralization while depending entirely on trusted infrastructure.

Any compromise of the backend, cloud provider, CI/CD pipeline, or database exposes user assets.

IWallet eliminates this trust assumption entirely.

---

# 2. Non-Custodial Identity Genesis

## Client-Side Witness Generation

IWallet begins with a cryptographic primitive known as the witness (`w`).

The witness is generated locally inside the user’s browser and never originates from backend infrastructure.

```text
w ← SecureRandom()
```
The frontend computes a ZK-friendly identity commitment:
```
identity_hash = Poseidon(w)
```
The resulting identity_hash is submitted to the Sui blockchain and permanently stored inside an IIdentity Shared Object.

## Identity Creation Flow
1. User generates witness locally
2. Browser computes Poseidon commitment
3. Commitment is stored on-chain
4. Witness is encrypted and delegated to the TEE agent

Because the user created the original witness, they retain ultimate ownership over authorization rights.

Even if all IWallet infrastructure disappears, users can independently reconstruct proofs and recover access to funds.

This property establishes true cryptographic sovereignty.

# 3. Trusted Execution Environment (TEE)

## Secure Autonomous Execution

The off-chain execution layer operates inside a Trusted Execution Environment (TEE), such as:

- AWS Nitro Enclaves
- Intel SGX
- AMD SEV

The TEE functions as an isolated cryptographic enclave that:

- Stores witness material in protected memory
- Monitors market conditions
- Generates zero-knowledge proofs
- Broadcasts authorized execution transactions

At no point does the enclave expose the witness externally.

Even if the host operating system or cloud provider is compromised, the witness remains inaccessible outside enclave memory boundaries.

# 4. Zero-Knowledge Authorization
## Groth16 Proof-Based Authentication
Rather than authorizing actions with Ed25519 signatures, IWallet authenticates execution through Groth16 proofs over the BN254 curve.

The proving system validates:

- Knowledge of the original witness
- Correct intent construction
- Valid execution parameters
- Proper nonce usage

This transforms the wallet model from:

`"Who signed this transaction?"`

to: 

`"Can this actor mathematically prove authorization?"`

Authorization becomes purely cryptographic.

# 5. Intent Binding & Replay Protection
## Preventing Parameter Tampering
A major challenge in autonomous execution systems is preventing proof replay or transaction mutation.

An attacker could theoretically intercept a valid proof and attempt to alter:

- recipient address
- token amount
- DEX route
- nonce values

IWallet solves this through strict intent binding.

Intent Construction

Execution parameters are serialized into deterministic byte structures:
```
intent_data = {
    nonce,
    amount,
    recipient,
    asset_in,
    asset_out
}
```
The serialized payload is hashed:
```
intent_hash = Keccak256(intent_data)
```

This hash becomes a public input to the ZK circuit.

The Move contract independently reconstructs and validates the same hash during execution.

If any parameter changes, proof verification fails immediately.

This guarantees that proofs are bound to one exact execution intent.

# 6. BN254 Scalar Field Safety

## The 256-bit Overflow Problem

Groth16 on BN254 operates within a 254-bit scalar field.

However:

```
Keccak256 → 256 bits
BN254 scalar field → 254 bits
```
This creates a dangerous incompatibility.

Approximately 14% of valid Keccak hashes exceed the BN254 field modulus and would cause verifier failure.

## Optimized Scalar Bounding

Instead of performing expensive big-number modular arithmetic inside the Move VM, IWallet applies a deterministic scalar bounding strategy.

## Step 1 — Bitmask Truncation

The protocol applies a bitwise mask to the most significant byte:
```
masked[0] &= 0x1F
```
This guarantees the resulting scalar remains below the BN254 field modulus.

## Step 2 — Endianness Synchronization
The byte array is reversed into Little-Endian format to match Arkworks cryptographic expectations used internally by Sui.

```
bytes.reverse()
```
This synchronization prevents proof verification inconsistencies between:

- SnarkJS
- Circom
- Arkworks
- Move verifier logic

while preserving approximately 253 bits of collision resistance.

# 7. Atomic PTB Execution
## Programmable Transaction Block Architecture
IWallet leverages Sui Programmable Transaction Blocks (PTBs) to compose fully atomic DeFi execution flows.

A single PTB can:

- Verify authorization proofs
- Withdraw funds
- Execute DEX swaps
- Return assets to vault storage

All within one atomic transaction.

## Example Execution Pipeline
### Step 1 — Proof Withdrawal

```
withdraw_with_proof(proof_bytes)
```
The Move contract verifies:

- Groth16 proof validity
- Intent hash correctness
- Nonce integrity
- Scalar field constraints

Funds are released only if all assertions pass.

## Step 2 — DEX Interaction

The PTB routes assets directly into integrated liquidity venues such as:

Cetus
Bluefin

Example:
```
swap(Coin<SUI> → Coin<USDC>)
```

## Step 3 — Vault Re-Deposit
The resulting assets are returned to the IIdentity Shared Object:
```
receive_coin(Coin<USDC>)
```
Assets remain inside protocol-controlled storage throughout execution.

# 8. Sponsored Transactions & Gas Abstraction
## Removing Gas Friction

IWallet supports Sponsored Transactions to eliminate the need for agent wallets to maintain SUI balances for gas fees.

A designated Gas Station signs the PTB and covers execution costs.

This creates a seamless UX where:

- Users retain sovereignty
- Agents execute autonomously
- No hot wallet requires gas management

# 9. Shared Object Architecture
## Universal Composability

The IIdentity vault is implemented as a Sui Shared Object rather than an Address-Owned Object.

This provides several advantages:

Parallel transaction execution
Protocol composability
Stateless authorization
Multi-agent interoperability

Most importantly:

    Authentication is derived from mathematics, not wallet signatures.

The vault behaves as a neutral cryptographic execution layer capable of interoperating across any Sui DeFi protocol.

# 10. Security Guarantees

IWallet provides the following guarantees:

| Property                     | Guarantee                      |
| ---------------------------- | ------------------------------ |
| User Sovereignty             | Witness originates client-side |
| Non-Custodial Security       | Backend never owns funds       |
| Replay Protection            | Intent-bound proofs            |
| Host Compromise Resistance   | TEE isolation                  |
| Atomic Settlement            | PTB composability              |
| Gasless UX                   | Sponsored transactions         |
| Cryptographic Authorization  | Groth16 proof verification     |
| Cross-Protocol Composability | Shared Object architecture     |


# Conclusion

IWallet redefines wallet authorization for autonomous systems.

By combining zero-knowledge cryptography, TEEs, and Sui PTBs, the protocol creates a new execution paradigm where:

- users retain sovereignty,
- agents operate autonomously,
- and authorization is enforced mathematically rather than socially.

The result is a trustless infrastructure layer for scalable autonomous finance on Sui.