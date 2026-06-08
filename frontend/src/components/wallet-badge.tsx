import { HashText } from "@/components/hash-text";
import { HiOutlineWallet } from "react-icons/hi2";

export function WalletBadge({ name, objectId, size = "md" }: { name: string; objectId: string; size?: "sm" | "md" }) {
  const box = size === "md" ? "h-11 w-11" : "h-9 w-9";

  return (
    <div className="flex items-center gap-3">
      <div className={`${box} grid place-items-center rounded-2xl border border-border bg-elevated text-lg text-accent`}>
        <HiOutlineWallet />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{name}</p>
        <HashText value={objectId} chars={6} />
      </div>
    </div>
  );
}
