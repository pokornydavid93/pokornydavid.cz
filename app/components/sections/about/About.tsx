import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import AboutCredentials from "./AboutCredentials";
import RevealClient from "@/app/ui/animations/RevealClient";
import AboutCTAButton from "./AboutCTAButton.client";

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
    "Bez tlaku na produkt — jen srozumitelný plán, který dává smysl v praxi.",
  ],
  body: [
    "K financím jsem se dostal, protože jsem chtěl pochopit, co má v životě opravdu smysl řešit. Dnes pomáhám lidem nastavit rezervu a plán, na který se dá spolehnout, když věci nejdou podle očekávání.",
    "Spolupráce pro mě nekončí jedním setkáním. Život se mění — a s ním i finance. Proto plán průběžně ladíme podle vašich priorit.",
    "Proto stavím finance tak, aby byly přehledné, dlouhodobě udržitelné a hlavně srozumitelné — abyste vždy věděli, co je další krok.",
  ],
  highlights: [
    {
      title: "Bez složitých termínů.",
      text: "Žádné složité termíny – jen kroky, kterým rozumíte.",
    },
    {
      title: "Plán, který sedí vašemu životu.",
      text: "Každý další krok vychází z toho, jak žijete, jaké máte priority a co chcete mít ve svém životě pod kontrolou.",
    },
    {
      title: "Ne jednorázově. Dlouhodobě.",
      text: "Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly i v čase.",
    },
    {
      title: "Aby finance držely směr.",
      text: "Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly i v čase.",
    },
  ] satisfies Highlight[],
  cta: "Probrat vaši situaci",
};

const About = () => {
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
          <RevealClient from="bottom">
            <p className={s.eyebrow}>{ABOUT_CONTENT.eyebrow}</p>
          </RevealClient>
          <RevealClient from="bottom">
            <h3>
              <span className={s.gradientSoft}>
                {ABOUT_CONTENT.heading.accent}
              </span>
            </h3>
          </RevealClient>
          <RevealClient from="bottom">
            <p className={s.descHeading}>{ABOUT_CONTENT.heading.line1}</p>
          </RevealClient>
        </div>
        <div className={s.grid}>
          <div className={s.leftCol}>
            <RevealClient as="div" from="bottom" className={s.leftColInner}>
              <article className={`${s.card} ${s.textCard}`}>
                {paragraphs.map((para, idx) => {
                  const highlight =
                    ABOUT_CONTENT.highlights[
                      idx % ABOUT_CONTENT.highlights.length
                    ];

                  return (
                    <div key={idx} className={s.paragraphBlock}>
                      <RevealClient from="left">
                        <div className={s.paragraphHighlight}>
                          <strong>{highlight.title}</strong>
                        </div>
                      </RevealClient>

                      <RevealClient from="left">
                        <p
                          className={`${s.body} ${
                            para.isLead ? s.bodyLead : ""
                          }`}
                        >
                          {para.text}
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
                  <AboutCTAButton className={`${s.cta}`}>
                    Probrat vaši situaci
                  </AboutCTAButton>
                </RevealClient>
              </article> */}
            </RevealClient>
          </div>

          <RevealClient from="bottom" delay={0.2}>
            <article className={`${s.card} ${s.photoCard}`}>
              <div className={s.photoFrame} />
            </article>
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
