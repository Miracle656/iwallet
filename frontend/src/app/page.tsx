import { LandingHero } from "@/components/landing/landing-hero";
import NameMarketplaceCard from "@/components/name-marketplace-card";

/**
 * Homepage — the Revolut-style landing (sky hero that collapses into the
 * center card), followed by everything the homepage had before: the
 * step-cycle hero and the live-data iWallet card.
 */
export default function Home() {
  return (
    <main className="bg-canvas text-ink">
      <LandingHero />

      {/* The page continues on the white the hero collapsed into. */}
      <section className="bg-white px-6 pt-10 pb-28 text-[#17160f]">
        <div className="mx-auto grid max-w-5xl gap-5 sm:grid-cols-3">
          <FeatureBlurb
            title="Create"
            body="Spin up an iWallet with a passkey — gas sponsored, no SUI needed."
          />
          <FeatureBlurb
            title="Mandate"
            body="Set a budget cap, an expiry and the venues the agent may touch."
          />
          <FeatureBlurb
            title="Monitor"
            body="Every order lands in the live feed; revoke the policy any time."
          />
        </div>
      </section>
      <NameMarketplaceCard />

      {/* Original homepage content — merged in below the landing. */}
      {/*<section className="bg-canvas px-5 py-24 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-7">
          <HomeHeroCycle />
          <HomeHeroCard />
        </div>
      </section>*/}
    </main>
  );
}

function FeatureBlurb({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_12px_32px_rgba(23,22,15,0.06)]">
      <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#5d5b52]">{body}</p>
    </div>
  );
}
