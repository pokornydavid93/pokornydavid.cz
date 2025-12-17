'use client';

import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import Image from "next/image";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

const About = () => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <section className={s.section}>
      <Container className={s.inner}>
        <div className={s.grid}>
          <div className={s.leftCol}>
            <article className={`${s.card} ${s.textCard}`}>
              <p className={s.eyebrow}>Kdo jsem</p>
              <h3 className={s.heading}>
                Pomáhám lidem mít ve financích jasno
                <br />
                <span className={s.gradientSoft}>Bez stresu a nátlaku.</span>
              </h3>

              <p className={`${s.body} ${s.bodyLead}`}>
                Jmenuji se David Pokorný a pomáhám lidem dát jejich finance do
                pořádku tak, aby fungovaly v běžném životě a přinášely
                dlouhodobý klid. Bez složitých výrazů, bez tlaku — jen
                srozumitelný plán.
              </p>

              <p className={s.body}>
                K financím jsem se dostal kvůli sobě — chtěl jsem pochopit, kam
                mizí moje peníze a jak si vybudovat rezervu, která mě v životě
                opravdu podrží.
              </p>

              <p className={`${s.body}`}>
                Stejné otázky řeší většina lidí kolem mě — jen často bez směru a
                podpory.
              </p>

              <ul className={s.highlights}>
                <li>
                  <span className={s.dot} aria-hidden />
                  <div>
                    <strong>Přehled bez tlaku</strong>
                    <p>Žádné složité termíny — jen kroky, kterým rozumíte.</p>
                  </div>
                </li>
                <li>
                  <span className={s.dot} aria-hidden />
                  <div>
                    <strong>Plan na míru</strong>
                    <p>
                      Každá rada vychází z toho, jak žijete a co chcete mít ve svém životě pod kontrolou.
                    </p>
                  </div>
                </li>
                <li>
                  <span className={s.dot} aria-hidden />
                  <div>
                    <strong>Dlouhodobá jistota</strong>
                    <p>
                      Pomůžu hlídat rizika a budovat rezervy, aby finance fungovaly v čase.
                    </p>
                  </div>
                </li>
              </ul>
            </article>

            <article className={`${s.card} ${s.ctaCard}`}>
              <Button
                className={s.ctaBtn}
                variant="cta"
                onClick={() => openLeadForm()}
              >
                Sjednat konzultaci
              </Button>
            </article>
          </div>

          <article className={`${s.card} ${s.photoCard}`}>
            <div className={s.photoFrame}>
              {/* <Image
                src="/about.jpg"
                alt="David Pokorný – finanční plánování"
                className={s.photo}
                fill
                sizes="(max-width: 960px) 80vw, 36vw"
                priority
              /> */}
            </div>
          </article>
        </div>
      </Container>
    </section>
  );
};

export default About;
