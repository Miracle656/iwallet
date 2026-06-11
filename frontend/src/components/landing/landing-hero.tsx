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

const SKY_GRADIENT =
  "linear-gradient(to bottom, #8fc1ff 0%, #5ba6fb 55%, #298dff 100%)";

/**
 * Revolut-style intro, matching their actual mechanic:
 *  - the sky scene (robot + headline + outlined rectangle) stays full-bleed;
 *  - a white rounded panel grows from the center over it, next heading
 *    already inside and fading in;
 *  - the outlined rectangle is the one region the panel never covers — it
 *    keeps showing the scene (a pixel-aligned replica) and shrinks into the
 *    middle card slot, then the side cards rise in.
 * Pinned via ScrollTrigger (CSS sticky is broken by the global
 * `overflow-x: hidden` on body), scrubbed over 2 extra viewports of scroll.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const introCloneRef = useRef<HTMLDivElement>(null);
  const heroRobotRef = useRef<HTMLDivElement>(null);
  const cardRobotRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const sideCardsRef = useRef<Array<HTMLDivElement | null>>([]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const panel = panelRef.current;
    const focus = focusRef.current;
    const inner = innerRef.current;
    const slot = slotRef.current;
    if (!section || !panel || !focus || !inner || !slot) return;

    // Where the focus card must land: the placeholder slot in the cards row.
    // offset* metrics ignore transforms, so re-measuring on refresh is safe;
    // the chain ends at the panel (inset-0 = viewport when pinned).
    const metrics = () => {
      const vw = panel.clientWidth;
      const vh = panel.clientHeight;
      let left = 0;
      let top = 0;
      let node: HTMLElement | null = slot;
      while (node && node !== panel.parentElement) {
        left += node.offsetLeft;
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      const w = slot.offsetWidth;
      const h = slot.offsetHeight;
      // Hero geometry — must match the inline styles below.
      const heroCx = vw * 0.55;
      const heroCy = vh * 0.52;
      const outlineW = vh * 0.54;
      const outlineH = vh * 0.72;
      return {
        vw,
        vh,
        heroCx,
        heroCy,
        outlineW,
        outlineH,
        slot: { left, top, w, h, cx: left + w / 2, cy: top + h / 2 },
      };
    };

    // Counter-zoom factor for the replica: the whole robot (~96vh tall in
    // replica space) should end up at ~115% of the slot height.
    const zoom = (m: ReturnType<typeof metrics>) => {
      const cardScale = m.slot.w / m.outlineW;
      return (m.slot.h * 1.15) / (m.vh * 0.96 * cardScale);
    };

    // Single source of truth for the hero geometry. The inline CSS uses
    // vw/vh as a first paint, but CSS 100vw includes the scrollbar while the
    // JS metrics don't — mixing the two drifts every hand-off by ~10px, so
    // the pixel values are re-set from JS here (and on every ST refresh).
    const applyGeometry = () => {
      const m = metrics();
      gsap.set(focus, {
        left: m.heroCx - m.outlineW / 2,
        top: m.heroCy - m.outlineH / 2,
        width: m.outlineW,
        height: m.outlineH,
      });
      gsap.set(inner, {
        width: m.vw,
        height: m.vh,
        left: m.outlineW / 2 - m.heroCx,
        top: m.outlineH / 2 - m.heroCy,
      });
      const canvasBox = {
        width: m.vh * 0.9,
        height: m.vh * 1.1,
        left: m.heroCx - m.vh * 0.45,
        top: m.heroCy - m.vh * 0.55,
      };
      if (heroRobotRef.current) gsap.set(heroRobotRef.current, canvasBox);
      if (cardRobotRef.current) gsap.set(cardRobotRef.current, canvasBox);
    };

    const intros = [introRef.current, introCloneRef.current].filter(Boolean);
    const sideCards = sideCardsRef.current.filter(Boolean);
    const animated = [
      panel,
      focus,
      inner,
      heroRobotRef.current,
      headingRef.current,
      chipsRef.current,
      ...intros,
      ...sideCards,
    ].filter(Boolean) as HTMLElement[];

    let tl: gsap.core.Timeline | null = null;

    const teardown = () => {
      tl?.scrollTrigger?.kill();
      tl?.kill();
      tl = null;
      // Wipe every inline value we may have set so the next build measures
      // a clean layout (the CSS vw/vh styles remain as the base).
      gsap.set(animated, { clearProps: "all" });
    };

    // Everything is computed ONCE per build from a single measurement pass —
    // no functional values, no refresh-time re-evaluation. Recomputing
    // geometry mid-scrub is what caused the fast-scroll jumps.
    const build = () => {
      applyGeometry();
      const m = metrics();
      const z = zoom(m);
      const cardX = m.slot.cx - m.heroCx;
      const cardY = m.slot.cy - m.heroCy;
      const cardScale = m.slot.w / m.outlineW;
      const innerX = (1 - z) * m.heroCx;
      const innerY = (1 - z) * m.heroCy;
      const panelClipFrom = `inset(${m.heroCy - m.outlineH / 2}px ${
        m.vw - (m.heroCx + m.outlineW / 2)
      }px ${m.vh - (m.heroCy + m.outlineH / 2)}px ${
        m.heroCx - m.outlineW / 2
      }px round 28px)`;

      // Reduced motion: land directly on the finished page.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(panel, { clipPath: "inset(0px 0px 0px 0px round 0px)" });
        gsap.set(focus, {
          x: cardX,
          y: cardY,
          scale: cardScale,
          borderColor: "rgba(255,255,255,0)",
        });
        gsap.set(inner, { scale: z, x: innerX, y: innerY, transformOrigin: "0px 0px" });
        gsap.set(intros, { autoAlpha: 0 });
        gsap.set(heroRobotRef.current, { autoAlpha: 0 });
        gsap.set(headingRef.current, { autoAlpha: 1 });
        gsap.set(chipsRef.current, { autoAlpha: 1 });
        gsap.set(sideCards, { autoAlpha: 1, y: 0 });
        return;
      }

      tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=200%",
          pin: true,
          scrub: 0.5,
        },
      });

      // Headline exits left (backdrop copy + the replica copy, in sync).
      tl.fromTo(
        intros,
        { autoAlpha: 1, x: 0 },
        { autoAlpha: 0, x: -80, duration: 0.22 },
        0,
      );

      // The backdrop robot bows out early — from here on the only robot you
      // see is the one inside the cut-out card (no double exposure).
      tl.fromTo(
        heroRobotRef.current,
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: 0.12 },
        0.06,
      );

      // White panel grows out of the card's own rectangle to the full page.
      tl.fromTo(
        panel,
        { clipPath: panelClipFrom },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 0.52 },
        0.1,
      );

      // Its heading fades in while the panel is still growing (Revolut look).
      tl.fromTo(
        headingRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.3 },
        0.32,
      );

      // The focus card shrinks from the hero outline into the slot.
      tl.fromTo(
        focus,
        { x: 0, y: 0, scale: 1 },
        { x: cardX, y: cardY, scale: cardScale, duration: 0.52 },
        0.1,
      );

      // Counter-zoom the replica so the whole robot ends up framed in the
      // card instead of a torso crop. Origin pinned to 0,0 with explicit
      // x/y compensation so the robot's center never drifts.
      tl.fromTo(
        inner,
        { x: 0, y: 0, scale: 1, transformOrigin: "0px 0px" },
        { x: innerX, y: innerY, scale: z, duration: 0.52 },
        0.1,
      );

      // The thin outline melts away as the card takes shape.
      tl.fromTo(
        focus,
        { borderColor: "rgba(255,255,255,0.7)" },
        { borderColor: "rgba(255,255,255,0)", duration: 0.14 },
        0.42,
      );

      tl.fromTo(
        chipsRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.14 },
        0.6,
      );

      tl.fromTo(
        sideCards,
        { autoAlpha: 0, y: 90 },
        { autoAlpha: 1, y: 0, duration: 0.22, stagger: 0.08 },
        0.64,
      );
    };

    build();

    // Viewport changes invalidate the measured geometry — rebuild cleanly.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        teardown();
        build();
      }, 250);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      teardown();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen overflow-hidden">
      {/* 1 — backdrop: full-bleed sky with the robot standing in it */}
      <div className="absolute inset-0" style={{ background: SKY_GRADIENT }}>
        <div
          ref={heroRobotRef}
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

      {/* 2 — the white page, growing from the center over the sky */}
      <div
        ref={panelRef}
        className="absolute inset-0 bg-[#f5f4f0] text-[#17160f]"
        style={{ clipPath: "inset(50% 50% 50% 50% round 36px)" }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-9 px-6 pt-[9vh]">
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

            {/* Placeholder slot — the focus card lands exactly here */}
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

      {/* 3 — the cut-out: outlined in the hero, becomes the middle card.
            Contains a pixel-aligned replica of the backdrop so it reads as a
            window onto the scene until the white panel covers everything. */}
      <div
        ref={focusRef}
        className="pointer-events-none absolute overflow-hidden rounded-[28px] border"
        style={{
          width: "54vh",
          height: "72vh",
          left: "calc(55vw - 27vh)",
          top: "calc(52vh - 36vh)",
          borderColor: "rgba(255,255,255,0.7)",
        }}
      >
        {/* viewport-sized replica, offset so it lines up with the backdrop */}
        <div
          ref={innerRef}
          className="absolute"
          style={{
            width: "100vw",
            height: "100vh",
            left: "calc(27vh - 55vw)",
            top: "calc(36vh - 52vh)",
            background: SKY_GRADIENT,
          }}
        >
          {/* headline copy — so the text runs through the rectangle
              uninterrupted (it sits under the robot, like the reference) */}
          <div
            ref={introCloneRef}
            aria-hidden
            className="absolute left-[7vw] top-[26vh] max-w-xl text-white"
          >
            <h1 className="text-[clamp(2.4rem,5.5vw,4.5rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
              Agents &amp; Beyond
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/90">
              This is your agent&rsquo;s wallet, redefined. Budget-capped,
              time-boxed, revocable — every trade proved on-chain.
            </p>
            <span className="mt-7 inline-block rounded-full bg-[#17160f] px-7 py-3.5 text-sm font-medium text-white">
              Create your iWallet
            </span>
          </div>
          <div
            ref={cardRobotRef}
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

        <div className="relative flex flex-col items-center gap-1.5 pt-[7vh] text-white">
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
      {/* robot sits in the lower part of the card so its face clears the text */}
      <div className="absolute inset-x-0 bottom-[-8%] top-[30%]">
        <RobotCanvas accent={accent} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1.5 pt-6 text-white">
        <span className="text-[11px] uppercase tracking-wide text-white/80">{label}</span>
        <span className="text-2xl font-semibold tracking-tight">{amount}</span>
        <span className="rounded-full bg-white px-3.5 py-1 text-xs font-medium text-[#17160f]">
          Accounts
        </span>
      </div>
      <div className="relative z-10 mt-auto m-3 flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
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
