import s from "./about.module.css";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import Image from "next/image";
import { Play } from "lucide-react";
import { useViewport } from "../../Providers/ViewportProvider";

const About = () => {
  const { width } = useViewport();
  return (
    <section className={s.aboutCont}>
      <Container className={s.mainCont} fullHeight>
        {/* Eyebrow jako čistý H2 nad kartou */}
        <h2 className={s.eyebrow}>
          <span className={s.eyebrowLine}></span>
          <span className={s.eyebrowText}>Kdo jsem</span>
          <span className={s.eyebrowLine}></span>
        </h2>

        <div className={s.card}>
          <div className={s.contentCont}>
            <div className={s.photoCol}>
              <img
                src="/person.webp"
                alt="David Pokorný – finanční plánování"
                className={s.photo}
                loading="eager"
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
                K financím jsem se dostal původně kvůli sobě. Chtěl jsem
                pochopit, kam mizí moje peníze a jak si vytvořit rezervu, která
                mě opravdu podrží. Brzy jsem zjistil, že stejné otázky řeší
                většina lidí kolem mě — jen často bez směru a podpory.
              </p>

              <p className={s.body}>
                Dnes pomáhám jednotlivcům, rodinám i podnikatelům najít cestu,
                která odpovídá jejich životu, kryje rizika a dává jistotu.
                Klienti mi často říkají, že „poprvé měli pocit, že jim někdo
                skutečně naslouchal“ — a přesně o tom moje práce je.
              </p>

              <p className={s.body}>
                Neřeším jen čísla. Zajímá mě hlavně to, co vám osobně přinese
                jistotu, přehled a pocit, že máte věci pod kontrolou.
              </p>

              <div className={s.actions}>
                <Button className={s.aboutCta} variant="cta">
                  Sjednat konzultaci
                </Button>
              </div>
            </div>
          </div>
        </div>

        <button type="button" className={s.videoBtn}>
          <div className={s.playCont}>
            <Play />
          </div>
          <span className={s.videoLabel}>Zhlédnout krátké video</span>
        </button>
      </Container>
    </section>
  );
};

export default About;
