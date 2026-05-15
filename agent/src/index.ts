import 'dotenv/config';
import { fetchUpcomingOdds, type OddsEvent } from './odds.js';
import { pickBets, type Pick } from './picks.js';
import { IWalletClient } from './iwallet.js';
import { logAuditTrail } from './walrus.js';

/**
 * One agent tick:
 *   1. fetch live odds (the-odds-api)
 *   2. ask Claude to pick value bets within the mandate
 *   3. submit each pick via I-Wallet (ZK proof + mandate gate → sportsbook)
 *   4. write the intent + proof hash to Walrus
 *
 * Phase 3 (June 5–15): wire this into a polling loop with backoff and a
 * shutdown signal. Today this is single-shot scaffolding.
 */
async function tick(): Promise<void> {
  const events: OddsEvent[] = await fetchUpcomingOdds();
  if (events.length === 0) {
    console.log('[agent] no events available, skipping tick');
    return;
  }

  const picks: Pick[] = await pickBets(events);
  if (picks.length === 0) {
    console.log('[agent] no value bets passed the filter');
    return;
  }

  const client = new IWalletClient();
  for (const pick of picks) {
    try {
      const { digest } = await client.placeBet(pick);
      await logAuditTrail({ pick, txDigest: digest });
      console.log(
        `[agent] placed ${pick.stake} on ${pick.outcome} @ ${pick.odds} (tx: ${digest})`,
      );
    } catch (err) {
      console.error('[agent] bet failed:', pick, err);
    }
  }
}

async function main(): Promise<void> {
  await tick();
}

main().catch((err) => {
  console.error('[agent] fatal:', err);
  process.exit(1);
});
