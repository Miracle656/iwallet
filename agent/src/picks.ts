import Anthropic from '@anthropic-ai/sdk';
import type { OddsEvent, Outcome } from './odds.js';

export type Pick = {
  /** sportsbook Move object ID this pick will be submitted against */
  marketId: string;
  outcome: Outcome;
  /** stake amount in the staking coin's base units (e.g. MIST for SUI) */
  stake: number;
  /** decimal odds for the chosen outcome, in bps (matches on-chain) */
  odds: number;
  /** Claude's one-line rationale — surfaced in the UI + audit trail */
  rationale: string;
};

const client = new Anthropic(); // ANTHROPIC_API_KEY from env

/**
 * Ask Claude to pick value bets given live odds and the mandate caps.
 *
 * Strategy:
 *   - Compute implied probability from odds (1/decimal).
 *   - Let Claude estimate true probability per game using context.
 *   - Take EV = (true_p * odds - 1); positive = value bet.
 *   - Stake via a fractional-Kelly cap (never exceed max_amount_per_trade).
 *
 * Today this is a stub returning []. Phase 3 wires the real call against
 * claude-opus-4-7 with prompt caching on the system prompt.
 */
export async function pickBets(events: OddsEvent[]): Promise<Pick[]> {
  if (events.length === 0) return [];

  // TODO Phase 3: real call. Sketch:
  //
  //   const msg = await client.messages.create({
  //     model: 'claude-opus-4-7',
  //     max_tokens: 1024,
  //     system: [
  //       { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
  //     ],
  //     messages: [{ role: 'user', content: JSON.stringify({ events, mandate: ... }) }],
  //   });
  //   return parsePicks(msg);

  return [];
}
