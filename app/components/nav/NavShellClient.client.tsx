"use client";

import { useEffect, useRef, useState } from "react";

import Nav from "./Nav";
import SideMenu from "./SideMenu";

const SECTION_KEYS = [
  "hero",
  "about",
  "testimonials",
  "video",
  "services",
  "process",
  "faq",
  "fast-guide",
  "lead-form",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];

type NavShellClientProps = {
  isFull: boolean;
};

const NavShellClient = ({ isFull }: NavShellClientProps) => {
  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [sideMenu, setSideMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const activeSectionRef = useRef<SectionKey>("hero");

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setModalOpen(root.dataset.modal === "1");
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-modal"] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (modalOpen) {
      setSideMenu(false);
    }
  }, [modalOpen]);

  // Scroll spy for active section
  useEffect(() => {
    if (!isFull || modalOpen) return;

    const handleScroll = () => {
      if (document.documentElement.dataset.modal === "1") return;
      const mid = window.innerHeight / 2;
      let currentKey: SectionKey | null = null;

      for (const key of SECTION_KEYS) {
        const el = document.getElementById(key);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) {
          currentKey = key;
          break;
        }
      }

      if (currentKey && currentKey !== activeSectionRef.current) {
        activeSectionRef.current = currentKey;
        setActiveSection(currentKey);
      }
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [isFull, modalOpen]);

  // Reveal-on-scroll behavior
  useEffect(() => {
    if (!isFull || modalOpen) return;

    const revealables = Array.from(
      document.querySelectorAll<HTMLElement>(".reveal")
    );

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.1,
      }
    );

    revealables.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [isFull, modalOpen]);

  return (
    <>
      <Nav
        activeSection={activeSection}
        setSideMenu={setSideMenu}
        sideMenu={sideMenu}
        modalOpen={modalOpen}
      />
      <SideMenu setSideMenu={setSideMenu} sideMenu={sideMenu} />
    </>
  );
};

export default NavShellClient;
