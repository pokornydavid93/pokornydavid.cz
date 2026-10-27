import type { Metadata } from "next";
import Image from "next/image";
import { Fragment } from "react";
import { ArrowRight, ArrowUpRight, Award, FileText, Landmark, Send } from "lucide-react";
import {
  OverviewActionLink,
  PublicSiteFooter,
  PublicSiteHeader,
} from "./_components/PublicSiteChrome";
import CinematicHomeHero, {
  cinematicDynamicHeaderClassName,
} from "./_components/homepage/CinematicHomeHero";
import HomepageIntro from "./_components/homepage/HomepageIntro";
import HomeFaqAccordion from "./_components/homepage/HomeFaqAccordion.client";
import HomeArticlesEditorial, {
  type HomeEditorialArticle,
} from "./_components/homepage/HomeArticlesEditorial";
import HomeReferencesNavigator from "./_components/homepage/HomeReferencesNavigator.client";
import HomeSituationSelector from "./_components/homepage/HomeSituationSelector.client";
import ProcessLiquidLinesBackdrop from "./_components/homepage/ProcessLiquidLinesBackdrop.client";
import flow from "./_components/effects/liquidLines.module.css";
import ProcessVideoExperience from "./_components/homepage/ProcessVideoExperience.client";
import {
  DeferredHomeCinematicScroll,
  DeferredProcessReveal,
  DeferredProfileSituationReveal,
  DeferredSituationOrientationReveal,
} from "./_components/homepage/HomepageDeferredMotion.client";
import { homepageContent } from "./content/homepage";
import { sabDocumentationUrl } from "./content/multipage";
import { featuredTestimonials } from "./content/testimonials";
import { getArticleVisual } from "./clanky/articleVisuals";
import s from "./homepage.module.css";
import Container from "./ui/layout/Container";
import ActionBand from "./ui/patterns/ActionBand";
import Link from "./ui/primitives/Link";
import Surface from "./ui/primitives/Surface";
import HomeTemplate, {
  HomeTemplateActionSlot,
} from "./ui/templates/HomeTemplate";
import { getHomepagePublicFacts } from "../lib/homepage/claims.server";
import { assertHomepageStructure } from "../lib/homepage/validate";
import {
  createHomepageWebPageJsonLd,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  serializeJsonLd,
  createPageMetadata,
} from "@/lib/seo";
import {
  categoryLabels,
  type BlogPostMeta,
} from "@/lib/blog";
import { getArticleCollection } from "@/lib/article-content.server";
import { getServiceItems } from "@/lib/services/offering-runtime.server";
import type { PrimarySituationId } from "../lib/homepage/types";

const PAGE_TITLE = DEFAULT_TITLE;
const PAGE_DESCRIPTION = DEFAULT_DESCRIPTION;
const evidenceCertificates = [
  {
    href: "/pojisteni-cert.pdf",
    label: "Pojištění",
  },
  {
    href: "/penzijko-cert.pdf",
    label: "Penzijní spoření",
  },
  { href: "/investice-cert.pdf", label: "Investice" },
  { href: "/uvery-cert.pdf", label: "Úvěry" },
] as const;

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export const revalidate = 3600;

type ServiceCatalogItem = Awaited<ReturnType<typeof getServiceItems>>[number];

const SITUATION_OFFERING_TOPICS = {
  "mortgage-refixation": "mortgage",
  "new-housing": "mortgage",
  "insurance-review": "property-insurance",
  "income-protection": "income-protection",
  investing: "investments",
} as const satisfies Record<PrimarySituationId, ServiceCatalogItem["leadTopic"]>;

type SituationOfferingTitles = Readonly<Record<
  (typeof SITUATION_OFFERING_TOPICS)[PrimarySituationId],
  string
>>;

function createSituationOfferingTitles(
  serviceItems: readonly ServiceCatalogItem[],
): SituationOfferingTitles {
  const titlesByTopic = new Map(
    serviceItems.map(({ leadTopic, title }) => [leadTopic, title] as const),
  );
  const titleFor = (topic: ServiceCatalogItem["leadTopic"]) => {
    const title = titlesByTopic.get(topic);
    if (!title) {
      throw new Error(`Missing active Axiom offering for topic: ${topic}`);
    }
    return title;
  };

  return {
    mortgage: titleFor("mortgage"),
    "property-insurance": titleFor("property-insurance"),
    "income-protection": titleFor("income-protection"),
    investments: titleFor("investments"),
  };
}

