"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const RobotCanvas = dynamic(() => import("./robot-canvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

gsap.registerPlugin(ScrollTrigger);

/**
 * Revolut-style intro: a dark hero with a white rounded rectangle framing the
 * 3D robot. On scroll the rectangle expands into the full white page
 * (clip-path, scrubbed), the robot card "cuts out" of it and settles into the
 * middle slot of a three-card row, then the side cards rise in beside it.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const whitePanelRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const robotCardRef = useRef<HTMLDivElement>(null);
  const sideCardsRef = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const panel = whitePanelRef.current;
    const card = robotCardRef.current;
    if (!section || !panel || !card) return;

    // offset* metrics ignore transforms, so re-measuring on refresh is safe
    // even mid-animation. The white panel spans the sticky viewport, so these
    // are effectively viewport coordinates.
    const metrics = () => {
      const vw = panel.clientWidth;
      const vh = panel.clientHeight;
      const cardW = card.offsetWidth;
      const cardH = card.offsetHeight;
      // Walk offsets up to the panel (the cards row isn't positioned).
      let left = 0;
      let top = 0;
      let node: HTMLElement | null = card;
      while (node && node !== panel) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      // The intro rectangle: centered, sitting in the lower half under the
      // dark hero copy, with a thin white frame around the scaled-up card.
      const frame = 16;
      const rectW = Math.min(vw * 0.86, 480);
      const rectH = Math.min(vh * 0.54, 540);
      const rectCx = vw / 2;
      const rectCy = vh * 0.66;
      const scale = Math.min((rectW - frame * 2) / cardW, (rectH - frame * 2) / cardH);
      return { vw, vh, cardW, cardH, left, top, rectW, rectH, rectCx, rectCy, scale };
    };

    const mm = gsap.matchMedia();

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.5,
          invalidateOnRefresh: true,
        },
      });

      tl.fromTo(
        introRef.current,
        { autoAlpha: 1, y: 0 },
        { autoAlpha: 0, y: -70, duration: 0.25 },
        0,
      );

      tl.fromTo(
        panel,
        {
          clipPath: () => {
            const m = metrics();
            const l = m.rectCx - m.rectW / 2;
            const t = m.rectCy - m.rectH / 2;
            const r = m.vw - (m.rectCx + m.rectW / 2);
            const b = m.vh - (m.rectCy + m.rectH / 2);
            return `inset(${t}px ${r}px ${b}px ${l}px round 28px)`;
          },
        },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.5 },
        0.1,
      );

      tl.fromTo(
        card,
        {
          x: () => {
            const m = metrics();
            return m.rectCx - (m.left + m.cardW / 2);
          },
          y: () => {
            const m = metrics();
            return m.rectCy - (m.top + m.cardH / 2);
          },
          scale: () => metrics().scale,
        },
        { x: 0, y: 0, scale: 1, duration: 0.5 },
        0.1,
      );

      tl.fromTo(
        headingRef.current,
        { autoAlpha: 0, y: 32 },
        { autoAlpha: 1, y: 0, duration: 0.2 },
        0.55,
      );

      tl.fromTo(
        sideCardsRef.current.filter(Boolean),
        { autoAlpha: 0, y: 90 },
        { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.08 },
        0.62,
      );

      return () => {
        tl.scrollTrigger?.kill();
        tl.kill();
      };
    });

    // Reduced motion: skip the choreography, land on the finished page.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      gsap.set(panel, { clipPath: "inset(0px 0px 0px 0px round 0px)" });
      gsap.set(introRef.current, { autoAlpha: 0 });
      gsap.set(headingRef.current, { autoAlpha: 1, y: 0 });
      gsap.set(sideCardsRef.current.filter(Boolean), { autoAlpha: 1, y: 0 });
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Phase 1 — dark hero */}
        <div className="absolute inset-0 bg-canvas">
          <div
            ref={introRef}
            className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-6 pt-[16vh] text-center"
          >
            <h1 className="text-[clamp(2.2rem,7vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.045em] text-ink">
              Your agent&rsquo;s wallet, governed.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted">
              Give an AI agent its own iWallet — budget-capped, time-boxed,
              revocable. Every trade proved on-chain.
            </p>
            <Link
              href="/iwallets/create"
              className="rounded-full bg-ink px-7 py-3.5 text-sm font-medium text-canvas transition-transform hover:scale-[1.03]"
            >
              Create your iWallet
            </Link>
          </div>
        </div>

        {/* Phase 2 — the white page the rectangle expands into */}
        <div
          ref={whitePanelRef}
          className="absolute inset-0 bg-[#f5f4f0] text-[#17160f]"
          style={{ clipPath: "inset(38% 30% 12% 30% round 28px)" }}
        >
          <div className="flex h-full flex-col items-center justify-center gap-9 px-6">
            <div ref={headingRef} className="max-w-2xl text-center opacity-0">
              <h2 className="text-[clamp(1.8rem,4.5vw,3.25rem)] font-semibold leading-[1.08] tracking-[-0.04em]">
                Set the rules. Watch it trade.
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-[#5d5b52]">
                Budgets, expiries and allowed venues are enforced by the
                contract — not by trust.
              </p>
              <Link
                href="/agents"
                className="mt-6 inline-block rounded-full bg-[#17160f] px-7 py-3.5 text-sm font-medium text-[#f5f4f0] transition-transform hover:scale-[1.03]"
              >
                Watch agents trade
              </Link>
            </div>

            <div className="flex items-end justify-center gap-5">
              <BalanceCard
                ref={(node) => {
                  sideCardsRef.current[0] = node;
                }}
                label="Personal · SUI"
                amount="2.40 SUI"
                pill="Accounts"
                chipTitle="DeepBook order"
                chipMeta="Placed · just now"
                chipAmount="-0.50"
                className="hidden bg-gradient-to-b from-[#dcecff] to-white sm:flex"
              />

              {/* The cut-out card — starts scaled up inside the intro rectangle */}
              <div
                ref={robotCardRef}
                className="relative flex h-96 w-72 flex-col overflow-hidden rounded-[28px] bg-gradient-to-b from-[#4aa3ff] to-[#10477f] shadow-[0_24px_60px_rgba(16,71,127,0.35)]"
              >
                <div className="absolute inset-0">
                  <RobotCanvas />
                </div>
                <div className="relative z-10 flex flex-col items-center gap-1.5 pt-6 text-white">
                  <span className="text-[11px] uppercase tracking-wide text-white/75">
                    Agent · iWallet
                  </span>
                  <span className="text-3xl font-semibold tracking-tight">6.01 SUI</span>
                  <span className="rounded-full bg-white px-3.5 py-1 text-xs font-medium text-[#17160f]">
                    Autonomous
                  </span>
                </div>
                <div className="relative z-10 mt-auto flex justify-center gap-2 pb-5">
                  <span className="rounded-md bg-black/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    ⛓ Policy on-chain
                  </span>
                  <span className="rounded-md bg-white px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#17160f]">
                    Replay-safe
                  </span>
                </div>
              </div>

              <BalanceCard
                ref={(node) => {
                  sideCardsRef.current[1] = node;
                }}
                label="Owner · Passkey"
                amount="2.35 SUI"
                pill="Accounts"
                chipTitle="Revoke policy"
                chipMeta="One click, any time"
                chipAmount=""
                className="hidden bg-gradient-to-b from-[#eceae2] to-white sm:flex"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type BalanceCardProps = {
  ref?: (node: HTMLDivElement | null) => void;
  label: string;
  amount: string;
  pill: string;
  chipTitle: string;
  chipMeta: string;
  chipAmount: string;
  className?: string;
};

function BalanceCard({
  ref,
  label,
  amount,
  pill,
  chipTitle,
  chipMeta,
  chipAmount,
  className = "",
}: BalanceCardProps) {
  return (
    <div
      ref={ref}
      className={`h-80 w-60 flex-col rounded-[24px] border border-black/5 p-5 opacity-0 shadow-[0_18px_44px_rgba(23,22,15,0.10)] ${className}`}
    >
      <div className="flex flex-col items-center gap-1.5 pt-2 text-[#17160f]">
        <span className="text-[11px] uppercase tracking-wide text-[#5d5b52]">{label}</span>
        <span className="text-2xl font-semibold tracking-tight">{amount}</span>
        <span className="rounded-full bg-[#17160f] px-3.5 py-1 text-xs font-medium text-white">
          {pill}
        </span>
      </div>
      <div className="mt-auto flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/15 text-xs">
          ◎
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium text-[#17160f]">{chipTitle}</span>
          <span className="truncate text-[10px] text-[#8a877b]">{chipMeta}</span>
        </span>
        {chipAmount ? (
          <span className="text-xs font-medium text-[#17160f]">{chipAmount}</span>
        ) : null}
      </div>
    </div>
  );
}
