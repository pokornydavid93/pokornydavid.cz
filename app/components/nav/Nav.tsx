"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { useLeadFormModal } from "../Providers/LeadFormModalProvider";
import s from "./css/nav.module.css";
import LogoMark from "@/app/svgr/LogoMark";
import { HeartHandshake, Quote, User2, Workflow } from "lucide-react";
import Button from "@/app/ui/cta/Button";

type NavProps = {
  activeSection?: string;
  sideMenu: boolean;
  setSideMenu: React.Dispatch<React.SetStateAction<boolean>>;
  modalOpen?: boolean;
};

const Nav = ({ activeSection, sideMenu, setSideMenu, modalOpen }: NavProps) => {
  const [isHidden, setIsHidden] = useState(false);
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
    if (modalOpen) return;
    let lastY = window.scrollY;

    const onScroll = () => {
      if (modalOpen || document.documentElement.dataset.modal === "1") return;
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
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen) {
      setIsHidden(false);
    }
  }, [modalOpen]);

  const getLinkClassName = (sectionId: string) =>
    `${s.topLink} ${activeSection === sectionId ? s.topLinkActive : ""}`;

  const navHidden = modalOpen || (isHidden && !sideMenu);

  return (
    <nav
      className={s.navCont}
      style={{
        transform: `translateY(${navHidden ? "-100%" : "0"})`,
        pointerEvents: modalOpen ? "none" : "auto",
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
        <a href="#about" className={getLinkClassName("about")}>
          <User2 className={s.topIcon} />
          <span>Kdo jsem</span>
        </a>
        <a href="#process" className={getLinkClassName("process")}>
          <Workflow className={s.topIcon} />
          <span>Jak pracuji</span>
        </a>
           <a href="#services" className={getLinkClassName("services")}>
          <HeartHandshake className={s.topIcon} />
          <span>S čím pomáhám</span>
        </a>
        <a href="#testimonials" className={getLinkClassName("testimonials")}>
          <Quote className={s.topIcon} />
          <span>Reference</span>
        </a>
     
        <Button
          variant="cta"
          label={"Domluvit hovor"}
          onClick={() => openLeadForm()}
          size="md"
          className={s.heroCta}
        />
      </div>

      {/* BURGER */}
      <div className={s.burgerMenu} onClick={() => setSideMenu((v) => !v)}>
        <span ref={topRef} className={s.burgerTop} />
        <span ref={midRef} className={s.burgerMiddle} />
        <span ref={botRef} className={s.burgerBottom} />
      </div>
    </nav>
  );
};

export default Nav;
