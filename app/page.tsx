import NavShell from "./components/nav/NavShell";
import Hero from "./components/sections/hero/Hero";
import About from "./components/sections/about/About";
import Services from "./components/sections/services/Services";
import Testimonials from "./components/sections/testimonials/Testimonials";
import Video from "./components/sections/video/Video";
import FAQ from "./components/sections/faq/FAQ";
import LeadForm from "./components/sections/leadForm/LeadForm";
import Footer from "./components/sections/footer/Footer";
import { heroVariants } from "./content/heroVariants";
import s from "./page.module.css";
import { GoalsVelocityMarquee } from "./ui/animations/GoalsVelocityMarquee";
import ProcessTimeline from "./components/sections/processTimeline/ProcessTimeline";
import AboutCredentials from "./components/sections/about/AboutCredentials";

export default function Page() {
  return (
    <>
      <NavShell />

      <main>
        <section id="hero" data-section-key="hero" className={s.sticky}>
          <Hero variants={heroVariants} index={5} activeSession="hero" />
        </section>
        <section id="about" data-section-key="about">
          <About />
        </section>
        <section id="process" data-section-key="process">
          <ProcessTimeline />
        </section>
        <section id="process" data-section-key="process">
          <Video />
        </section>

        <section id="services" data-section-key="services">
          <Services />
        </section>
        <section id="testimonials" data-section-key="testimonials">
          <Testimonials />
        </section>
        <GoalsVelocityMarquee />
        {/* <section id="transparecy" data-section-key="transparecy"> */}
        <AboutCredentials />
        {/* </section> */}
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
