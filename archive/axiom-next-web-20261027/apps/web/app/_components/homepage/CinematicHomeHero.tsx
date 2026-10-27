import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";
import type { ReactNode } from "react";
import { getHomepagePublicFacts } from "../../../lib/homepage/claims.server";
import {
  OverviewActionLink,
  PublicSiteHeader,
} from "../PublicSiteChrome";
import { homepageContent } from "../../content/homepage";
import { cnbRegistryUrl } from "../../content/multipage";
import {
  featuredTestimonials,
  testimonialTrustMetrics,
} from "../../content/testimonials";
import Link from "../../ui/primitives/Link";
import Surface from "../../ui/primitives/Surface";
import HeroEffectsLifecycle from "./HeroEffectsLifecycle.client";
import HeroIntroReveal from "./HeroIntroReveal.client";
import { DeferredHeroSituationReveal } from "./HomepageDeferredMotion.client";
import HeroPortraitEdgeWarp from "./HeroPortraitEdgeWarpDeferred.client";
import HeroSilk from "./HeroSilk.client";
import s from "./cinematicHomeHero.module.css";

export const cinematicDynamicHeaderClassName =
  `${s.integratedHeader} ${s.dynamicHeader}`;

const HERO_SILK_MOTION_CHANNEL = "homepage-hero";
// Keep the previous compositions available for a deliberate visual comparison.
const HERO_PORTRAIT_VARIANT = process.env.HOME_HERO_PORTRAIT_VARIANT === "original"
  ? "original"
  : process.env.HOME_HERO_PORTRAIT_VARIANT === "cutout"
    ? "cutout"
    : "scene";
const MOBILE_PORTRAIT_PLACEHOLDER =
  "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const HERO_PROOF_CLIENTS = featuredTestimonials.slice(0, 3).map(({ client }) => ({
  id: client.id,
  initials: client.name
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join(""),
  name: client.name,
  portrait: client.portrait,
}));

function HeadlineLine({ children, name }: { children: ReactNode; name: string }) {
  return (
    <span className={s.headlineMask} data-hero-heading-line={name}>
      <span className={s.headlineLine} data-hero-heading-line-inner>
        {children}
      </span>
    </span>
  );
}

function EmphasizedHeadlineLine({
  emphasis,
  text,
}: {
  emphasis?: string;
  text: string;
}) {
  if (!emphasis) return text;

  const emphasisIndex = text.indexOf(emphasis);
  if (emphasisIndex < 0) return text;

  return (
    <>
      {text.slice(0, emphasisIndex)}
      <span className={s.headlineEmphasis} data-hero-heading-emphasis>
        {emphasis}
      </span>
      {text.slice(emphasisIndex + emphasis.length)}
    </>
  );
}

