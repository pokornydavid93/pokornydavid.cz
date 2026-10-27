import { Mail, Phone } from "lucide-react";
import Link from "next/link";
import Container from "@/app/ui/container/Container";
import LogoMark from "@/app/svgr/LogoMark";
import s from "./footer.module.css";
import LegalLink from "@/app/ui/legal/LegalLink";
import FooterOfficeMapButton from "./FooterOfficeMapButton.client";
import { cnbRegistryUrl } from "@/app/content/multipage";

const Footer = () => {
  return (
    <footer className={s.footerCont} id="footer" data-surface-tone="dark">
      <Container className={s.inner}>
        <div className={s.topPanel}>
          <div className={s.footerBrand} aria-label="David Pokorný">
            <LogoMark className={s.footerLogo} />
            <div>
              <p className={s.footerName}>David Pokorný</p>
              <p className={s.footerRole}>Finanční poradenství</p>
            </div>
          </div>

          <section
            className={s.regulatoryBox}
            aria-labelledby="footer-regulatory-title"
          >
            <h3 id="footer-regulatory-title">Regulatorní informace</h3>
            <p>
              Působím jako vázaný zástupce společnosti SAB servis s.r.o.,
              IČ: 24704008, se sídlem Jungmannova 748/30, 110 00 Praha 1.
              Obsah webu má obecný informační charakter a nepředstavuje
              investiční doporučení ani individuální finanční poradenství.
            </p>
          </section>
        </div>

        <nav className={s.linkGrid} aria-label="Navigace v patičce">
          <div className={s.column}>
            <h3>Kontakt</h3>
            <ul className={s.contactList}>
              <li>
                <Mail size={18} aria-hidden />
                <a href="mailto:info@pokornydavid.cz">
                  info@pokornydavid.cz
                </a>
              </li>
              <li>
                <Phone size={18} aria-hidden />
                <a href="tel:+420731830897">+420 731 830 897</a>
              </li>
              <FooterOfficeMapButton />
            </ul>
            <p className={s.legalMini}>
              <span>David Pokorný, IČO: 09016236</span>
              <span>Sídlo: Za Zbrojnicí 446, 784 01 Červenka.</span>
            </p>
          </div>

          <div className={s.column}>
            <h3>Navigace</h3>
            <ul>
              <li>
                <Link href="/kdo-jsem/">Kdo jsem</Link>
              </li>
              <li>
                <Link href="/sluzby/">Služby</Link>
              </li>
              <li>
                <Link href="/jak-pracuji/">Jak pracuji</Link>
              </li>
              <li>
                <Link href="/reference/">Reference</Link>
              </li>
              <li>
                <Link href="/clanky/">Články</Link>
              </li>
            </ul>
          </div>

          <div className={s.column}>
            <h3>Právní</h3>
            <ul>
              <li>
                <LegalLink href="/zasady-zpracovani-osobnich-udaju">
                  GDPR
                </LegalLink>
              </li>
              <li>
                <LegalLink href="/cookies-a-mereni">Cookies</LegalLink>
              </li>
              <li>
                <LegalLink href="/pravni-informace">
                  Právní informace
                </LegalLink>
              </li>
            </ul>
          </div>

          <div className={s.column}>
            <h3>Ověření</h3>
            <ul>
              <li>
                <a
                  href={cnbRegistryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Registrace u ČNB
                </a>
              </li>
              <li>
                <a
                  href="https://sabservis.cz/informace"
                  target="_blank"
                  rel="noreferrer"
                >
                  SAB servis
                </a>
              </li>
              <li>
                <Link href="/#faq">Časté dotazy</Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className={s.bottomRow}>
          <span>
            © {new Date().getFullYear()} David Pokorný. Všechna práva
            vyhrazena.
          </span>
          <div className={s.bottomLinks}>
            <LegalLink href="/zasady-zpracovani-osobnich-udaju">
              Soukromí
            </LegalLink>
            <LegalLink href="/cookies-a-mereni">Cookies</LegalLink>
            <LegalLink href="/pravni-informace">Právní informace</LegalLink>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
