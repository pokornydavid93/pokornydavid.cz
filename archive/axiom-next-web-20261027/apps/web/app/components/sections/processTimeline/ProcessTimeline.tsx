import Container from "@/app/ui/container/Container";
import ProcessDiagram from "./ProcessDiagram.client";
import ProcessCtaButton from "./ProcessCtaButton.client";
import s from "./process.module.css";

export default function ProcessTimeline() {
  return (
    <div
      className={s.processTimeline}
      data-process-timeline
      data-surface-tone="dark"
    >
      <Container className={s.inner} data-process-handoff-content>
        <div className={s.header} data-process-header>
          <div className={s.headline}>
            <p className={s.eyebrow} data-process-heading-part>
              JAK SPOLUPRÁCE PROBÍHÁ
            </p>
            <h2 data-process-heading-part>
              Nejdřív si uděláme jasno. Pak přijde konkrétní krok.
            </h2>
            <p data-process-heading-part>
              Úvodní hovor není prodejní schůzka. Stačí stručně popsat situaci;
              společně uvidíme, co má smysl řešit teď a co může počkat.
            </p>
          </div>
        </div>

        <ProcessDiagram />

        <div className={s.processFooterActions}>
          <section
            aria-labelledby="process-cta-title"
            className={s.processCtaBlock}
            data-process-cta
          >
            <p className={s.processCtaEyebrow} data-process-cta-part>
              DOMLUVIT HOVOR
            </p>
            <h3 data-process-cta-part id="process-cta-title">
              Nemusíte vědět, co přesně potřebujete.
            </h3>
            <p className={s.processCtaBody} data-process-cta-part>
              Stačí mi stručně popsat situaci. Společně si srovnáme, co je
              důležité teď a co může počkat.
            </p>
            <div className={s.processCtaAction} data-process-cta-part>
              <ProcessCtaButton />
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