export default function CinematicHomeHero() {
  const media = homepageContent.hero.media;
  const cutoutPortrait = HERO_PORTRAIT_VARIANT !== "original";
  const scenePortrait = HERO_PORTRAIT_VARIANT === "scene";
  const ratingMetric = testimonialTrustMetrics.find(
    (metric) => metric.label === "průměrné hodnocení",
  );
  const reviewCountMetric = testimonialTrustMetrics.find(
    (metric) => metric.label === "ověřených Google recenzí",
  );
  const [registrationFact] = getHomepagePublicFacts([
    homepageContent.profile.roleFactId,
  ]);

  return (
    <Surface
      as="section"
      aria-labelledby="home-hero-title"
      className={s.hero}
      componentName="domain-hero"
      data-cinematic-home-hero
      data-hero-effects-state="static"
      data-hero-state="portrait-silk"
      data-hero-portrait-variant={HERO_PORTRAIT_VARIANT}
      data-hero-scene={scenePortrait ? "interior-foreground" : undefined}
      data-nav-material="hero-glass"
      data-nav-theme="dark"
      data-variant="home"
      surface="page"
      tone="dark"
    >
      <PublicSiteHeader
        className={`${s.integratedHeader} ${s.heroHeader}`}
        currentPath="/"
        headerInstance="hero"
        initialMaterial="hero-glass"
        navigationPanelId="hero-site-navigation-panel"
        restoreThemeOnHistory={false}
        scrollBehavior="compact-directional"
        themeBehavior="static"
      />
      <HeroEffectsLifecycle enablePortraitWarp={!cutoutPortrait} />
      <HeroIntroReveal />
      <HeroSilk
        className={s.heroSilkHost}
        foregroundSelector={scenePortrait ? "[data-hero-scene-foreground]" : undefined}
        interiorImageSelector={scenePortrait ? "[data-hero-interior-image]" : undefined}
        motionChannel={HERO_SILK_MOTION_CHANNEL}
      />
      <DeferredHeroSituationReveal />

      {scenePortrait && media?.asset && media.kind === "image" ? (
        <div
          aria-hidden="true"
          className={`${s.portrait} ${s.sceneInteriorPlane}`}
          data-portrait-variant="scene"
        >
          <picture
            className={`${s.portraitPicture} ${s.interiorPicture}`}
            data-hero-interior
          >
            <source
              media="(max-width: 767px), (max-width: 900px) and (max-height: 560px) and (orientation: landscape)"
              srcSet={MOBILE_PORTRAIT_PLACEHOLDER}
            />
            <Image
              alt=""
              className={`${s.portraitImage} ${s.interiorImage}`}
              data-hero-interior-image
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(max-width: 767px) 1px, (min-width: 1680px) 68rem, 67vw"
              src="/bckgv1-hero.avif"
              unoptimized
            />
          </picture>
        </div>
      ) : null}

      {media?.asset && media.kind === "image" ? (
        <figure
          className={s.portrait}
          data-hero-portrait
          data-portrait-variant={HERO_PORTRAIT_VARIANT}
        >
          <picture
            className={s.portraitPicture}
            data-hero-scene-foreground={scenePortrait ? "true" : undefined}
          >
            <source
              media="(max-width: 767px), (max-width: 900px) and (max-height: 560px) and (orientation: landscape)"
              srcSet={MOBILE_PORTRAIT_PLACEHOLDER}
            />
            <Image
              alt={cutoutPortrait ? "David Pokorný, finanční poradce" : media.alt}
              className={s.portraitImage}
              fetchPriority="high"
              fill
              loading="eager"
              sizes="(max-width: 767px) 1px, (max-width: 900px) 62vw, (min-width: 1680px) 68rem, (min-width: 1280px) 62vw, 67vw"
              src={cutoutPortrait ? "/whov2-hero.avif" : media.asset}
            />
          </picture>
          {!cutoutPortrait ? (
            <HeroPortraitEdgeWarp
              className={s.portraitWarp}
              motionChannel={HERO_SILK_MOTION_CHANNEL}
            />
          ) : null}
        </figure>
      ) : null}

      <div className={s.frame} data-home-container-frame>
        <div className={s.composition}>
          <div className={s.copy} data-hero-copy>
            <h1
              aria-label={homepageContent.hero.title}
              className={s.headline}
              id="home-hero-title"
            >
              <HeadlineLine name="primary">
                <EmphasizedHeadlineLine
                  emphasis={homepageContent.hero.titleEmphasis}
                  text={homepageContent.hero.titleLines[0]}
                />{" "}
              </HeadlineLine>
              <HeadlineLine name="secondary">
                <EmphasizedHeadlineLine
                  emphasis={homepageContent.hero.titleEmphasis}
                  text={homepageContent.hero.titleLines[1]}
                />
              </HeadlineLine>
            </h1>

            <p className={s.lead} data-hero-lead data-hero-reveal="lead">
              {homepageContent.hero.lead}
            </p>

            <div
              className={s.actionBlock}
              data-hero-actions
              data-hero-reveal="actions"
            >
              <div className={s.actionRow}>
                <OverviewActionLink
                  href={homepageContent.hero.primaryCta.href}
                  label={homepageContent.hero.primaryCta.label}
                  placement="hero"
                  variant="primary-action"
                />
                {homepageContent.hero.secondaryCta ? (
                  <Link
                    className={s.secondaryAction}
                    data-cursor="action"
                    data-cursor-icon="arrow"
                    data-cursor-magnetic="true"
                    data-hero-secondary
                    href={homepageContent.hero.secondaryCta.href}
                    variant="secondary-action"
                  >
                    <span data-cta-label>
                      {homepageContent.hero.secondaryCta.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={s.secondaryActionIcon}
                      data-cta-icon-shell
                    >
                      <ArrowRight data-cta-icon="arrow" />
                    </span>
                  </Link>
                ) : null}
              </div>

              {ratingMetric && reviewCountMetric ? (
                <ul className={s.proofRail} aria-label="Ověřené údaje">
                  <li className={s.reviewProofItem}>
                    <Link
                      aria-label={`${ratingMetric.value} z ${reviewCountMetric.value} ${reviewCountMetric.label}`}
                      className={`${s.proofLink} ${s.reviewProofLink}`}
                      data-hero-review-proof
                      href="/reference/"
                      variant="text"
                    >
                      <span
                        aria-hidden="true"
                        className={s.clientBubbles}
                        data-hero-client-bubbles
                      >
                        {HERO_PROOF_CLIENTS.map((client) => (
                          <span
                            className={s.clientBubble}
                            data-client-id={client.id}
                            data-client-name={client.name}
                            data-client-photo={client.portrait?.src}
                            data-hero-client-bubble
                            key={client.id}
                          >
                            {client.portrait ? (
                              <picture>
                                <source
                                  srcSet={client.portrait.srcSet}
                                  sizes="(max-width: 767px) 28px, 36px"
                                />
                              <Image
                                alt=""
                                data-hero-client-photo
                                fill
                                sizes="36px"
                                src={client.portrait.src}
                                style={{
                                  objectPosition:
                                    client.portrait.objectPosition ?? "50% 50%",
                                }}
                              />
                              </picture>
                            ) : (
                              <span>{client.initials}</span>
                            )}
                          </span>
                        ))}
                      </span>
                      <span className={s.ratingSummary}>
                        <span
                          aria-hidden="true"
                          className={s.ratingStars}
                          data-hero-rating-stars
                        >
                          {Array.from({ length: 5 }, (_, index) => (
                            <Star
                              aria-hidden="true"
                              data-hero-rating-star
                              fill="currentColor"
                              key={index}
                            />
                          ))}
                        </span>
                        <span className={s.ratingCopy}>
                          <strong>{ratingMetric.value}</strong>
                          <span>/ {reviewCountMetric.value} recenzí</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                  {registrationFact ? (
                    <li className={s.registrationProofItem}>
                      <Link
                        aria-label="Registrace ověřitelná u ČNB"
                        className={s.proofLink}
                        href={cnbRegistryUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                        variant="text"
                      >
                        Registrace u ČNB
                      </Link>
                    </li>
                  ) : null}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </Surface>
  );
}
