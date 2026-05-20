export type Outcome = 'home' | 'away' | 'draw';

export type Market = {
  id: string;
  sport: string;
  sportLabel: string;
  home: string;
  away: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  /** Total pool volume in MIST (or arbitrary unit for mock). */
  volume?: number;
  /** Unix ms. */
  closesAt?: number;
  /** True if this market has a real Sui object id we'd actually bet against. */
  live?: boolean;
  /** Whether the agent has any picks routed here in the current feed. */
  agentActive?: boolean;
};

export type PickStatus = 'onchain' | 'reverted' | 'stub';

export type AgentPick = {
  ts: number;
  marketId: string;
  marketTitle: string;
  outcome: Outcome;
  stake: number;
  odds: number;
  rationale: string;
  txDigest: string;
  auditUrl?: string;
  /** On-chain Market object id the agent minted + bet into. */
  onchainMarketId?: string;
  status: PickStatus;
  /** When status === 'reverted', the on-chain abort reason. */
  failReason?: string;
};

/** Shape of the agent harness /state endpoint we depend on. */
export type HarnessState = {
  lastTick: {
    ts: number;
    events: Array<{
      id: string;
      sport: string;
      home: string;
      away: string;
      commenceTime: number;
      bookmakerOdds: { home: number; away: number; draw?: number };
    }>;
    picks: Array<{
      marketId: string;
      outcome: Outcome;
      stake: number;
      odds: number;
      rationale: string;
    }>;
    bets: Array<{
      pick: {
        marketId: string;
        outcome: Outcome;
        stake: number;
        odds: number;
        rationale: string;
      };
      digest: string;
      marketId: string;
      blobId: string;
      url?: string;
    }>;
    notes: string[];
    memoriesUsed?: string[];
  } | null;
  walrusTest: { blobId: string; url?: string; ts: number } | null;
};
