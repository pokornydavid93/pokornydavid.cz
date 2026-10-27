"use client";

import React, { useEffect, useRef, type RefObject } from "react";
import s from "../../home.critical.module.css";
import gsap from "gsap";
import { Handshake, Newspaper, Quote, Send, User2, Workflow } from "lucide-react";
import AnimatedButtonLink from "@/app/components/route-transition/AnimatedButtonLink";
import AnimatedNavLink from "@/app/components/route-transition/AnimatedNavLink";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type SideMenuProps = {
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  sideMenu: boolean;
  setSideMenu: React.Dispatch<React.SetStateAction<boolean>>;
};

const SideMenu = ({ menuButtonRef, sideMenu, setSideMenu }: SideMenuProps) => {
  const contentRef = useRef<HTMLElement | null>(null);
  const firstLayerRef = useRef<HTMLDivElement | null>(null);
  const secondLayerRef = useRef<HTMLDivElement | null>(null);

  const linkRefs = useRef<HTMLAnchorElement[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // === původní nastavení, beze změny ===
      gsap.set(
        [contentRef.current, firstLayerRef.current, secondLayerRef.current],
        { x: "100%" }
      );

      // === NEW: linky start state (drop-in + rotate) ===
      linkRefs.current.forEach((el, i) => {
        const isEven = i % 2 === 0;

        gsap.set(el, {
          opacity: 0,
          y: -20,
          rotate: isEven ? -8 : 8,
          transformOrigin: isEven ? "right top" : "left top",
        });
      });

      // CTA start
      gsap.set(ctaRef.current, {
        opacity: 0,
        scale: 0.85,
      });

      // === původní slide timeline ===
      const tl = gsap
        .timeline({
          paused: true,
          defaults: { ease: "power3.inOut", duration: 0.8 },
        })
        .to(secondLayerRef.current, { x: "0%" }, 0.1)
        .to(firstLayerRef.current, { x: "0%" }, 0.2)
        .to(contentRef.current, { x: "0%" }, 0.3);

      // === NEW: po dokončení slide animovat odkazy ===
      tl.addLabel("linksStart");

      linkRefs.current.forEach((el, i) => {
        tl.to(
          el,
          {
            opacity: 1,
            y: 0,
            rotate: 0,
            duration: 0.6,
            ease: "power3.out",
          },
          `linksStart+=${i * 0.12}`
        );
      });

      // CTA
      tl.to(
        ctaRef.current,
        {
          opacity: 1,
          scale: 1,
          duration: 0.6,
          ease: "back.out(1.6)",
        },
        `linksStart+=${linkRefs.current.length * 0.12 + 0.1}`
      );

      timelineRef.current = tl;
    });

    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const tl = timelineRef.current;
    if (!tl) return;
    if (sideMenu) {
      tl.play();
      window.setTimeout(() => linkRefs.current[0]?.focus(), 360);
      return;
    }
    tl.reverse();
  }, [sideMenu]);

  useEffect(() => {
    if (!sideMenu) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setSideMenu(false);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sideMenu, setSideMenu]);

  useEffect(() => {
    if (wasOpenRef.current && !sideMenu) {
      menuButtonRef.current?.focus();
    }

    wasOpenRef.current = sideMenu;
  }, [menuButtonRef, sideMenu]);

  const onCtaClick = () => {
    gaEvent("cta_click", { location: "side_menu", label: "Kontaktovat" });
    setSideMenu(false);
  };

  const menuTabIndex = sideMenu ? undefined : -1;

  return (
    <aside
      id="site-side-menu"
      className={s.mainCont}
      aria-hidden={!sideMenu}
      inert={!sideMenu ? true : undefined}
      data-surface-tone="dark"
      style={{
        pointerEvents: `${sideMenu ? "all" : "none"}`,
      }}
    >
      <nav className={s.content} ref={contentRef} aria-label="Hlavní menu">
        <div className={s.navContainer}>
          <AnimatedNavLink
            href="/jak-pracuji/"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            tabIndex={menuTabIndex}
            ref={(el) => {
              if (el) linkRefs.current[0] = el;
            }}
          >
            <Workflow className={s.navIcon} />
            <span>Jak pracuji</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/kdo-jsem/"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            tabIndex={menuTabIndex}
            ref={(el) => {
              if (el) linkRefs.current[1] = el;
            }}
          >
            <User2 className={s.navIcon} />
            <span>Kdo jsem</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/sluzby/"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            tabIndex={menuTabIndex}
            ref={(el) => {
              if (el) linkRefs.current[2] = el;
            }}
          >
            <Handshake className={s.navIcon} />
            <span>Služby</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/reference/"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            tabIndex={menuTabIndex}
            ref={(el) => {
              if (el) linkRefs.current[3] = el;
            }}
          >
            <Quote className={s.navIcon} />
            <span>Reference</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/clanky/"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            tabIndex={menuTabIndex}
            ref={(el) => {
              if (el) linkRefs.current[4] = el;
            }}
          >
            <Newspaper className={s.navIcon} />
            <span>Články</span>
          </AnimatedNavLink>
        </div>

        <div ref={ctaRef}>
          <AnimatedButtonLink
            variant="cta"
            label="Zjistit, čím začít"
            data-cursor="action"
            data-cursor-icon="send"
            data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
            data-cursor-magnetic="true"
            iconRight={<Send aria-hidden="true" data-cta-icon="paper-plane" />}
            href="/ziskat-prehled/?source=header&cta=header-primary"
            onClick={onCtaClick}
            size="md"
            className={s.heroCta}
            tabIndex={menuTabIndex}
          />
        </div>
      </nav>

      <div className={s.firstLayer} ref={firstLayerRef} />
      <div className={s.secondLayer} ref={secondLayerRef} />
    </aside>
  );
};

export default SideMenu;
