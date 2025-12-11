import { Mail, MapPin, Phone, ArrowUpRight } from "lucide-react";
import Container from "@/app/ui/container/Container";
import Button from "@/app/ui/cta/Button";
import LogoMark from "@/app/svgr/LogoMark";
import s from "./footer.module.css";

const Footer = () => {
  return (
    <footer className={s.footerCont} id="footer">
      <div className={s.glow} aria-hidden />
      <div className={s.noise} aria-hidden />

      <Container className={s.inner} maxWidth={1220}>
        <div className={s.topRow}>
          <div className={s.brand}>
            <div className={s.logoWrap}>
              <LogoMark className={s.logo} />
              <div>
                <p className={s.name}>David Pokorný</p>
                <p className={s.role}>Finanční plánování</p>
              </div>
            </div>
            <p className={s.tagline}>
              Jasný plán, klid v hlavě a partner, který hlídá vaše finance v čase.
              Vše lidsky, srozumitelně a bez tlaku.
            </p>
            <Button
              variant="cta"
              className={s.cta}
              href="#lead-form"
              iconRight={<ArrowUpRight size={18} />}
            >
              Domluvit konzultaci
            </Button>
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
                  <MapPin size={16} />
                  <span>Praha & online</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className={s.bottomRow}>
          <span>© {new Date().getFullYear()} David Pokorný. Všechna práva vyhrazena.</span>
          <div className={s.bottomLinks}>
            <a href="#lead-form">Konzultace</a>
            <a href="#services">Služby</a>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
