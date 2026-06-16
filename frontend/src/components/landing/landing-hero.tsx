/* eslint-disable @next/next/no-img-element */
"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";
import { Avatar as DiceBearAvatar, Style } from "@dicebear/core";
import bigEars from "@dicebear/styles/big-ears.json";

const SKY_GRADIENT =
  "linear-gradient(to bottom, #8fc1ff 0%, #5ba6fb 55%, #298dff 100%)";

// Pre-generate avatars once at module level — DiceBear is CPU-heavy, avoid re-running per render.
const _bigEarsStyle = new Style(bigEars);
const _avatarCache = new Map<string, string>();
function getAvatarUri(seed: string): string {
  if (!_avatarCache.has(seed)) {
    const uri = new DiceBearAvatar(_bigEarsStyle, {
      seed,
      mouthVariant: ["variant0101", "variant0102", "variant0104", "variant0201"],
      mouthProbability: 100,
      hairColor: ["17160f", "33245f", "7a4a12"],
    }).toDataUri();
    _avatarCache.set(seed, uri);
  }
  return _avatarCache.get(seed)!;
}

function BigEarsAvatar({ seed }: { seed: string }) {
  return (
    <img
      src={getAvatarUri(seed)}
      alt=""
      className="w-full h-full object-contain drop-shadow-2xl scale-[0.6]"
    />
  );
}

/**
 * Revolut-style intro, matching their actual mechanic:
 * - the sky scene (avatar + headline + outlined rectangle) stays full-bleed;
 * - a white rounded panel grows from the center over it, next heading
 * already inside and fading in;
 * - the outlined rectangle is the one region the panel never covers — it
 * keeps showing the scene (a pixel-aligned replica) and shrinks into the
 * middle card slot, then the side cards rise in.
 */