function SituationRouter({
  offeringTitles,
}: {
  offeringTitles: SituationOfferingTitles;
}) {
  const intro = homepageContent.situations.intro;
  const orientation = homepageContent.situations.orientation;
  const selectorItems = homepageContent.situations.items
    .map(({
      ctaLabel,
      description,
      href,
      id,
      metadata,
      routeExplanation,
      selectorLabel,
    }) => ({
      ctaLabel,
      description,
      href,
      id,
      metadata,
      routeExplanation,
      selectorLabel,
      serviceTitle: offeringTitles[SITUATION_OFFERING_TOPICS[id]],
    }));
  const selectorOrientation = {
    ctaLabel: orientation.ctaLabel,
    description: orientation.description,
    href: orientation.href,
    id: orientation.id,
    title: orientation.title,
  };
  const renderTypingTokens = (text: string) =>
    text.split(" ").map((word, index, words) => (
      <Fragment key={`${word}-${index}`}>
        <span
          aria-hidden="true"
          className={s.situationTypeToken}
          data-situation-type-token="title"
        >
          <span data-situation-title-token-ink>
            {word}
            {index < words.length - 1 ? " " : null}
          </span>
        </span>
        {index === words.length - 2 ? <br aria-hidden="true" /> : null}
      </Fragment>
    ));

  return (
    <Surface
      as="section"
      aria-labelledby="situations-title"
      className={s.situationSection}
      data-home-module="situations"
      data-nav-theme="light"
      data-profile-situation-transition-target
      id="situace"
      surface="paper"
      tone="light"
    >
      <Container size="wide">
        <div className={s.situationSelectorHeader}>
          <div
            className={s.situationSelectorHeading}
            data-situation-intro-heading
            data-situation-reveal-item
          >
            <span
              className={s.situationSelectorEyebrow}
              data-situation-eyebrow
            >
              <span data-situation-eyebrow-ink>{intro.eyebrow}</span>
            </span>
            <h2
              aria-label={intro.title}
              data-situation-title
              id="situations-title"
            >
              {renderTypingTokens(intro.title)}
            </h2>
          </div>
          <p
            className={s.situationSelectorLead}
            data-situation-intro-copy
            data-situation-reveal-item
          >
            <span
              className={s.situationLeadMask}
              data-situation-lead-detail
            >
              <span data-situation-lead-ink>{intro.lead}</span>
            </span>
          </p>
          <p className={s.situationSelectorStats} data-situation-stats>
            {selectorItems.length} výchozích situací.
          </p>
        </div>
        <div
          className={s.situationSelectorNav}
          data-situation-selector-nav
        >
          <HomeSituationSelector
            customSituation={homepageContent.situations.customSituationLink}
            items={selectorItems}
            orientation={selectorOrientation}
          />
        </div>
      </Container>
    </Surface>
  );
}

function ReferencesSection() {
  const { description, eyebrow, title } = homepageContent.references.intro;

  return (
    <Surface
      as="section"
      aria-labelledby="home-references-title"
      className={s.referencesBand}
      data-home-module="references"
      data-nav-theme="light"
      id="zkusenosti-klientu"
      surface="paper"
      tone="light"
    >
      <div className={s.referencesContentReveal} data-references-content>
        <HomeReferencesNavigator
          description={description}
          eyebrow={eyebrow}
          outro={homepageContent.references.outro}
          testimonials={featuredTestimonials}
          title={title}
        />
      </div>
    </Surface>
  );
}

