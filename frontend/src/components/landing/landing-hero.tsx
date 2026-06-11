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
 * Revolut-style intro. Phase 1 is a full-bleed sky scene: robot standing
 * center-right, a thin outlined rectangle over it with the balance, headline
 * on the left. On scroll the scene collapses into the middle card of the
 * white page (clip-path + FLIP transforms, scrubbed), then the heading and
 * the two color-tweaked robot cards rise in around it.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const skyRef = useRef<HTMLDivElement>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const outlineRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const sideCardsRef = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const sky = skyRef.current;
    const slot = slotRef.current;
    const outline = outlineRef.current;
    const canvasWrap = canvasWrapRef.current;
    if (!section || !sky || !slot || !outline || !canvasWrap) return;

    // Where the scene must land: the placeholder slot in the cards row.
    // offset* metrics ignore transforms so re-measuring on refresh is safe;
    // the offsetParent chain ends at the white page layer (inset-0 = viewport).
    const metrics = () => {
      const vw = sky.clientWidth;
      const vh = sky.clientHeight;
      let left = 0;
      let top = 0;
      let node: HTMLElement | null = slot;
      while (node && node !== sky.parentElement) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      const w = slot.offsetWidth;
      const h = slot.offsetHeight;
      return { vw, vh, slot: { left, top, w, h, cx: left + w / 2, cy: top + h / 2 } };
    };

    // Hero geometry (must match the inline styles below): both the outline
    // and the canvas are centered on (55vw, 52vh).
    const hero = (vw: number, vh: number) => ({
      cx: vw * 0.55,
      cy: vh * 0.52,
      outlineW: vh * 0.54,
      canvasH: vh * 1.1,
    });

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

      // Headline block exits left.
      tl.fromTo(
        introRef.current,
        { autoAlpha: 1, x: 0 },
        { autoAlpha: 0, x: -80, duration: 0.25 },
        0,
      );

      // Sky clips down to exactly the card slot.
      tl.fromTo(
        sky,
        { clipPath: "inset(0px 0px 0px 0px round 0px)" },
        {
          clipPath: () => {
            const m = metrics();
            const r = m.vw - (m.slot.left + m.slot.w);
            const b = m.vh - (m.slot.top + m.slot.h);
            return `inset(${m.slot.top}px ${r}px ${b}px ${m.slot.left}px round 28px)`;
          },
          duration: 0.55,
        },
        0.08,
      );

      // The robot rides along: shrink + recenter onto the slot.
      tl.fromTo(
        canvasWrap,
        { x: 0, y: 0, scale: 1 },
        {
          x: () => {
            const m = metrics();
            return m.slot.cx - hero(m.vw, m.vh).cx;
          },
          y: () => {
            const m = metrics();
            return m.slot.cy - hero(m.vw, m.vh).cy;
          },
          scale: () => {
            const m = metrics();
            return (m.slot.h * 1.18) / hero(m.vw, m.vh).canvasH;
          },
          duration: 0.55,
        },
        0.08,
      );

      // The outlined rectangle becomes the card frame (same aspect ratio).
      tl.fromTo(
        outline,
        { x: 0, y: 0, scale: 1 },
        {
          x: () => {
            const m = metrics();
            return m.slot.cx - hero(m.vw, m.vh).cx;
          },
          y: () => {
            const m = metrics();
            return m.slot.cy - hero(m.vw, m.vh).cy;
          },
          scale: () => {
            const m = metrics();
            return m.slot.w / hero(m.vw, m.vh).outlineW;
          },
          duration: 0.55,
        },
        0.08,
      );

      // The thin border melts away once the clip takes over the card shape.
      tl.fromTo(
        outline,
        { borderColor: "rgba(255,255,255,0.7)" },
        { borderColor: "rgba(255,255,255,0)", duration: 0.15 },
        0.5,
      );

      tl.fromTo(
        headingRef.current,
        { autoAlpha: 0, y: 32 },
        { autoAlpha: 1, y: 0, duration: 0.2 },
        0.55,
      );

      tl.fromTo(
        chipsRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.15 },
        0.62,
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

    // Reduced motion: land directly on the finished page.
    mm.add("(prefers-reduced-motion: reduce)", () => {
      const m = metrics();
      const h = hero(m.vw, m.vh);
      const r = m.vw - (m.slot.left + m.slot.w);
      const b = m.vh - (m.slot.top + m.slot.h);
      gsap.set(sky, {
        clipPath: `inset(${m.slot.top}px ${r}px ${b}px ${m.slot.left}px round 28px)`,
      });
      gsap.set(canvasWrap, {
        x: m.slot.cx - h.cx,
        y: m.slot.cy - h.cy,
        scale: (m.slot.h * 1.18) / h.canvasH,
      });
      gsap.set(outline, {
        x: m.slot.cx - h.cx,
        y: m.slot.cy - h.cy,
        scale: m.slot.w / h.outlineW,
        borderColor: "rgba(255,255,255,0)",
      });
      gsap.set(introRef.current, { autoAlpha: 0 });
      gsap.set(headingRef.current, { autoAlpha: 1 });
      gsap.set(chipsRef.current, { autoAlpha: 1 });
      gsap.set(sideCardsRef.current.filter(Boolean), { autoAlpha: 1, y: 0 });
    });

    return () => mm.revert();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[300vh]">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Base layer — the white page revealed as the sky collapses */}
        <div className="absolute inset-0 bg-[#f5f4f0] text-[#17160f]">
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
              <RobotBalanceCard
                ref={(node) => {
                  sideCardsRef.current[0] = node;
                }}
                label="Personal · SUI"
                amount="2.40 SUI"
                accent="#ffb054"
                gradient="bg-gradient-to-b from-[#e8a94e] to-[#7a4a12]"
                chipTitle="DeepBook order"
                chipMeta="Placed · just now"
                chipAmount="-0.50"
              />

              {/* Placeholder slot — the sky scene lands exactly here */}
              <div ref={slotRef} className="h-96 w-72 rounded-[28px]" />

              <RobotBalanceCard
                ref={(node) => {
                  sideCardsRef.current[1] = node;
                }}
                label="Owner · Passkey"
                amount="2.35 SUI"
                accent="#b39dff"
                gradient="bg-gradient-to-b from-[#8f76e8] to-[#33245f]"
                chipTitle="Revoke policy"
                chipMeta="One click, any time"
                chipAmount=""
              />
            </div>
          </div>
        </div>

        {/* Sky scene — full-bleed, clips down to the slot on scroll */}
        <div
          ref={skyRef}
          className="absolute inset-0 bg-gradient-to-b from-[#8fc1ff] via-[#5ba6fb] to-[#298dff]"
          style={{ clipPath: "inset(0px 0px 0px 0px round 0px)" }}
        >
          {/* Robot — centered on (55vw, 52vh), taller than the viewport so it
              feels like it's standing in the scene */}
          <div
            ref={canvasWrapRef}
            className="absolute"
            style={{
              width: "90vh",
              height: "110vh",
              left: "calc(55vw - 45vh)",
              top: "calc(52vh - 55vh)",
            }}
          >
            <RobotCanvas accent="#cfe6ff" />
          </div>
        </div>

        {/* Outlined rectangle — same center as the robot, card aspect ratio */}
        <div
          ref={outlineRef}
          className="pointer-events-none absolute rounded-[28px] border"
          style={{
            width: "54vh",
            height: "72vh",
            left: "calc(55vw - 27vh)",
            top: "calc(52vh - 36vh)",
            borderColor: "rgba(255,255,255,0.7)",
          }}
        >
          <div className="flex flex-col items-center gap-1.5 pt-[7vh] text-white">
            <span className="text-xs uppercase tracking-wide text-white/80">Agent</span>
            <span className="text-4xl font-semibold tracking-tight drop-shadow-sm">
              6.01 SUI
            </span>
            <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#17160f]">
              Accounts
            </span>
          </div>
          <div
            ref={chipsRef}
            className="absolute inset-x-0 bottom-[4vh] flex justify-center gap-2 opacity-0"
          >
            <span className="rounded-md bg-black/80 px-2.5 py-1.5 text-[1.4vh] font-semibold uppercase tracking-wide text-white">
              ⛓ Policy on-chain
            </span>
            <span className="rounded-md bg-white px-2.5 py-1.5 text-[1.4vh] font-semibold uppercase tracking-wide text-[#17160f]">
              Replay-safe
            </span>
          </div>
        </div>

        {/* Headline — left, over the sky */}
        <div
          ref={introRef}
          className="absolute left-[7vw] top-[26vh] max-w-xl text-white"
        >
          <h1 className="text-[clamp(2.4rem,5.5vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
            Agents &amp; Beyond
          </h1>
          <p className="mt-5 max-w-md text-base leading-7 text-white/90">
            This is your agent&rsquo;s wallet, redefined. Budget-capped,
            time-boxed, revocable — every trade proved on-chain.
          </p>
          <Link
            href="/iwallets/create"
            className="mt-7 inline-block rounded-full bg-[#17160f] px-7 py-3.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
          >
            Create your iWallet
          </Link>
        </div>
      </div>
    </section>
  );
}

type RobotBalanceCardProps = {
  ref?: (node: HTMLDivElement | null) => void;
  label: string;
  amount: string;
  accent: string;
  gradient: string;
  chipTitle: string;
  chipMeta: string;
  chipAmount: string;
};

/** Side card: a color-tweaked duplicate of the robot behind the balance. */
function RobotBalanceCard({
  ref,
  label,
  amount,
  accent,
  gradient,
  chipTitle,
  chipMeta,
  chipAmount,
}: RobotBalanceCardProps) {
  return (
    <div
      ref={ref}
      className={`relative hidden h-80 w-60 flex-col overflow-hidden rounded-[24px] opacity-0 shadow-[0_18px_44px_rgba(23,22,15,0.18)] sm:flex ${gradient}`}
    >
      <div className="absolute inset-0">
        <RobotCanvas accent={accent} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1.5 pt-6 text-white">
        <span className="text-[11px] uppercase tracking-wide text-white/80">{label}</span>
        <span className="text-2xl font-semibold tracking-tight">{amount}</span>
        <span className="rounded-full bg-white px-3.5 py-1 text-xs font-medium text-[#17160f]">
          Accounts
        </span>
      </div>
      <div className="relative z-10 mt-auto flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm m-3">
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