export function LandingHero() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const introCloneRef = useRef<HTMLDivElement>(null);
  const heroAvatarRef = useRef<HTMLDivElement>(null);
  const cardAvatarRef = useRef<HTMLDivElement>(null);
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
      const isMobile = vw < 640;
      const heroCx = isMobile ? vw * 0.5 : vw * 0.55;
      const heroCy = isMobile ? vh * 0.62 : vh * 0.52;
      const outlineW = Math.min(vh * 0.54, vw * (isMobile ? 0.86 : 1));
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

    const zoom = (m: ReturnType<typeof metrics>) => {
      const cardScale = m.slot.w / m.outlineW;
      return (m.slot.h * 1.15) / (m.vh * 0.96 * cardScale);
    };

    const applyGeometry = () => {
      const m = metrics();
      const isMobile = m.vw < 640;
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
      const avatarW = isMobile ? m.vw * 0.7 : m.vh * 0.9;
      const avatarH = avatarW * (110 / 90);
      const canvasBox = {
        width: avatarW,
        height: avatarH,
        left: m.heroCx - avatarW / 2,
        top: m.heroCy - avatarH * 0.5,
      };
      if (heroAvatarRef.current) gsap.set(heroAvatarRef.current, canvasBox);
      if (cardAvatarRef.current) gsap.set(cardAvatarRef.current, canvasBox);
    };

    const intros = [introRef.current, introCloneRef.current].filter(Boolean);
    const sideCards = sideCardsRef.current.filter(Boolean);
    const animated = [
      panel,
      focus,
      inner,
      heroAvatarRef.current,
      headingRef.current,
      chipsRef.current,
      ...intros,
      ...sideCards,
    ].filter(Boolean) as HTMLElement[];

    const PLAY_AT = 60;
    let tl: gsap.core.Timeline | null = null;
    let state: "hero" | "open" = "hero";

    const teardown = () => {
      tl?.kill();
      tl = null;
      gsap.set(animated, { clearProps: "all" });
    };

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

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        gsap.set(panel, { clipPath: "inset(0px 0px 0px 0px round 0px)" });
        gsap.set(focus, {
          x: cardX,
          y: cardY,
          scale: cardScale,
        });
        gsap.set(inner, {
          scale: z,
          x: innerX,
          y: innerY,
          transformOrigin: "0px 0px",
        });
        gsap.set(intros, { autoAlpha: 0 });
        gsap.set(heroAvatarRef.current, { autoAlpha: 0 });
        gsap.set(headingRef.current, { autoAlpha: 1 });
        gsap.set(chipsRef.current, { autoAlpha: 1 });
        gsap.set(sideCards, { autoAlpha: 1, y: 0 });
        return;
      }

      tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });

      tl.fromTo(
        intros,
        { autoAlpha: 1, x: 0 },
        { autoAlpha: 0, x: -80, duration: 0.5 },
        0,
      );

      tl.fromTo(
        heroAvatarRef.current,
        { autoAlpha: 1 },
        { autoAlpha: 0, duration: 0.3 },
        0.1,
      );

      tl.fromTo(
        panel,
        { clipPath: panelClipFrom },
        { clipPath: "inset(0px 0px 0px 0px round 0px)", duration: 1 },
        0.15,
      );

      tl.fromTo(
        focus,
        { x: 0, y: 0, scale: 1 },
        { x: cardX, y: cardY, scale: cardScale, duration: 1 },
        0.15,
      );

      tl.fromTo(
        inner,
        { x: 0, y: 0, scale: 1, transformOrigin: "0px 0px" },
        { x: innerX, y: innerY, scale: z, duration: 1 },
        0.15,
      );

      // tl.fromTo(
      //   focus,
      //   { borderColor: "rgba(255,255,255,0.7)" },
      //   { borderColor: "rgba(255,255,255,0)", duration: 0.3 },
      //   0.8,
      // );

      tl.fromTo(
        headingRef.current,
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
        0.9,
      );

      tl.fromTo(
        chipsRef.current,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.3, ease: "power2.out" },
        1.05,
      );

      tl.fromTo(
        sideCards,
        { autoAlpha: 0, y: 90 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.12,
          ease: "power3.out",
        },
        1.05,
      );

      if (window.scrollY > PLAY_AT) {
        state = "open";
        tl.progress(1);
      } else {
        state = "hero";
      }
    };

    let lastSig = "";
    let built = false;
    let disposed = false;
    const signature = () => {
      const m = metrics();
      return [m.vw, m.vh, m.slot.left, m.slot.top, m.slot.w, m.slot.h].join("|");
    };

    // Apply geometry on the first frame so the cut-out is correctly positioned
    // before the deferred timeline build (fonts + load settle).
    requestAnimationFrame(() => { if (!disposed) applyGeometry(); });

    const buildAndSign = () => {
      build();
      lastSig = signature();
      built = true;
    };

    const settled = Promise.race([
      Promise.all([
        document.fonts ? document.fonts.ready.catch(() => {}) : Promise.resolve(),
        document.readyState === "complete"
          ? Promise.resolve()
          : new Promise((resolve) => window.addEventListener("load", resolve, { once: true })),
      ]),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    
    settled.then(() =>
      requestAnimationFrame(() => {
        if (!disposed && !built) buildAndSign();
      })
    );

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        if (!built || signature() === lastSig) return;
        teardown();
        buildAndSign();
      }, 250);
    };
    window.addEventListener("resize", onResize);

    const playOpen = () => {
      if (tl && state === "hero" && !tl.isActive()) {
        state = "open";
        tl.play();
      }
    };
    const playClose = () => {
      if (tl && state === "open" && !tl.isActive() && window.scrollY <= 1) {
        state = "hero";
        tl.reverse();
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!tl) return;
      if (tl.isActive()) {
        e.preventDefault();
        return;
      }
      if (state === "hero" && e.deltaY > 0) {
        e.preventDefault();
        playOpen();
      } else if (state === "open" && e.deltaY < 0 && window.scrollY <= 1) {
        e.preventDefault();
        playClose();
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!tl) return;
      if (tl.isActive()) {
        e.preventDefault();
        return;
      }
      const dy = touchStartY - (e.touches[0]?.clientY ?? 0);
      if (state === "hero" && dy > 24) {
        e.preventDefault();
        playOpen();
      } else if (state === "open" && dy < -24 && window.scrollY <= 1) {
        e.preventDefault();
        playClose();
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!tl) return;
      const scrollKeys = ["ArrowDown", "PageDown", " ", "End"];
      if (tl.isActive() && [...scrollKeys, "ArrowUp", "PageUp", "Home"].includes(e.key)) {
        e.preventDefault();
      } else if (state === "hero" && scrollKeys.includes(e.key)) {
        e.preventDefault();
        playOpen();
      }
    };

    const onScroll = () => {
      if (tl && state === "hero" && !tl.isActive() && window.scrollY > PLAY_AT) {
        state = "open";
        tl.progress(1);
      }
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      disposed = true;
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      teardown();
    };
  }, []);

  return (
    <section ref={sectionRef} className="relative h-screen overflow-hidden">
      {/* 1 — backdrop: full-bleed sky with the Big Ears Avatar standing in it */}
      <div className="absolute inset-0" style={{ background: SKY_GRADIENT }}>
        <div
          ref={heroAvatarRef}
          className="absolute"
          style={{
            width: "min(90vh, 70vw)",
            height: "min(110vh, 85.5vw)",
            left: "calc(50% - min(45vh, 35vw))",
            top: "calc(52vh - min(55vh, 42.75vw))",
          }}
        >
          <BigEarsAvatar seed="serious-agent-main" />
        </div>

        <div ref={introRef} className="absolute top-[6vh] left-[5vw] right-[5vw] text-white sm:right-auto sm:top-[26vh] sm:left-[7vw] sm:max-w-xl">
          <h1 className="text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[1.04] font-semibold tracking-[-0.04em]">
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
        className="absolute inset-0 bg-white text-[#17160f]"
        style={{ clipPath: "inset(50% 50% 50% 50% round 36px)" }}
      >
        <div className="flex h-full flex-col items-center justify-center gap-4 px-4 pt-[12vh] sm:gap-7 sm:px-6">
          <div ref={headingRef} className="max-w-2xl text-center opacity-0">
            <h2 className="text-[clamp(1.5rem,4.5vw,3.25rem)] leading-[1.08] font-semibold tracking-[-0.04em]">
              Set the rules. Watch it trade.
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5d5b52] sm:text-base sm:leading-7">
              Budgets, expiries and allowed venues are enforced by the contract
              — not by trust.
            </p>
            <Link
              href="/agents"
              className="mt-4 inline-block rounded-full bg-[#17160f] px-6 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03] sm:mt-5 sm:px-7 sm:py-3"
            >
              Watch agents trade
            </Link>
          </div>

          <div className="flex items-end justify-center gap-3 sm:gap-5">
            <AvatarBalanceCard
              ref={(node) => {
                sideCardsRef.current[0] = node;
              }}
              label="Personal · SUI"
              amount="2.40 SUI"
              seed="side-agent-1"
              gradient="bg-gradient-to-b from-[#e8a94e] to-[#7a4a12]"
              chipTitle="DeepBook order"
              chipMeta="Placed · just now"
              chipAmount="-0.50"
            />

            <div ref={slotRef} className="aspect-[3/4] h-[min(24rem,46vh)] rounded-[28px]" />

            <AvatarBalanceCard
              ref={(node) => {
                sideCardsRef.current[1] = node;
              }}
              label="Owner · Passkey"
              amount="2.35 SUI"
              seed="side-agent-2"
              gradient="bg-gradient-to-b from-[#8f76e8] to-[#33245f]"
              chipTitle="Revoke policy"
              chipMeta="One click, any time"
              chipAmount=""
            />
          </div>
        </div>
      </div>

      {/* 3 — the cut-out: outlined in the hero, becomes the middle card. */}
      <div
        ref={focusRef}
        className="pointer-events-none absolute overflow-hidden rounded-[28px] border-none outline-none ring-0 shadow-none transform-gpu"
        style={{
          width: "min(54vh, 86vw)",
          height: "min(72vh, 72vw)",
          left: "calc(50% - min(27vh, 43vw))",
          top: "calc(52vh - 36vh)",
        }}
      >
        <div
          ref={innerRef}
          className="absolute"
          style={{
            width: "100vw",
            height: "100vh",
            left: "calc(min(27vh, 43vw) - 50vw)",
            top: "calc(36vh - 52vh)",
            background: SKY_GRADIENT,
          }}
        >
          <div ref={introCloneRef} aria-hidden className="absolute top-[6vh] left-[5vw] right-[5vw] text-white sm:right-auto sm:top-[26vh] sm:left-[7vw] sm:max-w-xl">
            <h1 className="text-[clamp(2.4rem,5.5vw,4.5rem)] leading-[1.04] font-semibold tracking-[-0.04em]">
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
            ref={cardAvatarRef}
            className="absolute"
            style={{
              width: "min(90vh, 70vw)",
              height: "min(110vh, 85.5vw)",
              left: "calc(50% - min(45vh, 35vw))",
              top: "calc(52vh - min(55vh, 42.75vw))",
            }}
          >
            <BigEarsAvatar seed="serious-agent-main" />
          </div>
        </div>

        <div className="relative flex flex-col items-center gap-1.5 pt-[7vh] text-white">
          <span className="text-xs tracking-wide text-white/80 uppercase">Agent</span>
          <span className="text-4xl font-semibold tracking-tight drop-shadow-sm">6.01 SUI</span>
          <span className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-[#17160f]">Accounts</span>
        </div>
        <div ref={chipsRef} className="absolute inset-x-0 bottom-[4vh] flex justify-center gap-2 opacity-0">
          <span className="rounded-md bg-black/80 px-2.5 py-1.5 text-[1.4vh] font-semibold tracking-wide text-white uppercase">
            ⛓ Policy on-chain
          </span>
          <span className="rounded-md bg-white px-2.5 py-1.5 text-[1.4vh] font-semibold tracking-wide text-[#17160f] uppercase">
            Replay-safe
          </span>
        </div>
      </div>
    </section>
  );
}

