"use client";

import React, { useEffect, useRef } from "react";
import s from "./css/sideMenu.module.css";
import gsap from "gsap";
import { HeartHandshake, Quote, User2, Workflow } from "lucide-react";
import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../Providers/LeadFormModalProvider";

type SideMenuProps = {
  sideMenu: boolean;
  setSideMenu: React.Dispatch<React.SetStateAction<boolean>>;
};

const SideMenu = ({ sideMenu, setSideMenu }: SideMenuProps) => {
  const contentRef = useRef<HTMLElement | null>(null);
  const firstLayerRef = useRef<HTMLDivElement | null>(null);
  const secondLayerRef = useRef<HTMLDivElement | null>(null);
  const { openLeadForm } = useLeadFormModal();

  const linkRefs = useRef<HTMLAnchorElement[]>([]);
  const ctaRef = useRef<HTMLDivElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);

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
    sideMenu ? tl.play() : tl.reverse();
  }, [sideMenu]);

  return (
    <aside
      className={s.mainCont}
      style={{
        pointerEvents: `${sideMenu ? "all" : "none"}`,
      }}
    >
      <nav className={s.content} ref={contentRef}>
        <div className={s.navContainer}>
          <a
            href="#about"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            ref={(el) => {
              if (el) linkRefs.current[0] = el;
            }}
          >
            <User2 className={s.navIcon} />
            <span>Kdo jsem</span>
          </a>

          <a
            href="#help"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            ref={(el) => {
              if (el) linkRefs.current[1] = el;
            }}
          >
            <HeartHandshake className={s.navIcon} />
            <span>S čím pomáhám</span>
          </a>

          <a
            href="#process"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            ref={(el) => {
              if (el) linkRefs.current[2] = el;
            }}
          >
            <Workflow className={s.navIcon} />
            <span>Jak pracuji</span>
          </a>

          <a
            href="#testimonials"
            className={s.navLink}
            onClick={() => setSideMenu(false)}
            ref={(el) => {
              if (el) linkRefs.current[3] = el;
            }}
          >
            <Quote className={s.navIcon} />
            <span>Reference</span>
          </a>
        </div>

        <div ref={ctaRef}>
          <Button
            variant="cta"
            label="Sjednat konzultaci"
            onClick={() => {
              openLeadForm();
              setSideMenu(false);
            }}
            size="md"
            className={s.heroCta}
          />
        </div>
      </nav>

      <div className={s.firstLayer} ref={firstLayerRef} />
      <div className={s.secondLayer} ref={secondLayerRef} />
    </aside>
  );
};

export default SideMenu;
