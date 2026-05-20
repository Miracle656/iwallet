import { useMemo, useState } from 'react';
import Header from './components/Header';
import CategoryBar from './components/CategoryBar';
import MarketGrid from './components/MarketGrid';
import AgentFeed from './components/AgentFeed';
import { MARKETS } from './lib/markets';

export default function App() {
  const [category, setCategory] = useState('Trending');

  const markets = useMemo(() => {
    if (category === 'Trending') return MARKETS;
    return MARKETS.filter((m) => m.sportLabel === category);
  }, [category]);

  return (
    <div className="min-h-screen bg-bg">
      <Header />
      <CategoryBar active={category} onSelect={setCategory} />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-bold">Markets</h1>
            <p className="text-sm text-muted">
              Bet yourself, or let an autonomous ZK-governed agent do it.
            </p>
          </div>
          <span className="hidden text-xs text-muted sm:block">
            {markets.length} market{markets.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
          <MarketGrid markets={markets} />
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)]">
            <AgentFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
