"use client";

import React, { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ProcessHandoffProps = {
  children: React.ReactNode;
};

const ProcessHandoff = ({ children }: ProcessHandoffProps) => {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const processSection = root.querySelector<HTMLElement>("#process");
    const belowSection = document.querySelector<HTMLElement>("#handoff-below");
    if (!processSection || !belowSection) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const fireRevealRefresh = () => {
      window.dispatchEvent(new Event("handoff:refresh"));
    };

    const mm = gsap.matchMedia();

    mm.add("(min-width: 821px)", () => {
      const ctx = gsap.context(() => {
        const vh = window.innerHeight;
        const handoffDistance = Math.round(vh * 1.8);
        const handoffOffset = vh * 1.1;

        // ScrollTrigger při pinování vytvoří wrapper (pin-spacer).
        // Parent pinned elementu je pak právě pin-spacer.
        const pinSpacerEl = processSection.parentElement as HTMLElement | null;

        const prev = {
          // below
          belowTransform: belowSection.style.transform,
          belowWillChange: belowSection.style.willChange,
          belowPosition: belowSection.style.position,
          belowZIndex: belowSection.style.zIndex,

          // pin spacer
          pinSpacerPosition: pinSpacerEl?.style.position ?? "",
          pinSpacerZIndex: pinSpacerEl?.style.zIndex ?? "",
        };

        // ✅ Layering musí být na pin-spacer wrapperu, ne jen na pinned elementu
        if (pinSpacerEl) {
          pinSpacerEl.style.position = "relative";
          pinSpacerEl.style.zIndex = "1";
        }

        belowSection.style.position = "relative";
        belowSection.style.zIndex = "2";
        processSection.style.position = "relative";

        // ✅ lightweight cinematic overlay (no backdrop-filter)
        const dim = document.createElement("div");
        dim.style.position = "absolute";
        dim.style.inset = "0";
        dim.style.pointerEvents = "none";

        // overlay look (fast)
        dim.style.background =
          "linear-gradient(180deg, rgba(15,58,47,0.10), rgba(15,58,47,0.55))";
        dim.style.boxShadow =
          "inset 0 0 0 1px rgba(255,255,255,0.04), inset 0 -120px 160px rgba(0,0,0,0.25)";

        dim.style.opacity = "0";
        dim.style.willChange = "opacity";
        dim.style.zIndex = "5"; // must be above process content

        processSection.appendChild(dim);

        const showProcess = () => gsap.set(processSection, { autoAlpha: 1 });

        const setHandoffActive = (active: boolean) => {
          document.documentElement.classList.toggle("handoff-active", active);
        };

        // ✅ refresh helper (2x RAF = jistota po transform/layout změnách)
        const refreshTriggers = () => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              ScrollTrigger.refresh(true);
            });
          });
        };

        // initial state
        gsap.set(belowSection, { y: handoffOffset, willChange: "transform" });
        gsap.set(dim, { opacity: 0 });

        let didRefreshAtEnd = false;

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: processSection,
            start: "bottom bottom",
            end: `+=${handoffDistance}`,
            scrub: 1,
            pin: processSection,
            pinSpacing: false,
            anticipatePin: 1,
            invalidateOnRefresh: true,

            onEnter: () => {
              didRefreshAtEnd = false;
              showProcess();
              gsap.set(dim, { opacity: 0 });
              setHandoffActive(true);
            },

            onUpdate: (self) => {
              // ✅ jakmile scrub dojede téměř na konec, refreshni triggery
              // (RevealClient v Services bude mít správné výpočty)
              if (!didRefreshAtEnd && self.progress > 0.985) {
                didRefreshAtEnd = true;
                refreshTriggers();
              }
            },

            onLeave: () => {
              // ✅ po handoffu už nechceme aktivní flag
              setHandoffActive(false);

              // ✅ below sekce musí zůstat nahoře
              gsap.set(belowSection, { y: 0 });

              // reset will-change
              belowSection.style.willChange = prev.belowWillChange;

              fireRevealRefresh();

              // ✅ zásadní: po handoffu přepočítat viewport triggery
              refreshTriggers();
            },

            onEnterBack: () => {
              didRefreshAtEnd = false;
              showProcess();
              gsap.set(dim, { opacity: 0 });
              setHandoffActive(true);

              // ensure stable state
              gsap.set(belowSection, { y: 0, willChange: "transform" });

              fireRevealRefresh();
              refreshTriggers();
            },

            onLeaveBack: () => {
              // návrat úplně zpět: below zase pod viewport
              gsap.set(belowSection, { y: handoffOffset });
              showProcess();
              gsap.set(dim, { opacity: 0 });

              setHandoffActive(false);
              belowSection.style.willChange = prev.belowWillChange;

              fireRevealRefresh();
              refreshTriggers();
            },
          },
        });

        // cinematic handoff:
        // 1) below vyjíždí nahoru
        // 2) dim blur stmívá process
        // 3) process mizí (reveal below)
        tl.to(belowSection, { y: 0, ease: "none" }, 0)
          .to(dim, { opacity: 1, ease: "none" }, 0)
          .to(processSection, { autoAlpha: 0, ease: "none" }, 0);

        // refresh i při resize / refresh eventech
        const onResize = () => refreshTriggers();
        window.addEventListener("resize", onResize, { passive: true });

        return () => {
          window.removeEventListener("resize", onResize);

          // kill GSAP timeline + trigger
          const st = tl.scrollTrigger;
          if (st) st.kill();
          tl.kill();

          // DOM cleanup
          dim.remove();

          // restore process
          gsap.set(processSection, { autoAlpha: 1 });
          document.documentElement.classList.remove("handoff-active");

          // restore below
          belowSection.style.transform = prev.belowTransform;
          belowSection.style.willChange = prev.belowWillChange;
          belowSection.style.position = prev.belowPosition;
          belowSection.style.zIndex = prev.belowZIndex;

          // restore pin spacer
          if (pinSpacerEl) {
            pinSpacerEl.style.position = prev.pinSpacerPosition;
            pinSpacerEl.style.zIndex = prev.pinSpacerZIndex;
          }

          // final refresh (bezpečný)
          refreshTriggers();
        };
      }, root);

      return () => ctx.revert();
    });

    return () => {
      mm.revert();
      fireRevealRefresh();
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
};

export default ProcessHandoff;
