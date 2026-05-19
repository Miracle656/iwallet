import Link from "next/link";

export function EmptyState({ title, description, actionHref, actionLabel }: { title: string; description: string; actionHref: string; actionLabel: string }) {
  return (
    <div className="rounded-[1.8rem] border border-dashed border-white/15 bg-[#131416]/80 p-8 text-center">
      <p className="text-lg font-semibold text-[#e5eef1]">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#92979d]">{description}</p>
      <Link href={actionHref} className="mt-5 inline-flex rounded-full bg-[#fbff6c] px-5 py-2.5 text-sm font-semibold text-[#131416] transition hover:bg-[#f7ff8f]">
        {actionLabel}
      </Link>
    </div>
  );
}
