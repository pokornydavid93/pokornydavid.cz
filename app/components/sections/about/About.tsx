"use client";

import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type Highlight = {
  title: string;
  text: string;
};

const ABOUT_CONTENT = {
  eyebrow: "Kdo jsem",
  heading: {
    line1: "Pomáhám lidem mít ve financích jasno",
    accent: "Bez stresu a nátlaku.",
  },
  lead: [
    "Jmenuji se David Pokorný a pomáhám lidem dát jejich finance do pořádku tak, aby fungovaly v běžném životě a přinášely dlouhodobý klid.",
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
      text: "Každá rada vychází z toho, jak žijete a co chcete mít ve svém životě pod kontrolou.",
    },
    {
      title: "Dlouhodobá jistota",
      text: "Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly i v čase.",
    },
  ] satisfies Highlight[],
  cta: "Sjednat konzultaci",
};

const About = () => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.section}>
      <Container className={`${s.inner} reveal`}>
        <div className={s.grid}>
          <div className={s.leftCol}>
            <article className={`${s.card} ${s.textCard}`}>
              <p className={s.eyebrow}>{ABOUT_CONTENT.eyebrow}</p>

              <h3 className={s.heading}>
                {ABOUT_CONTENT.heading.line1}
                <br />
                <span className={s.gradientSoft}>
                  {ABOUT_CONTENT.heading.accent}
                </span>
              </h3>

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
                  <li key={i}>
                    <span className={s.dot} aria-hidden />
                    <div>
                      <strong>{h.title}</strong>
                      <p>{h.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>

            <article className={`${s.card} ${s.ctaCard}`}>
              <Button
                className={s.ctaBtn}
                variant="cta"
                onClick={() => openLeadForm()}
              >
                {ABOUT_CONTENT.cta}
              </Button>
            </article>
          </div>

          <article className={`${s.card} ${s.photoCard}`}>
            <div className={s.photoFrame} />
          </article>
        </div>
      </Container>
    </section>
  );
};

export default About;
