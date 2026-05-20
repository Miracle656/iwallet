import type { Market } from '../lib/types';
import MarketCard from './MarketCard';

export default function MarketGrid({ markets }: { markets: Market[] }) {
  if (markets.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed border-line bg-card py-20 text-sm text-muted">
        No markets in this category yet.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {markets.map((m) => (
        <MarketCard key={m.id} m={m} />
      ))}
    </div>
  );
}
