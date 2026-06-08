export type IWalletStatus = "active" | "unfunded" | "frozen" | "unlinked";

export type IWallet = {
  id: string;
  name: string;
  objectId: string;
  status: IWalletStatus;
  network: "sui-testnet";
  balance: {
    totalUsd?: number;
    tokens: Array<{
      symbol: string;
      amount: number;
    }>;
  };
  linkedAgent?: {
    id: string;
    name: string;
    type: string;
    source: string;
    status: "linked" | "unlinked";
  };
  identityHash: string;
  createdAt: string;
  lastTransactionAt?: string;
  policy: {
    maxPerTransaction: string;
    sessionLimit: string;
    expiry: string;
    allowedTargets: string[];
  };
};

export type ProcessedTransaction = {
  id: string;
  walletId: string;
  type: "fund" | "agent_payment" | "withdraw" | "proof_verified" | "policy_check";
  status: "pending" | "processed" | "failed" | "verified";
  amount?: number;
  token?: string;
  target?: string;
  digest?: string;
  proofStatus?: "verified" | "pending" | "failed";
  walrusStatus?: "stored" | "pending" | "none";
  timestamp: string;
};

export const iwallets: IWallet[] = [
  {
    id: "demo",
    name: "Operations iWallet",
    objectId: "0x7f3a2c91b8e4d5f0cafe1138a6b4e92019ad7c33",
    status: "active",
    network: "sui-testnet",
    balance: {
      totalUsd: 194.4,
      tokens: [
        { symbol: "SUI", amount: 120 },
        { symbol: "USDC", amount: 48 },
      ],
    },
    linkedAgent: {
      id: "agent-nova",
      name: "Nova trading runner",
      type: "Autonomous execution agent",
      source: "External daemon",
      status: "linked",
    },
    identityHash: "0x91b0b36822b7a86e63f91e89f74b4a3a8b6c0d94045c1250f61e8ef1ad6d9284",
    createdAt: "18 May 2026",
    lastTransactionAt: "09:43",
    policy: {
      maxPerTransaction: "25 SUI",
      sessionLimit: "120 SUI",
      expiry: "21 Jun 2026",
      allowedTargets: ["sportsbook::place_bet", "payments::transfer"],
    },
  },
  {
    id: "treasury",
    name: "Treasury automation wallet",
    objectId: "0x4bc8f2b177c19a4423bb09f6d2a7190cc23aa0be",
    status: "unfunded",
    network: "sui-testnet",
    balance: {
      totalUsd: 0,
      tokens: [{ symbol: "SUI", amount: 0 }],
    },
    linkedAgent: {
      id: "agent-kairo",
      name: "Kairo treasury monitor",
      type: "Treasury automation",
      source: "User-hosted workflow",
      status: "linked",
    },
    identityHash: "0x2f79b6d149ea834f963a2ed0836fdf904227c5b12371856be9d74a2af7c8d301",
    createdAt: "17 May 2026",
    policy: {
      maxPerTransaction: "10 SUI",
      sessionLimit: "40 SUI",
      expiry: "30 Jun 2026",
      allowedTargets: ["payments::transfer"],
    },
  },
  {
    id: "research",
    name: "Research execution wallet",
    objectId: "0x0e90289df87ac39152bb40fd6b5a780a9924f26d",
    status: "unlinked",
    network: "sui-testnet",
    balance: {
      totalUsd: 31.2,
      tokens: [{ symbol: "SUI", amount: 24 }],
    },
    identityHash: "0xb0bbd28eacb028342a66c3388f6436250a33ab83207fbb4b5e1a390331cc9d77",
    createdAt: "16 May 2026",
    lastTransactionAt: "Yesterday",
    policy: {
      maxPerTransaction: "5 SUI",
      sessionLimit: "25 SUI",
      expiry: "15 Jul 2026",
      allowedTargets: ["research::submit_order"],
    },
  },
];

export const processedTransactions: ProcessedTransaction[] = [
  {
    id: "tx-001",
    walletId: "demo",
    type: "agent_payment",
    status: "processed",
    amount: 12,
    token: "SUI",
    target: "sportsbook::place_bet",
    digest: "9Pxb2qA8xJtVdS4mz2YccVhK1fPr5Wn39a",
    proofStatus: "verified",
    walrusStatus: "pending",
    timestamp: "09:43",
  },
  {
    id: "tx-002",
    walletId: "demo",
    type: "policy_check",
    status: "verified",
    target: "Policy limits evaluated",
    proofStatus: "verified",
    walrusStatus: "none",
    timestamp: "09:42",
  },
  {
    id: "tx-003",
    walletId: "demo",
    type: "proof_verified",
    status: "verified",
    target: "Identity hash matched",
    proofStatus: "verified",
    walrusStatus: "none",
    timestamp: "09:42",
  },
  {
    id: "tx-004",
    walletId: "demo",
    type: "fund",
    status: "processed",
    amount: 120,
    token: "SUI",
    target: "Owner wallet",
    digest: "E4v6wC1pL9mQ2rS7tX8yZ0aB3cD5eF6gH",
    proofStatus: "pending",
    walrusStatus: "stored",
    timestamp: "09:31",
  },
  {
    id: "tx-005",
    walletId: "research",
    type: "agent_payment",
    status: "failed",
    amount: 8,
    token: "SUI",
    target: "research::submit_order",
    proofStatus: "failed",
    walrusStatus: "stored",
    timestamp: "Yesterday",
  },
];

export const createSteps = [
  "Connect the owner Sui wallet",
  "Name the iWallet and choose the existing agent it will serve",
  "Register linked-agent metadata and a local identity hash",
  "Create the iWallet object on Sui testnet",
  "Fund the iWallet and monitor processed transactions",
];

export const identityVisuals = [
  { label: "Ledger", code: "IW-1", accent: "border-[#298dff]/40 bg-[#298dff]/10 text-[#298dff]" },
  { label: "Vault", code: "IW-2", accent: "border-white/10 bg-[#222328] text-[#e5eef1]" },
  { label: "Relay", code: "IW-3", accent: "border-orange-300/35 bg-orange-300/10 text-orange-100" },
  { label: "Sentinel", code: "IW-4", accent: "border-white/10 bg-[#18191c] text-[#b9c2c6]" },
];

export function getWallet(id: string) {
  return iwallets.find((wallet) => wallet.id === id) ?? iwallets[0];
}

export function getWalletTransactions(walletId: string) {
  return processedTransactions.filter((transaction) => transaction.walletId === walletId);
}
