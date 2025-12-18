import Container from "@/app/ui/container/Container";
import { ShieldCheck } from "lucide-react";
import s from "./aboutCredentials.module.css";

const CERTS = [
  { label: "Pojištění (životní a neživotní)", href: "/pojisteni-cert.pdf" },
  { label: "Doplňkové penzijní spoření (III. pilíř)", href: "/penzijko-cert.pdf" },
  { label: "Investice", href: "/investice-cert.pdf" },
  { label: "Úvěry", href: "/uvery-cert.pdf" },
] as const;

const AboutCredentials = () => {
  return (
    <section className={s.section} id="opravneni">
      <Container className={s.inner}>
        <div className={`${s.card} reveal`}>
          <div className={s.titleRow}>
            <span className={s.titleAccent} aria-hidden />
            <p className={s.kicker}>Odborné oprávnění a registrace</p>
            <ShieldCheck className={s.titleCheck} aria-hidden />
          </div>
          <p className={s.lead}>
            Jsem vázaný zástupce registrovaný u České národní banky. Oprávnění k
            jednotlivým oblastem najdete níže.
          </p>
          <ul className={s.list}>
            {CERTS.map((item) => (
              <li key={item.href}>
                <a href={item.href} target="_blank" rel="noopener noreferrer">
                  <span>{item.label}</span>
                  <span className={s.badge}>PDF</span>
                  <span className={s.arrow} aria-hidden>
                    →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
};

export default AboutCredentials;
