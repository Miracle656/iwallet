export function AppShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#101113] text-[#e5eef1]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 pb-6 pt-36 sm:px-8 lg:px-10">
        <section className="rounded-[2.2rem] py-5 lg:py-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <p className="sr-only">{eyebrow}</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-[#e5eef1] sm:text-4xl">{title}</h1>
            </div>
            <p className="max-w-md text-sm leading-6 text-[#92979d]">{description}</p>
          </div>
        </section>

        {children}
      </div>
    </main>
  );
}
