import Link from "next/link";
import { CircleDot, FileText, ShieldCheck } from "lucide-react";
import Container from "@/app/ui/container/Container";
import { getServiceItems } from "@/lib/services/offering-runtime.server";
import s from "./services.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";

const Services = async () => {
  const serviceItems = await getServiceItems();
  const landingFeaturedServices = serviceItems.filter(
    (service) => service.featuredOnLanding,
  );
  const landingSecondaryServices = serviceItems.filter(
    (service) => !service.featuredOnLanding,
  );

  return (
    <section
      className={s.servicesCont}
      data-surface-tone="dark"
      id="services-section"
      data-services-cont
    >
      <Container>
        <div className={s.header} data-services-header>
          <div className={s.headerCopy}>
            <RevealClient
              engine="io"
              as="p"
              from="bottom"
              className={s.eyebrow}
            >
              PRAKTICKÉ SLUŽBY
            </RevealClient>
            <RevealClient engine="io" as="h2" from="bottom">
              Co právě řešíte{" "}
              <br />
              ve financích?
            </RevealClient>
            <RevealClient engine="io" as="p" from="bottom" className={s.sub}>
              Od hypotéky přes pojištění až po investice. Vyberte téma a
              proměníme ho v jasný plán: co je důležité, co počká a jaký krok
              dává smysl dál.
            </RevealClient>
          </div>

          <RevealClient
            engine="io"
            as="aside"
            from="bottom"
            className={s.teaser}
          >
            <span className={s.teaserIcon} aria-hidden>
              <FileText size={22} strokeWidth={1.8} />
            </span>
            <div className={s.teaserCopy}>
              <h3>Kompletní přehled služeb</h3>
              <p>Všechny oblasti najdete na samostatné stránce služeb.</p>
              <Link href="/sluzby/" className={s.teaserLink}>
                Zobrazit služby <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </RevealClient>
        </div>

        <div className={s.serviceShell}>
          <div className={s.grid}>
            {landingFeaturedServices.map((service, i) => {
              const Icon = service.icon;

              return (
                <RevealClient
                  key={service.title}
                  as="article"
                  from="bottom"
                  className={`${s.card} ${s.cardReveal} ${
                    i === 0 ? s.cardFeatured : ""
                  }`}
                  engine="io"
                  index={i}
                  duration={0.3}
                >
                  <div className={s.cardTop}>
                    <span className={s.iconShell} aria-hidden>
                      <Icon size={22} strokeWidth={1.9} />
                    </span>
                    {service.badge ? (
                      <span className={s.badge}>{service.badge}</span>
                    ) : null}
                  </div>

                  <div className={s.text}>
                    <h3>{service.title}</h3>
                    <p>{service.shortDescription}</p>
                  </div>

                  <div
                    className={s.chips}
                    aria-label={`Témata: ${service.title}`}
                  >
                    {service.tags.map((chip) => (
                      <span key={chip} className={s.chip}>
                        {chip}
                      </span>
                    ))}
                  </div>

                  <span className={s.cardDivider} aria-hidden />
                  <Link
                    href={`/sluzby#${service.slug}`}
                    className={s.cardLink}
                    aria-label={`Zjistit víc: ${service.title}`}
                  >
                    Zjistit víc <span aria-hidden="true">↗</span>
                  </Link>
                </RevealClient>
              );
            })}
          </div>

          <RevealClient engine="io" as="div" from="bottom" className={s.more}>
            <div className={s.moreLabelWrap}>
              <span className={s.moreIntroIcon} aria-hidden>
                <CircleDot size={18} strokeWidth={1.9} />
              </span>
              <p className={s.moreLabel}>
                Další oblasti, které spolu můžeme projít
              </p>
            </div>
            <div className={s.moreLinks}>
              {landingSecondaryServices.map((service) => {
                const Icon = service.icon;

                return (
                  <Link
                    key={service.slug}
                    href={`/sluzby#${service.slug}`}
                    className={s.moreLink}
                  >
                    <span className={s.moreIcon} aria-hidden>
                      <Icon size={15} strokeWidth={1.9} />
                    </span>
                    {service.title} <span aria-hidden="true">↗</span>
                  </Link>
                );
              })}
            </div>
          </RevealClient>

          <RevealClient engine="io" as="div" from="bottom" className={s.ctaRow}>
            <Link href="/sluzby/" className={s.ctaMain}>
              Zobrazit všechny služby <span aria-hidden="true">↗</span>
            </Link>
            <span className={s.ctaDivider} aria-hidden />
            <p>
              Na detailní stránce najdete přehled všech oblastí a kdy dává smysl
              je řešit.
            </p>
            <div className={s.ctaTrust}>
              <span className={s.ctaTrustIcon} aria-hidden>
                <ShieldCheck size={22} strokeWidth={1.8} />
              </span>
              <span>
                <strong>Nezávislý přístup</strong>
                <small>Doporučím vám jen to, co dává smysl.</small>
              </span>
            </div>
          </RevealClient>
        </div>
      </Container>
    </section>
  );
};

export default Services;
