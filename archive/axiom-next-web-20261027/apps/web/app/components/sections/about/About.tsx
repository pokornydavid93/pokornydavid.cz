import Image from "next/image";
import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import RevealClient from "@/app/ui/animations/RevealClient";
import HeroPortraitFigure from "../hero/HeroPortraitFigure";

type AboutItem = {
  title: string;
  text: string;
};

const ABOUT_CONTENT = {
  heading: {
    title: "Jsem David Pokorný.",
    intro:
      "Finanční poradenství pro mě nezačíná produktem, ale pochopením vaší situace. Teprve potom dává smysl hledat konkrétní řešení.",
  },
  items: [
    {
      title: "Srozumitelně, ne složitě.",
      text: "Finance mají být přehledné i bez odborných výrazů. Vysvětluji věci jednoduše, aby bylo jasné, co řešíte, proč je to důležité a jaký je další krok.",
    },
    {
      title: "V souvislostech.",
      text: "Hypotéka, pojištění, rezerva i investice spolu souvisí. Proto je neposuzuji odděleně, ale jako části jednoho finančního plánu.",
    },
    {
      title: "Podle vaší situace.",
      text: "Nejdřív je potřeba porozumět tomu, kde jste dnes. Teprve potom dává smysl hledat konkrétní řešení.",
    },
    {
      title: "Dlouhodobě.",
      text: "Život se mění — a finance s ním. Dobrý plán proto počítá nejen s dneškem, ale i s tím, co může přijít později.",
    },
  ] satisfies AboutItem[],
};

const About = () => {
  return (
    <section className={s.section} data-surface-tone="dark">
      <div
        className={s.limeScrollGlow}
        aria-hidden="true"
        data-about-lime-gradient
      />
      <Container className={s.inner} data-handoff-content>
        <div className={s.headingCont}>
          <RevealClient from="bottom">
            <h2>
              <span className={s.gradientSoft}>
                {ABOUT_CONTENT.heading.title}
              </span>
            </h2>
          </RevealClient>
          <RevealClient from="bottom">
            <p className={s.descHeading}>{ABOUT_CONTENT.heading.intro}</p>
          </RevealClient>
        </div>
        <div className={s.grid}>
          <div className={s.leftCol}>
            <RevealClient as="div" from="bottom" className={s.leftColInner}>
              <article className={`${s.card} ${s.textCard}`}>
                {ABOUT_CONTENT.items.map((item, idx) => {
                  return (
                    <div key={idx} className={s.paragraphBlock}>
                      <RevealClient from="left">
                        <div className={s.paragraphHighlight}>
                          <strong>{item.title}</strong>
                        </div>
                      </RevealClient>

                      <RevealClient from="left">
                        <p
                          className={`${s.body} ${
                            idx === 0 ? s.bodyLead : ""
                          }`}
                        >
                          {item.text}
                        </p>
                      </RevealClient>
                    </div>
                  );
                })}
              </article>

              {/* <article className={`${s.card} ${s.secondaryCard}`}>
                <RevealClient from="bottom fade">
                  <h3>Co by dávalo smysl u vás ?</h3>
                </RevealClient>
                <RevealClient from="bottom fade">
                  <h4 className={s.body}>Začneme krátkým hovorem</h4>
                </RevealClient>
                <RevealClient from="bottom fade">
                  <h5 className={s.body}>
                    Pomůže mi pochopit, kde dnes stojíte a co má smysl řešit hned.
                  </h5>
                </RevealClient>
                <RevealClient from="bottom fade">
                <AboutCTAButton
                  className={`${s.cta}`}
                  label="Probrat vaši situaci"
                >
                  Probrat vaši situaci
                </AboutCTAButton>
                </RevealClient>
              </article> */}
            </RevealClient>
          </div>

          <RevealClient
            as="article"
            from="bottom"
            delay={0.2}
            className={`${s.card} ${s.photoCard}`}
          >
            <div className={s.aboutHeroPortrait}>
              <HeroPortraitFigure
                className={s.aboutHeroPortraitCard}
                priority={false}
              />
            </div>
            <div className={s.photoFrame} aria-hidden>
              <Image
                src="/about.avif"
                alt=""
                fill
                sizes="(max-width: 980px) 100vw, 40vw"
                className={s.aboutImg}
              />
            </div>
          </RevealClient>

        </div>

        {/* <RevealClient from="bottom" delay={0.1}>
          <div>
            <AboutCredentials />
          </div>
        </RevealClient> */}
      </Container>
    </section>
  );
};

export default About;
