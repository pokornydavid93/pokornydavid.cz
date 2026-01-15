import { Mail, Phone, ArrowUpRight } from "lucide-react";
import Container from "@/app/ui/container/Container";
import LogoMark from "@/app/svgr/LogoMark";
import s from "./footer.module.css";
import FooterCTAButton from "./FooterCTAButton.client";

const Footer = () => {
  return (
    <footer className={s.footerCont} id="footer">
      <div className={s.glow} aria-hidden />

      <Container className={s.inner}>
        <div className={s.topRow}>
          <div className={s.brand}>
            <div className={s.logoWrap}>
              <LogoMark className={s.logo} />
              <div>
                <p className={s.name}>David Pokorný</p>
                <p className={s.role}>Finanční plánování</p>
              </div>
            </div>
            <FooterCTAButton
              className={s.cta}
              iconRight={<ArrowUpRight size={18} />}
            >
              Probrat vaši situaci
            </FooterCTAButton>
          </div>

          <div className={s.links}>
            <div>
              <h4>Rychlé odkazy</h4>
              <ul>
                <li><a href="#about">Kdo jsem</a></li>
                <li><a href="#services">S čím pomáhám</a></li>
                <li><a href="#process">Jak pracuji</a></li>
                <li><a href="#faq">Časté dotazy</a></li>
              </ul>
            </div>

            <div>
              <h4>Právní informace</h4>
              <ul>
                <li>
                  <a href="/pravni-informace">Právní informace</a>
                </li>
                <li>
                  <a href="/zasady-zpracovani-osobnich-udaju">
                    Zásady zpracování osobních údajů
                  </a>
                </li>
                <li>
                  <a href="/cookies-a-mereni">Cookies &amp; měření</a>
                </li>
              </ul>
            </div>

            <div>
              <h4>Kontakt</h4>
              <ul className={s.contactList}>
                <li>
                  <Phone size={16} />
                  <a href="tel:+420731830897">+420 731 830 897</a>
                </li>
                <li>
                  <Mail size={16} />
                  <a href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</a>
                </li>
                <li>
                  {/* <MapPin size={16} /> */}
                  <span></span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={s.privacyBlock}>
          <p>
            Správce osobních údajů: SAB servis s.r.o. Vázaný zástupce: David
            Pokorný
          </p>
          <p>
            David Pokorný · IČO: 09016236 · Sídlo: Tovární 1197/42a, 779 00, Olomouc,
          </p>
          <p>
            Vázaný zástupce společnosti SAB servis s.r.o., IČ: 24704008, se
            sídlem Jungmannova 748/30, 110 00 Praha 1.
          </p>
          <p>
            Dotazy k ochraně osobních údajů:{" "}
            <a href="mailto:info@pokornydavid.cz">info@pokornydavid.cz</a>
          </p>
          <p>Obsah webu nepředstavuje investiční doporučení.</p>
        </div>

        <div className={s.bottomRow}>
          <span>© {new Date().getFullYear()} David Pokorný. Všechna práva vyhrazena.</span>
          <div className={s.bottomLinks}>
            <a href="#lead-form">Konzultace</a>
            <a href="#services">Služby</a>
            <a href="#testimonials">Reference</a>
            <a href="#about">Transparentnost</a>
            
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
