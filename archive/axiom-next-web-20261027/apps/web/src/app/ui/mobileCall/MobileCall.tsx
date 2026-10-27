"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import s from "../../../../app/home.critical.module.css";
import { PhoneCall } from "lucide-react";
import { useLeadFormModal } from "@/app/components/Providers/LeadFormModalProvider";

const HIDE_THRESHOLD_PX = 5; // ignoruj mikro-scroll
const TOP_REVEAL_PX = 24; // nahoře vždy ukázat

const MobileCall = () => {
  const pathname = usePathname();
  const isInternalDesignRoute = pathname?.startsWith("/design-language");
  const usesCanonicalOverviewFlow =
    pathname === "/" || pathname?.startsWith("/ziskat-prehled");
  const isAboutRoute = pathname === "/kdo-jsem" || pathname === "/kdo-jsem/";
  const { openLeadForm, closeLeadForm, isOpen } = useLeadFormModal();
  const [hidden, setHidden] = useState(false);
  const [aboutHeroVisible, setAboutHeroVisible] = useState(false);

  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    lastYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const y = window.scrollY || 0;
        const dy = y - lastYRef.current;

        // Když je modal otevřený, FAB nikdy neschovávej.
        if (isOpen) {
          setHidden(false);
        } else if (y <= TOP_REVEAL_PX) {
          setHidden(false);
        } else if (Math.abs(dy) >= HIDE_THRESHOLD_PX) {
          setHidden(dy > 0); // dolů schovej, nahoru ukaž
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isOpen]);

  useEffect(() => {
    if (!isAboutRoute) return undefined;

    const hero = document.querySelector<HTMLElement>(
      "[data-about-hero-chapter]",
    );

    if (!hero) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => setAboutHeroVisible(entry?.isIntersecting ?? false),
      { threshold: 0 },
    );

    observer.observe(hero);
    return () => observer.disconnect();
  }, [isAboutRoute]);

  const handleClick = () => {
    if (isOpen) closeLeadForm();
    else openLeadForm("mobile_phone_fab");
  };

  if (
    isInternalDesignRoute ||
    usesCanonicalOverviewFlow ||
    pathname === "/refixace-hypoteky" ||
    pathname?.startsWith("/refixace-hypoteky/") ||
    pathname?.startsWith("/funnels/")
  ) return null;

  const isAboutHeroOccluding = isAboutRoute && aboutHeroVisible;
  const hiddenByScroll = isAboutRoute ? false : hidden;
  const shouldHide = isAboutHeroOccluding || hiddenByScroll;

  return (
    <div
      className={s.mobileCall}
      data-about-hero-occluded={isAboutHeroOccluding ? "true" : undefined}
      data-mobile-call
    >
      <button
        type="button"
        onClick={handleClick}
        className={`${s.mobileFab} ${shouldHide ? s.mobileFabHidden : ""}`}
        aria-label={isOpen ? "Zavřít formulář" : "Domluvit hovor"}
      >
        <PhoneCall className={s.mobileIcon} />
      </button>
    </div>
  );
};

export default MobileCall;
