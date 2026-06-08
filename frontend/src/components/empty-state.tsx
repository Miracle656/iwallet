import Link from "next/link";

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-border bg-surface/80 p-8 text-center">
      <p className="text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted">{description}</p>
      <Link href={actionHref} className="mt-5 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-on-accent transition hover:bg-accent-soft">
        {actionLabel}
      </Link>
    </div>
  );
}
