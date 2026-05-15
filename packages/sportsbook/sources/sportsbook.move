/// Mock sportsbook — the integration target the Trojan Horse demo bets into.
///
/// Scope boundary: this is a separate package from `iwallet` on purpose. The
/// Protocol Engineer owns the I-Wallet protocol (`iwallet.move`); this module
/// is application/demo code owned by the Solution Engineer. I-Wallet's agent
/// calls into `place_bet` here; identity / mandate gating lives over there.
///
/// Designed to mirror the shape a real Sui sportsbook would expose (markets,
/// bet placement, oracle-style resolution, claims) so it can be swapped for a
/// production venue later without changing the agent's call structure.
module sportsbook::sportsbook;

use std::string::String;
use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::table::{Self, Table};

// === Errors ===
const EMarketClosed: u64 = 0;
const EMarketNotResolved: u64 = 1;
const EInvalidOutcome: u64 = 2;
const ENoBet: u64 = 3;
const EAlreadyClaimed: u64 = 4;
const EAlreadyResolved: u64 = 5;
const EBetAlreadyPlaced: u64 = 6;

// === Outcome codes ===
const OUTCOME_PENDING: u8 = 0;
const OUTCOME_HOME: u8 = 1;
const OUTCOME_AWAY: u8 = 2;
const OUTCOME_DRAW: u8 = 3;
const OUTCOME_VOID: u8 = 4; // refund everyone (postponed / cancelled game)

/// One betting market. Shared object so any agent can place a bet against it.
public struct Market<phantom T> has key, store {
    id: UID,
    sport: String,
    home: String,
    away: String,
    /// Decimal odds in basis points (1.50 = 15000, 2.00 = 20000). 0 means
    /// "not offered" (e.g. `draw_odds = 0` for NBA where draws don't exist).
    home_odds: u64,
    away_odds: u64,
    draw_odds: u64,
    /// Unix ms after which `place_bet` is rejected.
    closes_at_ms: u64,
    /// One of the OUTCOME_* constants.
    outcome: u8,
    /// Aggregate stake pool (covers payouts; demo accepts insolvency risk).
    pool: Balance<T>,
    /// Bets keyed by the bettor's identity object ID (= the I-Wallet
    /// `AgentObject` ID). One bet per agent per market in this version.
    bets: Table<ID, Bet>,
}

public struct Bet has store {
    /// AgentObject ID that placed the bet (the "robot address").
    bettor: ID,
    stake: u64,
    /// Which outcome was picked — OUTCOME_HOME / _AWAY / _DRAW.
    pick: u8,
    claimed: bool,
}

/// Capability to create and resolve markets. Held by the demo operator
/// (acting as the oracle). In a real product this would be a Chainlink-style
/// oracle attestation; for the demo, an off-chain script holds it.
public struct ResolverCap has key, store {
    id: UID,
}

// === Init ===

fun init(ctx: &mut TxContext) {
    transfer::transfer(ResolverCap { id: object::new(ctx) }, ctx.sender());
}

// === Market lifecycle (resolver-gated) ===

/// Create and share a new betting market.
public fun create_market<T>(
    _cap: &ResolverCap,
    sport: String,
    home: String,
    away: String,
    home_odds: u64,
    away_odds: u64,
    draw_odds: u64,
    closes_at_ms: u64,
    ctx: &mut TxContext,
) {
    let market = Market<T> {
        id: object::new(ctx),
        sport,
        home,
        away,
        home_odds,
        away_odds,
        draw_odds,
        closes_at_ms,
        outcome: OUTCOME_PENDING,
        pool: balance::zero<T>(),
        bets: table::new<ID, Bet>(ctx),
    };
    transfer::public_share_object(market);
}

/// Resolver settles the market with the final result. Idempotent-on-success:
/// the market must be unresolved.
public fun resolve_market<T>(
    _cap: &ResolverCap,
    market: &mut Market<T>,
    final_outcome: u8,
) {
    assert!(market.outcome == OUTCOME_PENDING, EAlreadyResolved);
    assert!(
        final_outcome == OUTCOME_HOME
            || final_outcome == OUTCOME_AWAY
            || final_outcome == OUTCOME_DRAW
            || final_outcome == OUTCOME_VOID,
        EInvalidOutcome,
    );
    market.outcome = final_outcome;
}

