"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Search,
  Star,
  X,
} from "lucide-react";
import { OverviewActionLink } from "@/app/_components/PublicSiteChrome";
import ReactBitsSilk from "@/app/_components/effects/ReactBitsSilk.client";
import {
  type ReferenceReview,
} from "@/app/content/testimonials";
import { SERVICE_CONFIG, type ServiceKey } from "@/app/content/service-labels";
import ActionBand from "@/app/ui/patterns/ActionBand";
import ReferencesHeroMotion from "./ReferencesHeroMotion.client";
import s from "./references.module.css";

type TrustMetric = {
  value: string;
  label: string;
};

type CategoryTabId = "all" | ServiceKey;

type ReferencesExperienceProps = {
  featuredReview: ReferenceReview;
  reviews: readonly ReferenceReview[];
  trustMetrics: readonly TrustMetric[];
};

const categoryTabs: Array<{ id: CategoryTabId; label: string }> = [
  { id: "all", label: "Všechny" },
  { id: "comprehensivePlan", label: "Komplexní finanční plán" },
  { id: "mortgage", label: "Hypotéka" },
  { id: "investments", label: "Investice" },
  { id: "incomeProtection", label: "Ochrana příjmu" },
  { id: "propertyProtection", label: "Ochrana majetku" },
];

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatResultCount(count: number) {
  if (count === 1) return "1 výsledek";
  if (count >= 2 && count <= 4) return `${count} výsledky`;
  return `${count} výsledků`;
}

function Stars({ rating }: { rating?: number }) {
  if (rating === undefined) return null;

  return (
    <span
      className={s.stars}
      aria-label={`Hodnocení ${rating} z 5`}
      role="img"
    >
      {Array.from({ length: rating }, (_, index) => (
        <Star key={index} aria-hidden="true" fill="currentColor" />
      ))}
    </span>
  );
}

