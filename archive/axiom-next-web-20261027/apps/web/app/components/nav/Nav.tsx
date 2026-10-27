"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import s from "../../home.critical.module.css";
import LogoMark from "@/app/svgr/LogoMark";
import { Handshake, Newspaper, Quote, Send, User2, Workflow } from "lucide-react";
import AnimatedButtonLink from "@/app/components/route-transition/AnimatedButtonLink";
import AnimatedNavLink from "@/app/components/route-transition/AnimatedNavLink";
import { useRouteTransition } from "@/app/components/route-transition/RouteTransitionProvider";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type NavProps = {
  activeSection?: string;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
  sideMenu: boolean;
  setSideMenu: React.Dispatch<React.SetStateAction<boolean>>;
  modalOpen?: boolean;
};

const Nav = ({ menuButtonRef, sideMenu, setSideMenu, modalOpen }: NavProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const [heroExploreActive, setHeroExploreActive] = useState(false);
  const [articleNavSurface, setArticleNavSurface] = useState<"dark" | "light">(
    "dark",
  );
  const pathname = usePathname();
  const { isTransitioning: routeTransitioning } = useRouteTransition();

  const navRef = useRef<HTMLElement | null>(null);
  const topRef = useRef<HTMLSpanElement | null>(null);
  const midRef = useRef<HTMLSpanElement | null>(null);
  const botRef = useRef<HTMLSpanElement | null>(null);

  // --- init default values
  useEffect(() => {
    gsap.set([topRef.current, botRef.current], { y: 0, rotate: 0 });
    gsap.set(midRef.current, { opacity: 1 });
  }, []);

  // --- open/close animations
  useEffect(() => {
    if (!topRef.current || !midRef.current || !botRef.current) return;

    if (sideMenu) {
      // OPEN — bounce animation
      gsap.to(topRef.current, {
        y: 9,
        rotate: 45,
        duration: 0.45,
        ease: "bounce.out",
      });

      gsap.to(botRef.current, {
        y: -9,
        rotate: -45,
        duration: 0.45,
        ease: "bounce.out",
      });

      gsap.to(midRef.current, {
        opacity: 0,
        duration: 0.25,
        ease: "power3.inOut",
      });
    } else {
      // CLOSE — smooth easing
      gsap.to(topRef.current, {
        y: 0,
        rotate: 0,
        duration: 0.28,
        ease: "power3.inOut",
      });

      gsap.to(botRef.current, {
        y: 0,
        rotate: 0,
        duration: 0.28,
        ease: "power3.inOut",
      });

      gsap.to(midRef.current, {
        opacity: 1,
        duration: 0.2,
        ease: "power3.inOut",
      });
    }
  }, [sideMenu]);

  // --- scroll hide logic ---
  useEffect(() => {
    if (modalOpen) return;
    let lastY = window.scrollY;
    let frame: number | null = null;

    const syncScrollState = () => {
      frame = null;
      if (modalOpen || document.documentElement.dataset.modal === "1") return;
      const currentY = window.scrollY;

      if (document.documentElement.dataset.navSuppressReveal === "1") {
        setIsHidden(true);
        lastY = currentY;
        return;
      }

      const diff = currentY - lastY;

      if (Math.abs(diff) < 4) return;

      if (currentY <= 2) setIsHidden(false);
      else if (diff > 0 && currentY > 6) setIsHidden(true);
      else setIsHidden(false);

      lastY = currentY;
    };

    const onScroll = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(syncScrollState);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", onScroll);
    };
  }, [modalOpen]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsHidden(false));
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    const hideNav = () => setIsHidden(true);
    window.addEventListener("axiom:nav-suppress-reveal", hideNav);
    return () =>
      window.removeEventListener("axiom:nav-suppress-reveal", hideNav);
  }, []);

  useEffect(() => {
    const syncHeroExplore = (event?: Event) => {
      const active =
        event instanceof CustomEvent && typeof event.detail?.active === "boolean"
          ? event.detail.active
          : document.documentElement.dataset.heroExplore === "1";

      setHeroExploreActive(active);
    };

    syncHeroExplore();
    window.addEventListener("axiom:hero-explore-change", syncHeroExplore);
    return () =>
      window.removeEventListener("axiom:hero-explore-change", syncHeroExplore);
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const raf = window.requestAnimationFrame(() => setIsHidden(false));
    return () => window.cancelAnimationFrame(raf);
  }, [modalOpen]);

  const isArticlesRoute =
    pathname === "/clanky" ||
    pathname?.startsWith("/clanky/") ||
    pathname === "/blog" ||
    pathname?.startsWith("/blog/");

  useEffect(() => {
    if (!isArticlesRoute) return;

    let frame: number | null = null;

    const syncArticleNavSurface = () => {
      frame = null;

      const navHeight = navRef.current?.getBoundingClientRect().height ?? 92;
      const probeY = Math.min(navHeight * 0.58, 62);
      const sections = Array.from(
        document.querySelectorAll<HTMLElement>("[data-nav-section]"),
      );

      let nextSurface: "dark" | "light" = "light";

      for (const section of sections) {
        const rect = section.getBoundingClientRect();
        const expandTop =
          section.dataset.navSectionExpand === "top" ? navHeight : 0;
        const sectionTop = rect.top - expandTop;

        if (sectionTop <= probeY && rect.bottom >= probeY) {
          nextSurface =
            section.dataset.navSection === "dark" ? "dark" : "light";
          break;
        }
      }

      setArticleNavSurface((current) =>
        current === nextSurface ? current : nextSurface,
      );
    };

    const requestSync = () => {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(syncArticleNavSurface);
    };

    requestSync();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);

    return () => {
      if (frame !== null) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
    };
  }, [isArticlesRoute, pathname]);

  const getRouteLinkClassName = (active: boolean) =>
    `${s.topLink} ${active ? s.topLinkActive : ""}`;

  const isRouteActive = (route: string) =>
    pathname === route.replace(/\/$/, "") || pathname === route;

  const navHidden =
    modalOpen ||
    heroExploreActive ||
    (isHidden && !sideMenu);

  const trackNavLink = (sectionId: string) => {
    gaEvent("nav_click", {
      section: sectionId, // about|process|services|testimonials
      location: "top_nav",
    });
  };

  const onCtaClick = () => {
    gaEvent("cta_click", {
      location: "top_nav",
      label: "Kontaktovat",
    });
  };

  const toggleBurger = () => {
    const next = !sideMenu;

    gaEvent("burger_toggle", {
      action: next ? "open" : "close",
      location: "top_nav",
    });

    setSideMenu(next);
  };

  return (
    <nav
      ref={navRef}
      className={s.navCont}
      data-nav-surface={isArticlesRoute ? articleNavSurface : undefined}
      data-surface-tone="dark"
      style={{
        transform: `translateY(${navHidden ? "-100%" : "0"})`,
        opacity: routeTransitioning ? 0.68 : 1,
        pointerEvents: modalOpen || routeTransitioning ? "none" : "auto",
      }}
    >
      <div className={s.navInner}>
        <div className={s.leftBox}>
          <span className={s.brandLogoMark}>
            <LogoMark aria-label="David Pokorný" role="img" />
          </span>
          <div className={s.brandText}>
            <span className={s.name}>David Pokorný</span>
            <span className={s.role}>Finanční poradenství</span>
          </div>
        </div>

        <div className={s.brandTextMobile}>
          <span className={s.name}>David Pokorný</span>
          <span className={s.role}>Finanční poradenství</span>
        </div>

        <div className={s.rightBox}>
          <AnimatedNavLink
            href="/kdo-jsem/"
            className={getRouteLinkClassName(isRouteActive("/kdo-jsem/"))}
            onClick={() => trackNavLink("about")}
          >
            <span className={s.topIconShell} aria-hidden="true">
              <User2 className={s.topIcon} />
            </span>
            <span className={s.topLinkText}>Kdo jsem</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/jak-pracuji/"
            className={getRouteLinkClassName(isRouteActive("/jak-pracuji/"))}
            onClick={() => trackNavLink("process")}
          >
            <span className={s.topIconShell} aria-hidden="true">
              <Workflow className={s.topIcon} />
            </span>
            <span className={s.topLinkText}>Jak pracuji</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/sluzby/"
            className={getRouteLinkClassName(isRouteActive("/sluzby/"))}
            onClick={() => trackNavLink("services")}
          >
            <span className={s.topIconShell} aria-hidden="true">
              <Handshake className={s.topIcon} />
            </span>
            <span className={s.topLinkText}>Služby</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/reference/"
            className={getRouteLinkClassName(isRouteActive("/reference/"))}
            onClick={() => trackNavLink("testimonials")}
          >
            <span className={s.topIconShell} aria-hidden="true">
              <Quote className={s.topIcon} />
            </span>
            <span className={s.topLinkText}>Reference</span>
          </AnimatedNavLink>

          <AnimatedNavLink
            href="/clanky/"
            className={getRouteLinkClassName(Boolean(isArticlesRoute))}
            onClick={() => trackNavLink("articles")}
          >
            <span className={s.topIconShell} aria-hidden="true">
              <Newspaper className={s.topIcon} />
            </span>
            <span className={s.topLinkText}>Články</span>
          </AnimatedNavLink>
        </div>

        <div className={s.navEnd}>
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
            className={`${s.heroCta} ${s.navCta}`}
          />
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className={s.burgerMenu}
          onClick={toggleBurger}
          aria-controls="site-side-menu"
          aria-expanded={sideMenu}
          aria-label={sideMenu ? "Zavřít menu" : "Otevřít menu"}
        >
          <span ref={topRef} className={s.burgerTop} aria-hidden="true" />
          <span ref={midRef} className={s.burgerMiddle} aria-hidden="true" />
          <span ref={botRef} className={s.burgerBottom} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
};

export default Nav;