// === Bet placement ===

/// Place a bet on behalf of an agent (identified by `bettor`, which is the
/// AgentObject ID). Intentionally permissionless: the sportsbook does NOT
/// re-check who's calling. I-Wallet's `execute_*` function is responsible for
/// verifying the ZK proof and enforcing the mandate BEFORE calling this — the
/// caller has already proved they speak for `bettor`.
///
/// The stake is the coin extracted from the agent's vault (BalanceManager or
/// equivalent) by the I-Wallet contract.
public fun place_bet<T>(
    market: &mut Market<T>,
    bettor: ID,
    pick: u8,
    stake: Coin<T>,
    clock: &Clock,
) {
    assert!(market.outcome == OUTCOME_PENDING, EAlreadyResolved);
    assert!(clock.timestamp_ms() < market.closes_at_ms, EMarketClosed);
    assert!(
        pick == OUTCOME_HOME || pick == OUTCOME_AWAY || pick == OUTCOME_DRAW,
        EInvalidOutcome,
    );
    assert!(!table::contains(&market.bets, bettor), EBetAlreadyPlaced);

    let amount = coin::value(&stake);
    balance::join(&mut market.pool, coin::into_balance(stake));

    table::add(
        &mut market.bets,
        bettor,
        Bet { bettor, stake: amount, pick, claimed: false },
    );
}

// === Settlement ===

/// Claim winnings for a resolved market. Returns the payout coin.
/// - Won: `stake * odds / 10000` (capped at remaining pool balance).
/// - Lost: zero coin (consumes the bet, satisfies the API).
/// - Voided: full stake refund.
public fun claim<T>(
    market: &mut Market<T>,
    bettor: ID,
    ctx: &mut TxContext,
): Coin<T> {
    assert!(market.outcome != OUTCOME_PENDING, EMarketNotResolved);
    assert!(table::contains(&market.bets, bettor), ENoBet);

    let bet = table::borrow_mut(&mut market.bets, bettor);
    assert!(!bet.claimed, EAlreadyClaimed);
    bet.claimed = true;

    if (market.outcome == OUTCOME_VOID) {
        return coin::from_balance(balance::split(&mut market.pool, bet.stake), ctx)
    };

    if (bet.pick == market.outcome) {
        let odds = if (bet.pick == OUTCOME_HOME) market.home_odds
                   else if (bet.pick == OUTCOME_AWAY) market.away_odds
                   else market.draw_odds;
        // Decimal odds in bps: payout = stake * odds / 10000.
        let payout = (bet.stake * odds) / 10000;
        let available = balance::value(&market.pool);
        let actual = if (payout > available) available else payout;
        return coin::from_balance(balance::split(&mut market.pool, actual), ctx)
    };

    // Lost.
    coin::zero<T>(ctx)
}

// === Accessors ===

public fun outcome<T>(m: &Market<T>): u8 { m.outcome }

public fun pool_value<T>(m: &Market<T>): u64 { balance::value(&m.pool) }

public fun closes_at_ms<T>(m: &Market<T>): u64 { m.closes_at_ms }

public fun has_bet<T>(m: &Market<T>, bettor: ID): bool { table::contains(&m.bets, bettor) }

public fun odds_for<T>(m: &Market<T>, pick: u8): u64 {
    if (pick == OUTCOME_HOME) m.home_odds
    else if (pick == OUTCOME_AWAY) m.away_odds
    else if (pick == OUTCOME_DRAW) m.draw_odds
    else 0
}

// === Constants (exposed for SDK / off-chain consumers) ===

public fun outcome_pending(): u8 { OUTCOME_PENDING }
public fun outcome_home(): u8 { OUTCOME_HOME }
public fun outcome_away(): u8 { OUTCOME_AWAY }
public fun outcome_draw(): u8 { OUTCOME_DRAW }
public fun outcome_void(): u8 { OUTCOME_VOID }
