"use client";

import React from "react";
import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import AboutCredentials from "./AboutCredentials";
import { Reveal } from "@/app/ui/animations/Reveal";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type Highlight = {
  title: string;
  text: string;
};

const ABOUT_CONTENT = {
  eyebrow: "Kdo jsem",
  heading: {
    line1:
      "Cílem není dokonalý plán na papíře, ale systém, který funguje v reálném životě – dnes, za pět let i ve chvíli, kdy se situace změní.",
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
      title: "Dlouhodobá péče",
      text: "Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly i v čase.",
    },
    {
      title: "Funguje v reálném životě",
      text: "Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly i v čase.",
    },
  ] satisfies Highlight[],
  cta: "Probrat vaši situaci",
};

const About = () => {
  const { openLeadForm } = useLeadFormModal();

  const paragraphs = [
    {
      text: `${ABOUT_CONTENT.lead[0]} ${ABOUT_CONTENT.lead[1]}`,
      isLead: true,
    },
    ...ABOUT_CONTENT.body.map((text) => ({ text, isLead: false })),
  ];

  return (
    <section className={s.section}>
      <Container className={s.inner}>
        <div className={s.headingCont}>
          <Reveal from="bottom">
            <p className={s.eyebrow}>{ABOUT_CONTENT.eyebrow}</p>
          </Reveal>
          <Reveal from="bottom">
            <h3>
              <span className={s.gradientSoft}>
                {ABOUT_CONTENT.heading.accent}
              </span>
            </h3>
          </Reveal>
          <Reveal from="bottom">
            <p className={s.descHeading}>{ABOUT_CONTENT.heading.line1}</p>
          </Reveal>
        </div>
        <div className={s.grid}>
          <div className={s.leftCol}>
            <Reveal as="div" from="bottom" className={s.leftColInner}>
              <article className={`${s.card} ${s.textCard}`}>
                {paragraphs.map((para, idx) => {
                  const highlight =
                    ABOUT_CONTENT.highlights[
                      idx % ABOUT_CONTENT.highlights.length
                    ];

                  return (
                    <div key={idx} className={s.paragraphBlock}>
                      <Reveal from="left">
                        <div className={s.paragraphHighlight}>
                          <strong>{highlight.title}</strong>
                        </div>
                      </Reveal>

                      <Reveal from="left">
                        <p
                          className={`${s.body} ${
                            para.isLead ? s.bodyLead : ""
                          }`}
                        >
                          {para.text}
                        </p>
                      </Reveal>
                    </div>
                  );
                })}
              </article>

              <article className={`${s.card} ${s.secondaryCard}`}>
                <Reveal from="bottom fade">
                  <h3>Co by dávalo smysl u vás?</h3>
                </Reveal>
                <Reveal from="bottom fade">
                  <h4 className={s.body}>Vyplňte krátký formulář</h4>
                </Reveal>
                <Reveal from="bottom fade">
                  <h5 className={s.body}>
                    Udělejme si jasno v tom, co řešíte a co má smysl řešit dál.
                  </h5>
                </Reveal>
                <Reveal from="bottom fade">
                  <Button
                    variant="cta"
                    className={`${s.cta}`}
                    onClick={() => openLeadForm()}
                  >
                    Probrat vaši situaci
                  </Button>
                </Reveal>
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
