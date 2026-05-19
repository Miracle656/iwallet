"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export function AnimatedHoverText({ children }: { children: string }) {
  const rootRef = useRef<HTMLSpanElement>(null);
  const currentRef = useRef<HTMLSpanElement>(null);
  const nextRef = useRef<HTMLSpanElement>(null);
  const currentSplit = useRef<SplitText | null>(null);
  const nextSplit = useRef<SplitText | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    const current = currentRef.current;
    const next = nextRef.current;

    if (!root || !current || !next) return;

    currentSplit.current = new SplitText(current, { type: "chars" });
    nextSplit.current = new SplitText(next, { type: "chars" });

    const currentChars = currentSplit.current.chars;
    const nextChars = nextSplit.current.chars;

    gsap.set([...currentChars, ...nextChars], {
      display: "inline-block",
      willChange: "transform",
    });
    gsap.set(currentChars, { yPercent: 0 });
    gsap.set(nextChars, { yPercent: 115 });

    const trigger = root.closest<HTMLElement>("[data-hover-trigger]") ?? root.parentElement;

    function playEnter() {
      gsap.killTweensOf([...currentChars, ...nextChars]);
      gsap.to(currentChars, {
        yPercent: -115,
        duration: 0.46,
        ease: "power3.out",
        stagger: 0.018,
      });
      gsap.to(nextChars, {
        yPercent: 0,
        duration: 0.46,
        ease: "power3.out",
        stagger: 0.018,
      });
    }

    function playLeave() {
      gsap.killTweensOf([...currentChars, ...nextChars]);
      gsap.to(currentChars, {
        yPercent: 0,
        duration: 0.42,
        ease: "power3.out",
        stagger: 0.014,
      });
      gsap.to(nextChars, {
        yPercent: 115,
        duration: 0.42,
        ease: "power3.out",
        stagger: 0.014,
      });
    }

    trigger?.addEventListener("mouseenter", playEnter);
    trigger?.addEventListener("mouseleave", playLeave);
    trigger?.addEventListener("focus", playEnter);
    trigger?.addEventListener("blur", playLeave);

    return () => {
      trigger?.removeEventListener("mouseenter", playEnter);
      trigger?.removeEventListener("mouseleave", playLeave);
      trigger?.removeEventListener("focus", playEnter);
      trigger?.removeEventListener("blur", playLeave);
      currentSplit.current?.revert();
      nextSplit.current?.revert();
      currentSplit.current = null;
      nextSplit.current = null;
    };
  }, []);

  return (
    <span ref={rootRef} className="relative -my-[0.22em] inline-grid overflow-hidden py-[0.22em] align-bottom leading-[1.3]" aria-label={children}>
      <span ref={currentRef} className="col-start-1 row-start-1 inline-block" aria-hidden="true">
        {children}
      </span>
      <span ref={nextRef} className="col-start-1 row-start-1 inline-block" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}