type AvatarBalanceCardProps = {
  ref?: (node: HTMLDivElement | null) => void;
  label: string;
  amount: string;
  seed: string;
  gradient: string;
  chipTitle: string;
  chipMeta: string;
  chipAmount: string;
};

/** Side card: Uses the new BigEarsAvatar behind the balance. */
function AvatarBalanceCard({
  ref,
  label,
  amount,
  seed,
  gradient,
  chipTitle,
  chipMeta,
  chipAmount,
}: AvatarBalanceCardProps) {
  return (
    <div
      ref={ref}
      className={`relative hidden aspect-[3/4] h-[min(20rem,38vh)] flex-col overflow-hidden rounded-[24px] opacity-0 shadow-[0_18px_44px_rgba(23,22,15,0.18)] sm:flex ${gradient}`}
    >
      <div className="absolute inset-x-0 top-[30%] bottom-[-8%]">
        <BigEarsAvatar seed={seed} />
      </div>
      <div className="relative z-10 flex flex-col items-center gap-1.5 pt-6 text-white">
        <span className="text-[11px] tracking-wide text-white/80 uppercase">{label}</span>
        <span className="text-2xl font-semibold tracking-tight">{amount}</span>
        <span className="rounded-full bg-white px-3.5 py-1 text-xs font-medium text-[#17160f]">Accounts</span>
      </div>
      <div className="relative z-10 m-3 mt-auto flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 shadow-sm">
        <span className="bg-slate-100 flex h-7 w-7 items-center justify-center rounded-full text-xs">
          ◎
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-xs font-medium text-[#17160f]">{chipTitle}</span>
          <span className="truncate text-[10px] text-[#8a877b]">{chipMeta}</span>
        </span>
        {chipAmount ? <span className="text-xs font-medium text-[#17160f]">{chipAmount}</span> : null}
      </div>
    </div>
  );
}