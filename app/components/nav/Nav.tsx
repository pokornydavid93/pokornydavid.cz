"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useViewport } from "../Providers/ViewportProvider";
import { useLeadFormModal } from "../Providers/LeadFormModalProvider";
import s from "./css/nav.module.css";
import LogoMark from "@/app/svgr/LogoMark";
import { HeartHandshake, PhoneCall, Quote, User2, Workflow } from "lucide-react";
import Button from "@/app/ui/cta/Button";

type NavProps = {
  sideMenu: boolean;
  setSideMenu: React.Dispatch<React.SetStateAction<boolean>>;
};

const Nav = ({ sideMenu, setSideMenu }: NavProps) => {
  const [isHidden, setIsHidden] = useState(false);
  const { width } = useViewport();
  const { openLeadForm } = useLeadFormModal();

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
    let lastY = window.scrollY;

    const onScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastY;

      if (Math.abs(diff) < 6) return;

      if (currentY < 100) setIsHidden(false);
      else if (diff > 0) setIsHidden(true);
      else setIsHidden(false);

      lastY = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={s.navCont}
      style={{
        transform: `translateY(${isHidden && !sideMenu ? "-100%" : "0"})`,
      }}
    >
      <div className={s.leftBox}>
        <LogoMark />
        <div className={s.brandText}>
          <span className={s.name}>David Pokorný</span>
          <span className={s.role}>Finanční plánování</span>
        </div>
      </div>

      <div className={s.brandTextMobile}>
        <span className={s.name}>David Pokorný</span>
        <span className={s.role}>Finanční plánování</span>
      </div>

      <div className={s.rightBox}>
        <a href="#about" className={s.topLink}>
          <User2 className={s.topIcon} />
          <span>Kdo jsem</span>
        </a>
        <a href="#services" className={s.topLink}>
          <HeartHandshake className={s.topIcon} />
          <span>S čím pomáhám</span>
        </a>
        <a href="#process" className={s.topLink}>
          <Workflow className={s.topIcon} />
          <span>Jak pracuji</span>
        </a>
        <a href="#testimonials" className={s.topLink}>
          <Quote className={s.topIcon} />
          <span>Reference</span>
        </a>
        <Button
          variant="cta"
          label={"Sjednat konzultaci"}
          onClick={() => openLeadForm()}
          size="md"
          className={s.heroCta}
        />
      </div>

      {/* BURGER */}
      <div className={s.burgerMenu} onClick={() => setSideMenu(v => !v)}>
        <span ref={topRef} className={s.burgerTop} />
        <span ref={midRef} className={s.burgerMiddle} />
        <span ref={botRef} className={s.burgerBottom} />
      </div>
    </nav>
  );
};

export default Nav;
