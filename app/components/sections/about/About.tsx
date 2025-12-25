"use client";

import React from "react";
import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import AboutCredentials from "./AboutCredentials";
import { Reveal } from "@/app/ui/animations/Reveal";

type Highlight = {
  title: string;
  text: string;
};

const ABOUT_CONTENT = {
  eyebrow: "Kdo jsem",
  heading: {
    line1: "Cílem není dokonalý plán na papíře, ale systém, který funguje v reálném životě – dnes, za pět let i ve chvíli, kdy se situace změní.",
    accent: "Srozumitelně a férově",
  },
  lead: [
    "Jmenuji se David Pokorný a pomáhám lidem dát finance do pořádku tak, aby fungovaly v běžném životě a přinášely dlouhodobý klid.",
    "Bez složitých termínů, bez tlaku na produkt – jen srozumitelný plán, který dává smysl v praxi.",
  ],
  body: [
    "K financím jsem se dostal kvůli sobě. Chtěl jsem pochopit, kam mizí moje peníze, co má skutečně smysl řešit a jak si vybudovat rezervu, na kterou se dá spolehnout, když se život nevyvíjí podle plánu.",
    "Postupně jsem zjistil, že stejné otázky řeší většina lidí kolem mě – často bez jasného směru, bez kontextu a bez někoho, kdo by jim pomohl udělat si v tom pořádek.",
    "Proto dnes stavím finance tak, aby byly přehledné, dlouhodobě udržitelné a pod kontrolou.",
  ],
  highlights: [
    {
      title: "Přehled bez tlaku",
      text: "Žádné složité termíny – jen kroky, kterým rozumíte.",
    },
    {
      title: "Plán na míru",
      text: "Každý další krok vychází z toho, jak žijete, jaké máte priority a co chcete mít ve svém životě pod kontrolou.",
    },
    {
      title: "Dlouhodobá jistota",
      text: "Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly i v čase.",
    },
  ] satisfies Highlight[],
  cta: "Probrat vaši situaci",
};

const About = () => {
  return (
    <section className={s.section}>
      <Container className={s.inner}>
        <Reveal as="div" from="left" className={s.headingCont}>
          <p className={s.eyebrow}>{ABOUT_CONTENT.eyebrow}</p>
          <h3>
            <span className={s.gradientSoft}>
              {ABOUT_CONTENT.heading.accent}
            </span>
          </h3>
          <p className={s.descHeading}>{ABOUT_CONTENT.heading.line1}</p>
        </Reveal>
        <div className={s.grid}>
          <div className={s.leftCol}>
            <Reveal as="div" from="bottom" className={s.leftColInner}>
              <article className={`${s.card} ${s.textCard}`}>
                <p className={`${s.body} ${s.bodyLead}`}>
                  {ABOUT_CONTENT.lead[0]} {ABOUT_CONTENT.lead[1]}
                </p>

                {ABOUT_CONTENT.body.map((p, i) => (
                  <p key={i} className={s.body}>
                    {p}
                  </p>
                ))}

                <ul className={s.highlights}>
                  {ABOUT_CONTENT.highlights.map((h, i) => (
                    <Reveal
                      key={`${h.title}-${i}`}
                      from="left"
                      delay={i * 0.06}
                    >
                      <li className={s.highlightItem}>
                        <span className={s.dot} aria-hidden />
                        <div>
                          <strong>{h.title}</strong>
                          <p>{h.text}</p>
                        </div>
                      </li>
                    </Reveal>
                  ))}
                </ul>
              </article>
            </Reveal>
          </div>

          <Reveal from="bottom" delay={0.2}>
            <article className={`${s.card} ${s.photoCard}`}>
              <div className={s.photoFrame} />
            </article>
          </Reveal>
        </div>

        <Reveal from="bottom" delay={0.1}>
          <div>
            <AboutCredentials />
          </div>
        </Reveal>
      </Container>
    </section>
  );
};

export default About;
