import 'dotenv/config';
import { fetchUpcomingOdds, type OddsEvent } from './odds.js';
import { pickBets, type Pick } from './picks.js';
import { IWalletClient } from './iwallet.js';
import { logAuditTrail } from './walrus.js';
import { recallContext, rememberBet } from './memwal.js';

export type BetRecord = {
  pick: Pick;
  digest: string;
  /** On-chain Market object the agent minted + bet into (empty when stubbed). */
  marketId: string;
  blobId: string;
  url?: string;
};

export type TickResult = {
  ts: number;
  events: OddsEvent[];
  picks: Pick[];
  bets: BetRecord[];
  notes: string[];
  /** Memories the agent recalled (MemWal) to inform this tick's picks. */
  memoriesUsed: string[];
};

/**
 * One agent tick:
 *   1. fetch live odds (the-odds-api)
 *   2. ask Claude to pick value bets within the mandate
 *   3. submit each pick via I-Wallet (ZK proof + mandate gate → sportsbook)
 *   4. write the intent + proof hash to Walrus
 *
 * Returns a structured result so both the CLI and the dev harness render the
 * same path. Per-pick failures are captured in `notes`, not thrown.
 */
export async function runTick(): Promise<TickResult> {
  const result: TickResult = {
    ts: Date.now(),
    events: [],
    picks: [],
    bets: [],
    notes: [],
    memoriesUsed: [],
  };

  result.events = await fetchUpcomingOdds();
  if (result.events.length === 0) {
    result.notes.push('no events from the-odds-api (check ODDS_API_KEY/quota)');
    return result;
  }

  // Recall the agent's own betting history so Claude reasons with its track record.
  result.memoriesUsed = await recallContext(
    'past sports betting decisions, outcomes, and strategy lessons',
  );

  result.picks = await pickBets(result.events, result.memoriesUsed);
  if (result.picks.length === 0) {
    result.notes.push('no value bets passed the filter this tick');
    return result;
  }

  const client = new IWalletClient();
  for (const pick of result.picks) {
    try {
      const { digest, marketId } = await client.placeBet(pick);
      const { blobId, url } = await logAuditTrail({ pick, txDigest: digest });
      result.bets.push({ pick, digest, marketId, blobId, url });
      // Remember the bet so future ticks can recall it.
      await rememberBet({
        sport: pick.sport,
        home: pick.home,
        away: pick.away,
        outcome: pick.outcome,
        odds: pick.odds,
        stake: pick.stake,
        rationale: pick.rationale,
        digest,
        marketId,
      });
    } catch (err) {
      result.notes.push(
        `bet failed for ${pick.marketId}: ${(err as Error).message}`,
      );
    }
  }
  return result;
}

async function main(): Promise<void> {
  const r = await runTick();
  console.log(`[agent] ${r.events.length} events, ${r.picks.length} picks`);
  for (const b of r.bets) {
    console.log(
      `[agent] placed ${b.pick.stake} on ${b.pick.outcome} @ ${b.pick.odds} ` +
        `(tx: ${b.digest}, audit: ${b.url ?? b.blobId})`,
    );
  }
  for (const n of r.notes) console.log(`[agent] note: ${n}`);
}

// Run as CLI only when invoked directly (not when imported by the harness).
if (process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')) {
  main().catch((err) => {
    console.error('[agent] fatal:', err);
    process.exit(1);
  });
}
