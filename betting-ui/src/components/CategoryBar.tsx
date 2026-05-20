import { CATEGORIES } from '../lib/markets';

export default function CategoryBar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (c: string) => void;
}) {
  return (
    <div className="border-b border-line bg-card">
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => onSelect(c)}
            className={
              'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
              (active === c
                ? 'bg-ink text-card'
                : 'text-muted hover:bg-bg hover:text-ink')
            }
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
