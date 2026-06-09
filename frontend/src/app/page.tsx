import { HomeHeroCycle } from "@/components/home-hero-cycle";
import { HomeHeroCard } from "@/components/home-hero-card";

export default function Home() {
  return (
    <main className="min-h-screen bg-canvas text-ink">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 pb-6 pt-36 sm:px-8">
        <section className="flex flex-1 flex-col items-center justify-center gap-7 py-12">
          <HomeHeroCycle />
          <HomeHeroCard />
        </section>
      </div>
    </main>
  );
}
