"use client";

import Container from "@/app/ui/container/Container";
import { ShieldCheck, Scale, ChevronRight } from "lucide-react";
import s from "./aboutCredentials.module.css";
import { Reveal } from "@/app/ui/animations/Reveal";

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
      <Reveal as="div" from="bottom">
        <div className={s.innerHeading}>
          <p className={s.kicker}>Transparentnost</p>

          <p className={s.gradientSoft}>Odborné oprávnění</p>
          <Reveal as="p" from="bottom" delay={0.05} className={s.lead}>
            Jsem vázaný zástupce registrovaný u České národní banky a působím v
            rámci oprávnění samostatného zprostředkovatele SAB servis s.r.o.
            Podrobnější informace{" "}
            <a href="/pravni-informace" target="_blank" rel="noreferrer">
              najdete zde
            </a>
            .
          </Reveal>
        </div>
      </Reveal>
      <Reveal as="div" from="bottom" className={s.card}>
        <div className={s.subTitleRow}>
          <span className={s.titleAccent} aria-hidden />
          <p className={s.subTitle}>Certifikáty</p>
        </div>

        <ul className={s.list}>
          {CERTS.map((item, i) => (
            <Reveal key={item.href} as="li" from="bottom" delay={0.06 + i * 0.05}>
              <a href={item.href} target="_blank" rel="noopener noreferrer">
                <span>{item.label}</span>
                <span className={s.badge}>PDF</span>
                <ChevronRight className={s.chevron} aria-hidden />
              </a>
            </Reveal>
          ))}
        </ul>

        <div className={s.subTitleRow}>
          <span className={s.titleAccent} aria-hidden />
          <p className={s.subTitle}>Právní informace</p>
        </div>

        <Reveal as="div" from="bottom" delay={0.1} className={s.footerLink}>
          <a href="/pravni-informace" target="_blank" rel="noreferrer">
            <span>Právní informace</span>
            <Scale className={s.scaleIcon} aria-hidden />
            <ChevronRight className={s.chevron} aria-hidden />
          </a>
        </Reveal>
      </Reveal>
    </section>
  );
};

export default AboutCredentials;
