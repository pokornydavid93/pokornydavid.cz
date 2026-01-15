import { Scale, ChevronRight } from "lucide-react";
import s from "./aboutCredentials.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";
import Container from "@/app/ui/container/Container";

const CERTS = [
  { label: "Pojištění (životní a neživotní)", href: "/pojisteni-cert.pdf" },
  {
    label: "Doplňkové penzijní spoření (III. pilíř)",
    href: "/penzijko-cert.pdf",
  },
  { label: "Investice", href: "/investice-cert.pdf" },
  { label: "Úvěry", href: "/uvery-cert.pdf" },
] as const;

const AboutCredentials = () => {
  return (
    <section className={s.section} id="opravneni">
      <Container>
        
      <RevealClient as="div" from="bottom">
        <div className={s.innerHeading}>
          <p className={s.kicker}>Transparentnost</p>

          <p className={s.gradientSoft}>Odborné oprávnění</p>
          <RevealClient as="p" from="bottom" delay={0.05} className={s.lead}>
            Jsem vázaný zástupce registrovaný u České národní banky a působím v
            rámci oprávnění samostatného zprostředkovatele SAB servis s.r.o.
            Podrobnější informace{" "}
            <a href="/pravni-informace" target="_blank" rel="noreferrer">
              najdete zde
            </a>
            .
          </RevealClient>
        </div>
      </RevealClient>
      <RevealClient as="div" from="left" className={s.card}>
        <div className={s.subTitleRow}>
          <span className={s.titleAccent} aria-hidden />
          <p className={s.subTitle}>Certifikáty</p>
        </div>

        <ul className={s.list}>
          {CERTS.map((item, i) => (
            <RevealClient
              key={item.href}
              as="li"
              from="left"
              delay={0.06 + i * 0.05}
            >
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <span>{item.label}</span>
                <span className={s.badge}>PDF</span>
                <ChevronRight className={s.chevron} aria-hidden />
              </a>
            </RevealClient>
          ))}
        </ul>

        <div className={s.subTitleRow}>
          <span className={s.titleAccent} aria-hidden />
          <p className={s.subTitle}>Právní informace</p>
        </div>

        <RevealClient
          as="div"
          from="left"
          delay={0.1}
          className={s.footerLink}
        >
          <a href="/pravni-informace" target="_blank" rel="noreferrer">
            <span>Právní informace</span>
            <Scale className={s.scaleIcon} aria-hidden />
            <ChevronRight className={s.chevron} aria-hidden />
          </a>
        </RevealClient>
      </RevealClient>
      </Container>
    </section>
  );
};

export default AboutCredentials;