export default function ReferencesExperience({
  featuredReview,
  reviews,
  trustMetrics,
}: ReferencesExperienceProps) {
  const heroExcerpt = featuredReview.excerpt ?? featuredReview.fullText;
  const heroQuoteEmphasis = "srozumitelným způsobem";
  const heroQuoteEmphasisIndex = heroExcerpt.indexOf(
    heroQuoteEmphasis,
  );
  const heroQuoteBefore =
    heroQuoteEmphasisIndex >= 0
      ? heroExcerpt.slice(0, heroQuoteEmphasisIndex)
      : heroExcerpt;
  const heroQuoteAfter =
    heroQuoteEmphasisIndex >= 0
      ? heroExcerpt.slice(
          heroQuoteEmphasisIndex + heroQuoteEmphasis.length,
        )
      : "";
  const [activeCategory, setActiveCategory] = useState<CategoryTabId>("all");
  const [query, setQuery] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const dialogCloseRef = useRef<HTMLButtonElement | null>(null);
  const lastReviewTriggerRef = useRef<HTMLButtonElement | null>(null);

  const visibleReviews = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return reviews.filter((review) => {
      const matchesCategory =
        activeCategory === "all" ||
        review.client.serviceKeys.includes(activeCategory);
      const serviceLabels = review.client.serviceKeys
        .map((key) => SERVICE_CONFIG[key].shortLabel)
        .join(" ");
      const searchable = normalizeText(
        `${review.author} ${review.areas.join(" ")} ${serviceLabels} ${review.fullText}`,
      );

      return matchesCategory && searchable.includes(normalizedQuery);
    });
  }, [activeCategory, query, reviews]);

  const selectedReview = useMemo(
    () =>
      selectedReviewId
        ? reviews.find((review) => review.id === selectedReviewId) ?? null
        : null,
    [reviews, selectedReviewId],
  );

  const openReview = useCallback(
    (reviewId: string, trigger: HTMLButtonElement) => {
      lastReviewTriggerRef.current = trigger;
      setSelectedReviewId(reviewId);
    },
    [],
  );

  const closeReview = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !selectedReview) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyModalOpen = document.body.getAttribute("data-modal-open");
    const previousHtmlModal = document.documentElement.dataset.modal;
    const focusFrame = window.requestAnimationFrame(() => {
      dialogCloseRef.current?.focus({ preventScroll: true });
    });

    const handleClose = () => {
      setSelectedReviewId(null);
      window.requestAnimationFrame(() => {
        lastReviewTriggerRef.current?.focus({ preventScroll: true });
      });
    };

    dialog.addEventListener("close", handleClose);
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-modal-open", "1");
    document.documentElement.dataset.modal = "1";

    return () => {
      window.cancelAnimationFrame(focusFrame);
      dialog.removeEventListener("close", handleClose);
      document.body.style.overflow = previousBodyOverflow;

      if (previousBodyModalOpen === null) {
        document.body.removeAttribute("data-modal-open");
      } else {
        document.body.setAttribute("data-modal-open", previousBodyModalOpen);
      }

      if (previousHtmlModal === undefined) {
        delete document.documentElement.dataset.modal;
      } else {
        document.documentElement.dataset.modal = previousHtmlModal;
      }

      if (dialog.open) dialog.close();
    };
  }, [selectedReview]);

  return (
    <section
      className={s.page}
      aria-labelledby="references-title"
      data-reference-page
      data-reference-renderer="canonical"
      data-route-reveal-root
      data-route-reveal-profile="staged"
    >
      <ReferencesHeroMotion />

      <div
        className={s.heroSurface}
        data-nav-section="dark"
        data-reference-hero
        data-reference-silk-stage
      >
        <ReactBitsSilk
          className={s.heroSilk}
          readyAttribute="data-reference-silk-ready"
          readyTargetSelector="[data-reference-silk-stage]"
        />
        <div className={`${s.shell} ${s.heroShell}`}>
          <div className={s.heroComposition}>
            <div className={s.heroQuoteColumn}>
              <p
                className={s.eyebrow}
                data-reference-hero-part="eyebrow"
                data-route-hero-entry="0"
              >
                Reference a zkušenosti
              </p>

              <figure className={s.heroQuote}>
                <blockquote cite={featuredReview.sourceUrl}>
                  <h1
                    id="references-title"
                    data-reference-hero-part="quote"
                    data-route-hero-entry="1"
                  >
                    „{heroQuoteBefore}
                    {heroQuoteEmphasisIndex >= 0 ? (
                      <span
                        className={s.heroQuoteAccent}
                        data-reference-hero-emphasis
                      >
                        {heroQuoteEmphasis}
                      </span>
                    ) : null}
                    {heroQuoteAfter}“
                  </h1>
                </blockquote>

                <figcaption
                  className={s.heroReviewMeta}
                  data-reference-hero-part="metadata"
                  data-route-hero-entry="2"
                >
                  <span className={s.heroIdentity}>
                    <strong>{featuredReview.author}</strong>
                    <span>
                      {featuredReview.areas.join(" · ")}
                    </span>
                  </span>

                  <span className={s.heroVerification}>
                    <Stars rating={featuredReview.rating} />
                    {featuredReview.verified ? (
                      <a
                        href={featuredReview.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Otevřít ověřenou Google recenzi od ${featuredReview.author} v nové kartě`}
                      >
                        Ověřená Google recenze
                        <ExternalLink aria-hidden="true" />
                      </a>
                    ) : null}
                  </span>
                </figcaption>
              </figure>
            </div>

            <aside
              className={s.heroContext}
              data-reference-hero-part="context"
              data-route-hero-entry="2"
            >
              <p>
                Skutečné zkušenosti lidí, kteří řešili hypotéku, pojištění,
                investice nebo celkové finanční nastavení. Každou recenzi si
                můžete otevřít přímo v jejím původním zdroji.
              </p>
            </aside>
          </div>

          <dl
            className={s.proofBar}
            aria-label="Souhrn ověřených referencí"
            data-reference-hero-part="proof"
          >
            {trustMetrics.map((metric, index) => (
              <div
                key={metric.label}
                data-reference-hero-proof
                data-route-hero-entry={index + 3}
              >
                <dt>{metric.value}</dt>
                {" "}
                <dd>{metric.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className={s.ledgerSurface} data-nav-section="light">
        <div className={`${s.shell} ${s.ledgerShell}`}>
          <header className={s.ledgerHeader} data-route-reveal-group>
            <div>
              <p className={s.eyebrow} data-route-reveal-item="meta">
                Všechny zkušenosti
              </p>
              <h2 data-route-reveal-item="title">
                Co se ve spolupráci skutečně opakuje.
              </h2>
            </div>
            <p data-route-reveal-item="body">
              Vyberte oblast nebo jméno. Kliknutím na řádek otevřete celou
              zkušenost, bez zkratek a bez přepsaného významu.
            </p>
          </header>

          <div
            className={s.toolbar}
            data-reference-toolbar
            data-header-motion-sticky
          >
            <div
              className={s.filterDock}
              data-reference-filter-dock
              data-header-motion-sticky
            >
              <div className={s.filters} aria-label="Filtrovat reference">
                {categoryTabs.map((tab) => (
                  <button
                    key={tab.id}
                    className={
                      activeCategory === tab.id ? s.filterButtonActive : ""
                    }
                    type="button"
                    data-cursor-no-magnetic
                    onClick={() => setActiveCategory(tab.id)}
                    aria-pressed={activeCategory === tab.id}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className={s.resultCount} aria-live="polite">
                {formatResultCount(visibleReviews.length)}
              </span>
            </div>

            <label className={s.searchBox}>
              <span className={s.srOnly}>Hledat v recenzích</span>
              <Search aria-hidden="true" />
              <input
                autoComplete="off"
                name="reference-query"
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Hledat jméno nebo téma…"
                aria-controls="reference-results"
                spellCheck={false}
              />
              {query ? (
                <button
                  className={s.clearSearch}
                  type="button"
                  data-cursor-no-magnetic
                  onClick={() => setQuery("")}
                  aria-label="Vymazat hledání"
                >
                  <X aria-hidden="true" />
                </button>
              ) : null}
            </label>
          </div>

          <h2 className={s.srOnly} id="review-list-title">
            Ověřené Google recenze
          </h2>

          <div
            aria-labelledby="review-list-title"
            className={s.resultRegion}
            id="reference-results"
          >
            {visibleReviews.length > 0 ? (
              <div className={s.reviewLedger}>
                {visibleReviews.map((review) => {
                  const primaryService = review.client.serviceKeys[0];
                  const primaryArea = activeCategory === "all"
                    ? primaryService
                      ? SERVICE_CONFIG[primaryService].shortLabel
                      : review.areas[0]
                    : categoryTabs.find((tab) => tab.id === activeCategory)?.label;

                  return (
                    <article
                      className={s.reviewRow}
                      data-review-id={review.id}
                      data-route-reveal-group="row"
                      key={review.id}
                    >
                      <div className={s.rowGrid}>
                        <div className={s.rowContent}>
                          <span
                            className={s.rowAreas}
                            data-review-primary-area
                            data-route-reveal-item="meta"
                          >
                            {primaryArea}
                          </span>
                          <blockquote
                            className={s.rowQuote}
                            id={`review-quote-${review.id}`}
                            data-route-reveal-item="title"
                          >
                            <p>„{review.excerpt ?? review.fullText}“</p>
                          </blockquote>
                          <span className={s.reviewHint} data-route-reveal-item="control">
                            Celá recenze
                            <ArrowUpRight aria-hidden="true" />
                          </span>
                        </div>

                        <div className={s.rowPerson}>
                          <strong
                            id={`review-author-${review.id}`}
                            data-route-reveal-item="body"
                          >
                            {review.author}
                          </strong>
                          {review.rating !== undefined ? (
                            <span className={s.rowRating} data-route-reveal-item="detail">
                              <Stars rating={review.rating} />
                            </span>
                          ) : null}
                          {review.sourceUrl ? (
                            <a
                              className={s.rowSource}
                              href={review.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              data-cursor-no-magnetic
                              aria-label={`Otevřít ověřenou Google recenzi od ${review.author} v nové kartě`}
                            >
                              <span className={s.rowSourceContent} data-route-reveal-item="control">
                                Google recenze
                                <ExternalLink aria-hidden="true" />
                              </span>
                            </a>
                          ) : review.verified ? (
                            <span
                              className={s.rowSourceText}
                              aria-label="Ověřená Google recenze"
                              data-route-reveal-item="detail"
                            >
                              Google recenze
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <button
                        className={s.rowOpenTarget}
                        type="button"
                        data-cursor-no-magnetic
                        aria-haspopup="dialog"
                        aria-label={`Celá recenze od ${review.author}`}
                        onClick={(event) =>
                          openReview(review.id, event.currentTarget)
                        }
                      />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div
                className={s.emptyState}
                data-route-reveal-group="row"
                role="status"
              >
                <p data-route-reveal-item="body">
                  Pro tento výběr tu není žádná zkušenost. Zkuste jiné
                  jméno, téma nebo oblast.
                </p>
                <button
                  type="button"
                  data-cursor-no-magnetic
                  onClick={() => {
                    setActiveCategory("all");
                    setQuery("");
                  }}
                >
                  <span data-route-reveal-item="control">Zobrazit všechny reference</span>
                </button>
              </div>
            )}
          </div>

          <dialog
            ref={dialogRef}
            className={s.reviewDialog}
            aria-labelledby="review-dialog-title"
            aria-describedby="review-dialog-copy"
            data-review-dialog
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeReview();
            }}
          >
            {selectedReview ? (
              <div className={s.reviewDialogPanel}>
                <header className={s.reviewDialogHeader}>
                  <div>
                    <p className={s.dialogEyebrow} data-review-areas>
                      {selectedReview.areas.join(" · ")}
                    </p>
                    <h2 id="review-dialog-title">{selectedReview.author}</h2>
                  </div>
                  <button
                    ref={dialogCloseRef}
                    className={s.dialogClose}
                    type="button"
                    onClick={closeReview}
                    aria-label="Zavřít celou zkušenost"
                  >
                    <X aria-hidden="true" />
                  </button>
                </header>

                <div className={s.reviewDialogMeta}>
                  <Stars rating={selectedReview.rating} />
                  {selectedReview.verified ? (
                    <span>Ověřená Google recenze</span>
                  ) : null}
                </div>

                <blockquote
                  cite={selectedReview.sourceUrl}
                  className={s.reviewDialogQuote}
                >
                  <p id="review-dialog-copy">„{selectedReview.fullText}“</p>
                </blockquote>

                <footer className={s.reviewDialogFooter}>
                  {selectedReview.sourceUrl ? (
                    <a
                      href={selectedReview.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Otevřít původní Google recenzi od ${selectedReview.author} v nové kartě`}
                    >
                      Otevřít původní recenzi
                      <ExternalLink aria-hidden="true" />
                    </a>
                  ) : (
                    <span>Ověřená Google recenze</span>
                  )}
                  <button type="button" onClick={closeReview}>
                    Zavřít
                  </button>
                </footer>
              </div>
            ) : null}
          </dialog>
        </div>
      </div>

      <div
        data-nav-section="light"
        data-reference-action
        data-route-reveal-group
      >
        <ActionBand
          actions={
            <OverviewActionLink
              cursorLabel="PROBRAT MOJI SITUACI • PRVNÍ KROK •"
              href="/ziskat-prehled/?source=references&cta=references-final"
              label="Probrat moji situaci"
              placement="references-final"
              track={false}
            />
          }
          eyebrow="Váš první krok"
          heading={
            <>
              <span>Teď může přijít na řadu</span>{" "}
              <span>vaše situace.</span>
            </>
          }
          headingId="reference-cta-title"
          lead="Krátce mi řeknete, co právě řešíte. Společně zjistíme, jestli a jak dává smysl pokračovat — bez dokumentů a bez závazku."
          revealContent
          surface="action"
        />
      </div>
    </section>
  );
}