function ProcessSection() {
  const { cta, detail, intro, microcopy, result, steps } =
    homepageContent.processAndFees;

  return (
    <Surface
      as="section"
      aria-labelledby="process-title"
      className={s.processSection}
      data-home-module="process"
      data-nav-theme="dark"
      data-process-transition-target
      id="postup"
      surface="card-dark"
      tone="dark"
    >
      <div className={s.processScene} data-process-scene>
        <ProcessLiquidLinesBackdrop />
        <Container
          className={`${s.processContent} ${flow.content}`}
          size="wide"
        >
          <div className={s.processLayout} data-process-layout>
            <header
              className={s.processIntro}
              data-process-intro
              data-process-transition-item
            >
              <h2
                aria-label={intro.eyebrow}
                className={s.processEyebrow}
                data-process-header
                id="process-title"
              >
                {intro.eyebrow.split(" ").map((word, wordIndex, words) => (
                  <Fragment key={`process-intro-${wordIndex}`}>
                    <span
                      aria-hidden="true"
                      className={s.processWord}
                      data-process-intro-word
                    >
                      <span data-process-intro-word-ink>{word}</span>
                    </span>
                    {wordIndex < words.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </h2>
              <p className={s.processSemanticCopy}>{detail}</p>
              <p
                aria-hidden="true"
                className={s.processDetail}
                data-process-detail
              >
                {detail.split(" ").map((word, wordIndex, words) => (
                  <Fragment key={`process-detail-${wordIndex}`}>
                    <span
                      aria-hidden="true"
                      className={s.processWord}
                      data-process-detail-word
                    >
                      <span data-process-detail-word-ink>{word}</span>
                    </span>
                    {wordIndex < words.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </p>
            </header>

            <div className={s.processStage} data-process-stage>
              <ol
                className={s.processRegister}
                data-process-rail
                role="list"
              >
                {steps.map((step, stepIndex) => (
                  <li
                    className={s.processRegisterRow}
                    data-process-step={step.id}
                    data-process-step-role={step.role}
                    data-process-transition-item
                    key={step.id}
                  >
                    <span
                      aria-hidden="true"
                      className={s.processStepRule}
                      data-process-step-rule
                    />
                    <span
                      className={s.processRole}
                      data-process-meta
                      data-process-role
                    >
                      <span
                        className={s.processRoleMask}
                        data-process-role-mask
                      >
                        <span data-process-role-ink>{step.role}</span>
                      </span>
                    </span>
                    <div className={s.processStepCopy} data-process-step-copy>
                      <h3 aria-label={step.title} data-process-title>
                        {step.title.split(" ").map((word, wordIndex, words) => (
                          <Fragment key={`${step.id}-${wordIndex}`}>
                            <span
                              aria-hidden="true"
                              className={s.processWord}
                              data-process-word
                            >
                              <span data-process-word-ink>{word}</span>
                            </span>
                            {wordIndex < words.length - 1 ? " " : null}
                          </Fragment>
                        ))}
                      </h3>
                      <p className={s.processStepSupport} data-process-step-support>
                        <span data-process-support-ink>{step.support}</span>
                      </p>
                    </div>
                    <span
                      aria-hidden="true"
                      className={s.processIndex}
                      data-process-index
                    >
                      <span data-process-index-ink>0{stepIndex + 1}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <section
                aria-labelledby="process-result-title"
                className={s.processResult}
                data-process-result
                data-process-transition-item
              >
                <span
                  aria-hidden="true"
                  className={s.processResultRule}
                  data-process-result-rule
                />
                <p className={s.processResultEyebrow}>
                  <span data-process-result-eyebrow-ink>{result.eyebrow}</span>
                </p>
                <div className={s.processResultCopy}>
                  <h3
                    aria-label={result.title}
                    data-process-result-title
                    id="process-result-title"
                  >
                    {result.title.split(" ").map((word, wordIndex, words) => (
                      <Fragment key={`process-result-${wordIndex}`}>
                        <span
                          aria-hidden="true"
                          className={s.processWord}
                          data-process-result-word
                        >
                          <span data-process-result-word-ink>{word}</span>
                        </span>
                        {wordIndex < words.length - 1 ? " " : null}
                      </Fragment>
                    ))}
                  </h3>
                  <p className={s.processResultDescription}>
                    <span data-process-result-description-ink>
                      {result.description}
                    </span>
                  </p>
                </div>
              </section>
              <div
                className={s.processOutcome}
                data-process-outcome
                data-process-transition-item
              >
                <div
                  className={s.processActionRail}
                  data-process-action-rail
                >
                  <div className={s.processAction} data-process-action>
                    <Link
                      className={s.processCta}
                      data-analytics-destination={cta.href}
                      data-analytics-event="home_situation_select"
                      data-analytics-source={cta.source}
                      data-cta-composition="docked"
                      data-cursor="action"
                      data-cursor-icon="send"
                      data-cursor-label="ZÍSKAT PŘEHLED • PRVNÍ KROK •"
                      data-cursor-magnetic="true"
                      data-process-cta
                      data-situation-id={cta.situation}
                      href={cta.href}
                      variant="primary-action"
                    >
                      <span>{cta.label}</span>
                      <span aria-hidden="true" data-cta-icon-shell>
                        <span data-cta-icon-motion>
                          <Send aria-hidden="true" data-cta-icon="paper-plane" />
                        </span>
                      </span>
                    </Link>
                    <p className={s.processMicrocopy}>{microcopy}</p>
                  </div>
                </div>
                <div
                  className={s.processVideoRail}
                  data-process-video-rail
                >
                  <ProcessVideoExperience
                    cta={cta}
                    desktopPoster="/nahled-video.avif"
                    desktopSrc="/video_h264.mp4"
                    mobilePoster="/nahled-mobil.avif"
                    mobileSrc="/video-mobil_h264_720p.mp4"
                  />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </div>
      <DeferredProcessReveal />
    </Surface>
  );
}

function EvidenceSection() {
  const factIds = homepageContent.evidence.items.flatMap((item) =>
    item.kind === "fact" ? [item.factId] : [],
  );
  const [fact] = getHomepagePublicFacts(factIds);

  return (
    <Surface
      as="section"
      aria-labelledby="evidence-title"
      className={s.evidenceSection}
      data-home-module="evidence"
      data-nav-theme="light"
      data-nav-section="light"
      data-reference-evidence-stage
      id="duvera"
      surface="paper"
      tone="light"
    >
      <span
        aria-hidden="true"
        className={s.evidenceRevealRule}
        data-edge="top"
        data-evidence-reveal-rule
      />
      <span aria-hidden="true" className={s.evidenceBotanical} />
      <Container size="wide">
        <div className={s.evidenceLayout} data-evidence-layout>
          <header className={s.evidenceHeader} data-evidence-intro>
            <span className={s.evidenceEyebrow} data-evidence-eyebrow-mask>
              <span data-evidence-eyebrow-ink>
                {homepageContent.evidence.intro.eyebrow}
              </span>
            </span>
            <h2
              aria-label={homepageContent.evidence.intro.title}
              id="evidence-title"
            >
              {homepageContent.evidence.intro.title
                .split(/\s+/u)
                .map((word, index, words) => (
                  <Fragment key={`${word}-${index}`}>
                    <span
                      aria-hidden="true"
                      className={s.evidenceWord}
                      data-evidence-word
                    >
                      <span data-evidence-word-ink>{word}</span>
                    </span>
                    {index < words.length - 1 ? " " : null}
                  </Fragment>
                ))}
            </h2>
            <p className={s.evidenceLead}>
              <span className={s.evidenceLeadMask}>
                <span data-evidence-lead-ink>
                  <strong>Bez marketingových tvrzení.</strong>
                  {homepageContent.evidence.intro.lead}
                </span>
              </span>
            </p>
          </header>

          <ul
            aria-label="Ověřitelné profesní informace"
            className={s.evidenceRegister}
            data-evidence-register
            role="list"
          >
            {fact?.publicSourceUrl ? (
              <>
                <li
                  aria-labelledby="evidence-cnb-title"
                  className={s.evidenceRow}
                  data-evidence-authority="cnb"
                  data-evidence-row="cnb"
                >
                  <ProcessLiquidLinesBackdrop />
                  <Link
                    aria-label="Ověřit registraci v registru ČNB (otevře se v nové kartě)"
                    className={`${s.evidenceRowGrid} ${s.evidenceRowLink} ${flow.content}`}
                    data-cursor="external"
                    data-cursor-icon="external"
                    data-cursor-label="VEŘEJNÝ REGISTR • OVĚŘIT ZÁZNAM •"
                    data-cursor-split-core
                    data-evidence-row-link
                    data-evidence-source-cta
                    href={fact.publicSourceUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    variant="text"
                  >
                    <p className={s.evidenceSource} data-evidence-source>
                      ČNB
                    </p>
                    <Landmark aria-hidden="true" className={s.evidenceSourceIcon} strokeWidth={1.5} />
                    <div className={s.evidenceCopy} data-evidence-content>
                      <h3 id="evidence-cnb-title">
                        Registrace v evidenci České národní banky
                      </h3>
                      <p className={s.evidenceMeta}>Veřejný registr</p>
                    </div>
                    <span className={s.evidenceCnbActions}>
                      <span className={`${s.evidenceAction} ${s.evidencePrimaryAction}`} data-evidence-action>
                        <span>Ověřit registraci</span>
                        <span aria-hidden="true" className={s.evidenceExternalArrow} data-evidence-arrow>
                          <ArrowRight aria-hidden="true" />
                        </span>
                      </span>
                      <span className={s.evidenceSourceNote}>
                        Přímý odkaz<br />na oficiální zdroj
                      </span>
                    </span>
                  </Link>
                </li>

                <li
                  aria-labelledby="evidence-sab-title"
                  className={s.evidenceRow}
                  data-evidence-authority="sab"
                  data-evidence-row="sab"
                >
                  <Link
                    aria-label="Otevřít dokumentaci společnosti SAB servis (otevře se v nové kartě)"
                    className={`${s.evidenceRowGrid} ${s.evidenceRowLink}`}
                    data-cursor="external"
                    data-cursor-icon="external"
                    data-cursor-label="SAB SERVIS • OTEVŘÍT DOKUMENTACI •"
                    data-cursor-split-core
                    data-evidence-row-link
                    href={sabDocumentationUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                    variant="text"
                  >
                    <p className={s.evidenceSource} data-evidence-source>
                      SAB servis
                    </p>
                    <FileText aria-hidden="true" className={s.evidenceSourceIcon} strokeWidth={1.5} />
                    <div className={s.evidenceCopy} data-evidence-content>
                      <h3 id="evidence-sab-title">{fact.value}</h3>
                      <p className={s.evidenceMeta}>IČO 24704008</p>
                    </div>
                    <span className={s.evidenceAction} data-evidence-action>
                      <span>Otevřít dokumentaci</span>
                      <span
                        aria-hidden="true"
                        className={s.evidenceExternalArrow}
                        data-evidence-arrow
                      >
                        <ArrowRight aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              </>
            ) : null}

            <li
              aria-labelledby="evidence-exams-title"
              className={`${s.evidenceRow} ${s.evidenceRowGrid}`}
              data-evidence-exams
              data-evidence-row="exams"
            >
              <p className={s.evidenceSource} data-evidence-source>
                Odborné zkoušky
              </p>
              <Award aria-hidden="true" className={s.evidenceSourceIcon} strokeWidth={1.5} />
              <div className={s.evidenceCopy} data-evidence-content>
                <h3 id="evidence-exams-title">
                  Osvědčení o odborné způsobilosti
                </h3>
                <p className={s.evidenceMeta}>
                  {evidenceCertificates.length} původní PDF dokumenty
                </p>
              </div>
              <ul
                aria-label="Původní PDF dokumenty odborných zkoušek"
                className={s.evidenceCertificateLinks}
                data-evidence-action
                data-evidence-certificates
              >
                {evidenceCertificates.map((certificate) => (
                  <li key={certificate.href}>
                    <Link
                      aria-label={`${certificate.label} — PDF dokument (otevře se v nové kartě)`}
                      className={`${s.evidenceAction} ${s.evidenceCertificateLink}`}
                      data-cursor="external"
                      data-cursor-icon="external"
                      data-cursor-label={`${certificate.label.toUpperCase()} • OTEVŘÍT PDF •`}
                      data-cursor-split-core
                      data-evidence-certificate
                      href={certificate.href}
                      rel="noopener noreferrer"
                      target="_blank"
                      variant="text"
                    >
                      <FileText aria-hidden="true" className={s.evidenceDocumentIcon} strokeWidth={1.75} />
                      <span>{certificate.label}</span>
                      <span
                        aria-hidden="true"
                        className={s.evidenceExternalArrow}
                        data-evidence-arrow
                      >
                        <ArrowRight aria-hidden="true" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
          <p className={s.evidenceFootnote}>
            <span>Transparentně</span><span aria-hidden="true">/</span>
            <span>Odborně</span><span aria-hidden="true">/</span>
            <span>Ve vašem zájmu</span>
          </p>
        </div>
      </Container>
      <span
        aria-hidden="true"
        className={s.evidenceRevealRule}
        data-edge="bottom"
        data-evidence-reveal-rule
      />
    </Surface>
  );
}

function ProfileSection() {
  const profile = homepageContent.profile;
  const [roleFact] = getHomepagePublicFacts([profile.roleFactId]);

  return (
    <Surface
      as="section"
      aria-labelledby="profile-title"
      className={s.profileSection}
      data-cursor-surface-transition="clip-path"
      data-hero-transition-target
      data-home-module="profile"
      data-nav-theme="light"
      data-profile-motion-signature="editorial-portrait"
      id="david"
      surface="paper"
      tone="light"
    >
      <Container size="wide">
        <div
          className={s.profileScene}
          data-profile-scene
        >
          <div className={s.profileLayout}>
            <div className={s.profileContent} data-profile-copy>
              <h2
                className={s.profileTitle}
                data-profile-heading
                data-profile-title
                id="profile-title"
              >
                {profile.intro.titleLines.map((line, index) => (
                  <Fragment key={line}>
                    <span
                      className={s.profileTitleLine}
                      data-profile-title-line
                      data-profile-title-line-index={index}
                    >
                      <span data-profile-title-line-ink>{line}</span>
                    </span>
                    {index < profile.intro.titleLines.length - 1 ? (
                      " "
                    ) : null}
                  </Fragment>
                ))}
              </h2>
            </div>

            <figure className={s.profilePortrait} data-profile-portrait>
              <div
                className={s.profilePortraitFrame}
                data-profile-portrait-frame
              >
                <div
                  className={s.profilePortraitMedia}
                  data-profile-portrait-media
                >
                  <Image
                    alt={profile.portraitAlt}
                    className={s.profilePortraitImage}
                    height={1096}
                    sizes="(max-width: 700px) 90vw, (max-width: 1040px) 480px, (max-width: 1600px) 38vw, 640px"
                    src={profile.portrait}
                    width={700}
                  />
                </div>
              </div>
            </figure>

            <div className={s.profileNarrative} data-profile-narrative>
              <span
                aria-hidden="true"
                className={s.profileNarrativeRule}
                data-profile-narrative-rule
              />
              <div className={s.profileStory} data-profile-story="lead">
                <p
                  className={s.profileIntroduction}
                  data-profile-introduction
                >
                  <span data-profile-introduction-ink>
                    {profile.intro.introduction}
                  </span>
                </p>
              </div>

              <blockquote className={s.profileQuote} data-profile-quote>
                <span
                  aria-hidden="true"
                  className={s.profileQuoteRule}
                  data-profile-quote-rule
                />
                <p data-profile-quote-copy>
                  <span
                    className={s.profileQuoteEmphasis}
                    data-profile-quote-sentence={1}
                  >
                    <span data-profile-quote-sentence-ink>
                      {profile.intro.statement[0]}
                    </span>
                  </span>
                </p>
              </blockquote>

              <div className={s.profileMeta} data-profile-meta>
                <span
                  aria-hidden="true"
                  className={s.profileMetaRule}
                  data-profile-meta-rule
                />
                <Link
                  className={s.profileAboutLink}
                  data-cta-composition="docked"
                  data-cursor="action"
                  data-cursor-icon="send"
                  data-profile-about-link
                  href={profile.aboutLink.href}
                  variant="primary-action"
                >
                  <span data-cta-label>
                    {profile.aboutLink.label}
                  </span>
                  <span
                    aria-hidden="true"
                    data-cta-icon-shell
                    data-profile-about-icon
                  >
                    <span data-cta-icon-motion>
                      <ArrowRight aria-hidden="true" data-cta-icon="arrow-right" />
                    </span>
                  </span>
                </Link>

                {roleFact?.publicSourceUrl ? (
                  <div className={s.profileTrust} data-profile-detail>
                    <Link
                      aria-label="Ověřit moje oprávnění v registru České národní banky (otevře se v novém okně)"
                      className={s.profileRegistryLink}
                      data-profile-registry-link
                      href={roleFact.publicSourceUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                      variant="text"
                    >
                      <span>Ověřit v registru ČNB</span>
                      <ArrowUpRight aria-hidden="true" />
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Container>
    </Surface>
  );
}

function ArticlesSection({ posts }: { posts: readonly BlogPostMeta[] }) {
  const insights = homepageContent.insights;
  if (!insights) return null;

  const insightsTitleLines = insights.intro.title
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const postsBySlug = new Map(posts.map((post) => [post.slug, post]));
  const fallbackVisual = getArticleVisual("konec-fixace-hypoteky");
  const articles = insights.articleIds
    .map((id, landingOrder) => {
      const article = postsBySlug.get(id);
      const copy = insights.articleCopy?.[id];
      const visual = article ? getArticleVisual(article.slug) : undefined;

      if (!article) return null;

      return {
        slug: article.slug,
        title: copy?.title ?? article.title,
        excerpt: copy?.excerpt ?? article.excerpt,
        categoryLabel: copy?.categoryLabel ?? categoryLabels[article.category],
        readingTime: article.readingTime ?? copy?.readingTime ?? "KRÁTKÉ ČTENÍ",
        imageSrc: visual?.src ?? fallbackVisual?.src,
        imageAlt: `Titulní fotografie k článku ${(
          copy?.title ?? article.title
        ).replace(/\s+/gu, " ").trim()}`,
        landingRole: landingOrder === 0 ? "primary" as const : "secondary" as const,
        landingOrder,
      };
    })
    .filter(
      (article): article is HomeEditorialArticle =>
        Boolean(article?.imageSrc),
    );

  if (articles.length !== 3) return null;
  const editorialArticles = articles as [
    HomeEditorialArticle,
    HomeEditorialArticle,
    HomeEditorialArticle,
  ];

  return (
    <Surface
      as="section"
      aria-labelledby="home-insights-title"
      className={s.insightsSection}
      data-home-module="insights"
      data-nav-theme="dark"
      id="clanky-z-praxe"
      surface="section-dark"
      tone="dark"
    >
      <ProcessLiquidLinesBackdrop />
      <Container className={flow.content} size="wide">
        <header className={s.insightsHeader}>
          <div
            className={s.insightsIntro}
            data-home-articles-intro="heading"
          >
            <span
              className={s.insightsEyebrow}
              data-home-articles-intro-item
            >
              {insights.intro.eyebrow}
            </span>
            <h2
              aria-label={insights.intro.title.replace(/\s+/gu, " ").trim()}
              data-home-articles-intro-item
              id="home-insights-title"
            >
              {insightsTitleLines.map((line, lineIndex) => (
                <span
                  aria-hidden="true"
                  className={
                    lineIndex === insightsTitleLines.length - 1
                      ? s.insightsTitleAccent
                      : s.insightsTitleLine
                  }
                  data-home-articles-title-line={lineIndex + 1}
                  key={line}
                >
                  {line}
                </span>
              ))}
            </h2>
          </div>
          <div
            className={s.insightsContext}
            data-home-articles-intro="context"
            data-home-articles-intro-item
          >
            <span className={s.insightsContextLabel}>
              Případy &amp; rozhodnutí
            </span>
            <p>{insights.intro.lead}</p>
          </div>
        </header>
        <HomeArticlesEditorial articles={editorialArticles} />
        <footer className={s.insightsFooter} data-home-articles-footer>
          <Link
            aria-label="Procházet všechny články"
            className={s.insightsAllLink}
            href="/clanky/"
            variant="text"
          >
            <span>{insights.allArticlesLabel}</span>
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </footer>
      </Container>
    </Surface>
  );
}

function FaqSection() {
  const { faq } = homepageContent;

  return (
    <Surface
      data-home-module="faq"
      data-nav-theme="light"
      surface="paper"
      tone="light"
    >
      <section aria-labelledby="faq-title" className={s.faqSection} id="faq">
        <span
          aria-hidden="true"
          className={s.faqRevealRule}
          data-edge="top"
          data-faq-reveal-rule
        />
        <Container size="wide">
          <div className={s.faqLayout} data-home-faq-layout>
            <header
              className={s.faqIntro}
              data-align="start"
              data-pattern="section-intro"
            >
              <span className={s.faqEyebrow} data-faq-eyebrow-mask>
                <span data-faq-eyebrow-ink>{faq.intro.eyebrow}</span>
              </span>
              <h2 aria-label={faq.intro.title} id="faq-title">
                {faq.intro.title.split(/\s+/u).map((word, index, words) => (
                  <Fragment key={`${word}-${index}`}>
                    <span
                      aria-hidden="true"
                      className={s.faqWord}
                      data-faq-word
                    >
                      <span data-faq-word-ink>{word}</span>
                    </span>
                    {index < words.length - 1 ? " " : null}
                  </Fragment>
                ))}
              </h2>
              <p className={s.faqLead}>
                <span className={s.faqLeadMask}>
                  <span data-faq-lead-ink>{faq.intro.lead}</span>
                </span>
              </p>
            </header>
            <div className={s.faqContent}>
              <HomeFaqAccordion idPrefix="home-faq" items={faq.items} />
              <p className={s.faqPrivacyNote} data-faq-privacy-note>
                {faq.privacyNote.text}{" "}
                <Link
                  className={s.faqPrivacyLink}
                  href={faq.privacyNote.href}
                  variant="text"
                >
                  <span>{faq.privacyNote.linkLabel}</span>
                  <span aria-hidden="true" className={s.faqPrivacyArrow}>
                    ↗
                  </span>
                </Link>
              </p>
            </div>
          </div>
        </Container>
        <span
          aria-hidden="true"
          className={s.faqRevealRule}
          data-edge="bottom"
          data-faq-reveal-rule
        />
      </section>
    </Surface>
  );
}

function FinalContactSection() {
  const finalCta = homepageContent.finalCta;

  return (
    <ActionBand
      actions={(
        <OverviewActionLink
          href={finalCta.primaryCta.href}
          label={finalCta.primaryCta.label}
          placement="final"
        />
      )}
      className={s.finalActionSection}
      data-home-module="final-action"
      data-nav-theme="light"
      heading={finalCta.title}
      headingId="final-action-title"
      id="zacit"
      lead={finalCta.description}
      surface="action"
    />
  );
}

export default async function Page() {
  const [articles, serviceItems] = await Promise.all([
    getArticleCollection(),
    getServiceItems(),
  ]);
  const situationOfferingTitles = createSituationOfferingTitles(serviceItems);
  assertHomepageStructure({
    articleSlugs: articles.map((article) => article.slug),
  });
  const homepageJsonLd = createHomepageWebPageJsonLd({
    description: PAGE_DESCRIPTION,
    name: PAGE_TITLE,
  });

  return (
    <>
      <script
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(homepageJsonLd) }}
        type="application/ld+json"
      />
      <HomepageIntro />
      <HomeTemplate
        className={s.homeMain}
        footer={<PublicSiteFooter className={s.homeFooter} />}
        header={(
          <PublicSiteHeader
            alternateHeaderSelector='[data-header-instance="hero"]'
            className={cinematicDynamicHeaderClassName}
            currentPath="/"
            headerInstance="dynamic"
            hiddenWithinSelector="[data-cinematic-home-hero]"
            initialMaterial="hero-glass"
            initiallyHidden
            restoreThemeOnHistory={false}
          />
        )}
        hero={<CinematicHomeHero />}
        mainId="main-content"
      >
        <div data-hero-transition-flow data-home-cinematic-flow>
          <div
            className={s.profileSituationSource}
            data-profile-situation-source
          >
            <ProfileSection />
          </div>
          <SituationRouter offeringTitles={situationOfferingTitles} />
          <DeferredProfileSituationReveal />
          <DeferredSituationOrientationReveal />
          <ProcessSection />
          <ReferencesSection />
          <EvidenceSection />
          <ArticlesSection posts={articles} />
          <FaqSection />
          <HomeTemplateActionSlot>
            <FinalContactSection />
          </HomeTemplateActionSlot>
          <DeferredHomeCinematicScroll />
        </div>
      </HomeTemplate>
    </>
  );
}
