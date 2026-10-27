import {
  Building2,
  CheckCircle2,
  ArrowUpRight,
  ExternalLink,
  FileText,
  Landmark,
  Scale,
  ShieldCheck,
} from "lucide-react";
import s from "./aboutCredentials.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";
import Container from "@/app/ui/container/Container";
import LegalLink from "@/app/ui/legal/LegalLink";
import { cnbRegistryUrl } from "@/app/content/multipage";

const SAB_DOCUMENTATION_URL = "https://sabservis.cz/informace";

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
    <section className={s.section} id="opravneni" data-surface-tone="dark">
      <Container className={s.inner}>
        <div className={s.hero}>
          <RevealClient as="div" from="bottom" className={s.header}>
            <p className={s.eyebrow}>Transparentnost</p>
            <h2>Odborné oprávnění a dokumenty</h2>
            <p className={s.lead}>
              Jsem vázaný zástupce společnosti SAB servis s.r.o. Registraci a
              oprávnění si můžete ověřit v registru České národní banky. Níže
              najdete také související dokumenty a právní informace.
            </p>
          </RevealClient>

          <RevealClient
            as="aside"
            from="bottom"
            className={s.auditCard}
            delay={0.08}
          >
            <span className={s.auditIcon} aria-hidden>
              <ShieldCheck size={22} />
            </span>
            <div>
              <p className={s.auditEyebrow}>Ověřitelné zdroje</p>
              <h3>Registrace, zastoupení i dokumenty na jednom místě.</h3>
            </div>
            <ul className={s.auditList}>
              <li>
                <CheckCircle2 size={16} aria-hidden />
                <span>Registr ČNB</span>
              </li>
              <li>
                <CheckCircle2 size={16} aria-hidden />
                <span>SAB servis</span>
              </li>
              <li>
                <CheckCircle2 size={16} aria-hidden />
                <span>Právní dokumenty</span>
              </li>
            </ul>
          </RevealClient>
        </div>

        <div className={s.trustGrid}>
          <RevealClient
            as="article"
            from="bottom"
            className={`${s.trustCard} ${s.primaryCard}`}
            delay={0.04}
          >
            <span className={s.iconShell} aria-hidden>
              <Landmark size={22} />
            </span>
            <span className={s.cardEyebrow}>Oficiální registr</span>
            <h3>Ověření u ČNB</h3>
            <p>
              Registrace je dohledatelná v oficiálním registru České národní
              banky.
            </p>
            <a
              className={s.cardLink}
              href={cnbRegistryUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ověřit moji registraci v registru ČNB"
            >
              <span>Ověřit v registru ČNB</span>
              <ExternalLink size={16} aria-hidden />
            </a>
          </RevealClient>

          <RevealClient
            as="article"
            from="bottom"
            className={`${s.trustCard} ${s.sabCard}`}
            delay={0.1}
          >
            <span className={s.iconShell} aria-hidden>
              <Building2 size={22} />
            </span>
            <span className={s.cardEyebrow}>Zastoupení</span>
            <h3>Vázaný zástupce SAB servis</h3>
            <p>
              Působím jako vázaný zástupce společnosti SAB servis s.r.o., IČ:
              24704008.
            </p>
            <a
              className={s.cardLink}
              href={SAB_DOCUMENTATION_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span>Dokumentace SAB servis</span>
              <ExternalLink size={16} aria-hidden />
            </a>
          </RevealClient>

          <RevealClient
            as="article"
            from="bottom"
            className={`${s.trustCard} ${s.legalCard}`}
            delay={0.16}
          >
            <span className={s.iconShell} aria-hidden>
              <Scale size={22} />
            </span>
            <span className={s.cardEyebrow}>Právní část</span>
            <h3>Právní informace</h3>
            <p>
              Na jednom místě najdete informace o zpracování osobních údajů,
              cookies a další právní dokumenty.
            </p>
            <div className={s.legalLinks}>
              <LegalLink href="/pravni-informace">Právní informace</LegalLink>
              <LegalLink href="/zasady-zpracovani-osobnich-udaju">
                Zásady zpracování osobních údajů
              </LegalLink>
              <LegalLink href="/cookies-a-mereni">Cookies</LegalLink>
            </div>
          </RevealClient>
        </div>

        <RevealClient as="section" from="bottom" className={s.documentsPanel}>
          <div className={s.panelHeader}>
            <div>
              <p className={s.panelEyebrow}>Dokumenty</p>
              <h3>Certifikáty a oblasti oprávnění</h3>
            </div>
            <p>
              Přehled certifikátů pro oblasti, ve kterých mohu poskytovat
              odborné finanční poradenství.
            </p>
          </div>

          <ul className={s.documentGrid}>
            {CERTS.map((item, i) => (
              <RevealClient
                key={item.href}
                as="li"
                from="bottom"
                delay={0.05 + i * 0.04}
              >
                <a
                  className={s.documentCard}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className={s.documentIcon} aria-hidden>
                    <FileText size={18} />
                  </span>
                  <span className={s.documentLabel}>{item.label}</span>
                  <span className={s.badge}>PDF</span>
                  <ArrowUpRight className={s.chevron} aria-hidden />
                </a>
              </RevealClient>
            ))}
          </ul>
        </RevealClient>
      </Container>
    </section>
  );
};

export default AboutCredentials;
