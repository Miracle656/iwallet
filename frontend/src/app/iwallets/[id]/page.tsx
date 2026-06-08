import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { AnimatedHoverText } from "@/components/animated-hover-text";
import { HashText } from "@/components/hash-text";
import { IWalletProfile } from "@/components/iwallet-profile";
import { getActivity, getProfile } from "@/lib/sui-client";

export default async function IWalletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [profile, activity] = await Promise.all([getProfile(id), getActivity(id)]);

  if (!profile) {
    return (
      <AppShell eyebrow="iWallet" title="Not found" description="This identity object could not be read from Sui.">
        <section className="rounded-[2.4rem] border border-white/10 bg-[#131416] p-7">
          <p className="text-sm text-[#92979d]">
            No <code className="text-[#e5eef1]">IIdentity</code> object exists at <HashText value={id} chars={10} /> on the configured network.
          </p>
          <Link href="/iwallets" data-hover-trigger className="mt-5 inline-flex rounded-full bg-[#222328] px-5 py-2.5 text-sm font-semibold text-[#e5eef1] hover:text-[#298dff]">
            <AnimatedHoverText>Back to iWallets</AnimatedHoverText>
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell eyebrow="iWallet profile" title={profile.name} description="On-chain portfolio, agent policy, and activity.">
      <IWalletProfile profile={profile} activity={activity} />
    </AppShell>
  );
}
