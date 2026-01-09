"use client";

import { useEffect, useState } from "react";

import Nav from "./components/nav/Nav";
import Hero from "./components/sections/hero/Hero";
import About from "./components/sections/about/About";
import Services from "./components/sections/services/Services";
import Process from "./components/sections/process/Process";
import Testimonials from "./components/sections/testimonials/Testimonials";
import Video from "./components/sections/video/Video";
import FAQ from "./components/sections/faq/FAQ";
import LeadForm from "./components/sections/leadForm/LeadForm";
import Footer from "./components/sections/footer/Footer";
import { heroVariants } from "./content/heroVariants";
import s from "./page.module.css";
import SideMenu from "./components/nav/SideMenu";
import { GoalsVelocityMarquee } from "./ui/animations/GoalsVelocityMarquee";
import ProcessTimeline from "./components/sections/processTimeline/ProcessTimeline";
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

export default function Page() {
  const siteMode = process.env.NEXT_PUBLIC_SITE_MODE ?? "maintenance";
  const isFull = siteMode === "full";
  const [activeSection, setActiveSection] = useState<string>("hero");
  const [sideMenu, setSideMenu] = useState(false);

  // Scroll detection
  useEffect(() => {
    if (!isFull) return;
    const handleScroll = () => {
      const mid = window.innerHeight / 2;
      let currentKey: string | null = null;

      for (const key of SECTION_KEYS) {
        const el = document.getElementById(key);
        if (!el) continue;

        const rect = el.getBoundingClientRect();
        if (rect.top <= mid && rect.bottom >= mid) {
          currentKey = key;
          break;
        }
      }

      if (currentKey && currentKey !== activeSection) {
        setActiveSection(currentKey);
        console.log("[Page] activeSection:", currentKey);
      }
    };

    handleScroll(); // initial state

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [activeSection, isFull]);

  useEffect(() => {
    if (!isFull) return;
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
  }, [isFull]);

  if (!isFull) {
    return (
      <main className={s.maintenancePage}>
        <section className={s.maintenanceCard} aria-labelledby="maintenance-title">
          <h1 id="maintenance-title" className={s.maintenanceTitle}>
            Web se připravuje
          </h1>
          <p className={s.maintenanceText}>
            Pracujeme na finální podobě webu. Děkujeme za trpělivost.
          </p>
          <p className={s.maintenanceText}>
            Kontakt:{" "}
            <a className={s.maintenanceLink} href="mailto:info@pokornydavid.cz">
              info@pokornydavid.cz
            </a>
          </p>
          <p className={s.maintenanceNote}>
            Napište nám a ozveme se co nejdříve.
          </p>
        </section>
      </main>
    );
  }

  return (
    <>
      <Nav setSideMenu={setSideMenu} sideMenu={sideMenu} />
      <SideMenu setSideMenu={setSideMenu} sideMenu={sideMenu} />

      <main>
        <section id="hero" data-section-key="hero" className={s.sticky}>
          <Hero variants={heroVariants} activeSession={activeSection} />
        </section>
        <section id="about" data-section-key="about">
          <About />
        </section>

        <section id="video" data-section-key="video">
          <Video />
        </section>
        <section id="process" data-section-key="process">
          <ProcessTimeline />
        </section>
        <section id="testimonials" data-section-key="testimonials">
          <Testimonials />
        </section>

        <section id="services" data-section-key="services">
          <Services />
        </section>
        <GoalsVelocityMarquee />

        <section id="faq" data-section-key="faq">
          <FAQ />
        </section>
        <section id="lead-form" data-section-key="lead-form">
          <LeadForm />
        </section>
      </main>

      <Footer />
    </>
  );
}
