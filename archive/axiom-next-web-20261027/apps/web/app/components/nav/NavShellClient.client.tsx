"use client";

import { useEffect, useRef, useState } from "react";

import Nav from "./Nav";
import SideMenu from "./SideMenu";

const SECTION_KEYS = [
  "hero",
  "process",
  "about",
  "video",
  "testimonials",
  "services",
  "credentials",
  "faq",
  "lead-form",
] as const;

type SectionKey = (typeof SECTION_KEYS)[number];
type StoryChapterKey =
  | "situation"
  | "orientation"
  | "plan"
  | "video"
  | "proof"
  | "first-step";
type StoryFlowActiveKey = SectionKey | StoryChapterKey;

const STORY_CHAPTER_TO_SECTION_KEY: Record<StoryChapterKey, SectionKey> = {
  situation: "hero",
  orientation: "process",
  plan: "process",
  video: "video",
  proof: "testimonials",
  "first-step": "lead-form",
};

const isSectionKey = (value: string | null | undefined): value is SectionKey =>
  Boolean(value && SECTION_KEYS.includes(value as SectionKey));

const mapStoryFlowActiveSection = (
  value: StoryFlowActiveKey | null,
): SectionKey | null => {
  if (!value) return null;
  if (isSectionKey(value)) return value;
  return STORY_CHAPTER_TO_SECTION_KEY[value] ?? null;
};

type NavShellClientProps = {
  isFull: boolean;
};

const getStoryFlowActiveSection = () => {
  const active =
    (
      window as unknown as {
        __storyFlow?: {
          getActiveSection?: () => StoryFlowActiveKey | null;
        };
      }
    ).__storyFlow?.getActiveSection?.() ?? null;

  return mapStoryFlowActiveSection(active);
};

const NavShellClient = ({ isFull }: NavShellClientProps) => {
  const [activeSection, setActiveSection] = useState<SectionKey>("hero");
  const [sideMenu, setSideMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const activeSectionRef = useRef<SectionKey>("hero");
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const root = document.documentElement;
    const update = () => setModalOpen(root.dataset.modal === "1");
    update();

    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ["data-modal"] });
    return () => observer.disconnect();
  }, []);

  const effectiveSideMenu = sideMenu && !modalOpen;

  // Scroll spy for active section
  useEffect(() => {
    if (!isFull || modalOpen) return;

    const handleScroll = () => {
      if (document.documentElement.dataset.modal === "1") return;
      const mid = window.innerHeight / 2;
      let currentKey: SectionKey | null = getStoryFlowActiveSection();

      if (!currentKey) {
        for (const key of SECTION_KEYS) {
          const el = document.getElementById(key);
          if (!el) continue;

          const rect = el.getBoundingClientRect();
          if (rect.top <= mid && rect.bottom >= mid) {
            currentKey = key;
            break;
          }
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
    window.addEventListener("storyflow:ready", handleScroll);
    window.addEventListener("storyflow:sectionchange", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
      window.removeEventListener("storyflow:ready", handleScroll);
      window.removeEventListener("storyflow:sectionchange", handleScroll);
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
        menuButtonRef={menuButtonRef}
        setSideMenu={setSideMenu}
        sideMenu={effectiveSideMenu}
        modalOpen={modalOpen}
      />
      <SideMenu
        menuButtonRef={menuButtonRef}
        setSideMenu={setSideMenu}
        sideMenu={effectiveSideMenu}
      />
    </>
  );
};

export default NavShellClient;
