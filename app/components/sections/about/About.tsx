import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import Image from "next/image";
import { Play } from "lucide-react";

const About = () => {
  return (
    <section className={s.aboutCont}>
      <Container className={s.mainCont} fullHeight>
        {/* Eyebrow jako čistý H2 nad kartou */}
        <div className={s.card}>
          <div className={s.contentCont}>
            <div className={s.photoCol}>
              <Image
                src="/dejv.png"
                alt="David Pokorný – finanční plánování"
                className={s.photo}
                width={720}
                height={900}
                priority
              />
            </div>

            <div className={s.textCol}>
              <h3 className={s.heading}>
                Pomáhám lidem mít ve financích jasno
                <br />
                <span className={s.gradientSoft}>Bez stresu a nátlaku.</span>
              </h3>

              <p className={s.body}>
                Jmenuji se David Pokorný a pomáhám lidem nastavit finance tak,
                aby dávaly smysl v běžném životě a přinášely dlouhodobý klid.
                Žádné složité výrazy, žádný tlak — jen srozumitelný plán.
              </p>

              <p className={s.body}>
                K financím jsem se dostal kvůli sobě: chtěl jsem vědět, kam
                mizí moje peníze a jak si vybudovat rezervu, která opravdu
                podrží. Brzy jsem zjistil, že stejné otázky řeší většina lidí
                kolem mě — jen často bez směru a podpory.
              </p>

              <ul className={s.highlights}>
                <li>
                  <span className={s.dot} aria-hidden />
                  <div>
                    <strong>Přehled bez tlaku</strong>
                    <p>Žádné složité termíny, jen jasné kroky a důvody proč.</p>
                  </div>
                </li>
                <li>
                  <span className={s.dot} aria-hidden />
                  <div>
                    <strong>Plan na míru</strong>
                    <p>Každá rada vychází z toho, jak žijete a co chcete mít pod kontrolou.</p>
                  </div>
                </li>
                <li>
                  <span className={s.dot} aria-hidden />
                  <div>
                    <strong>Dlouhodobá jistota</strong>
                    <p>Pomůžu hlídat rizika i budovat rezervy, aby finance držely v čase.</p>
                  </div>
                </li>
              </ul>

              <div className={s.actions}>
                <button type="button" className={s.videoBtn}>
                  <div className={s.playCont}>
                    <Play />
                  </div>
                  <div className={s.videoCopy}>
                    <span className={s.videoEyebrow}>1 min</span>
                    <span className={s.videoLabel}>Zhlédnout krátké video</span>
                  </div>
                </button>
                <Button className={s.aboutCta} variant="cta">
                  Sjednat konzultaci
                </Button>

              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
};

export default About;