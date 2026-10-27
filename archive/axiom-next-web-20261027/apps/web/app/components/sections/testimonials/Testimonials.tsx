import Link from "next/link";
import s from "./testimonials.module.css";
import Container from "@/app/ui/container/Container";
import RevealClient from "@/app/ui/animations/RevealClient";
import {
  testimonialFeaturedReview as featuredReview,
  testimonialLeftColumn as leftColumn,
  testimonialRightColumn as rightColumn,
} from "@/app/content/testimonials";

export {
  testimonialFeaturedReview,
  testimonialReviews,
  testimonialTrustMetrics,
} from "@/app/content/testimonials";
export type { Review, ReviewSource, Testimonial } from "@/app/content/testimonials";

const homepageReviews = [featuredReview, leftColumn[0], rightColumn[0]].map(
  (review) => ({ ...review, label: "Google recenze" }),
);

const Testimonials = () => {
  return (
    <section className={s.section} data-surface-tone="dark">
      <Container className={s.inner}>
        <div className={s.referenceTrio}>
          <div className={s.referenceHeader}>
            <RevealClient as="p" from="bottom" className={s.eyebrow}>
              Ověřené zkušenosti
            </RevealClient>
            <RevealClient as="h2" from="bottom" className={s.gradientSoft}>
              Co se v recenzích opakuje nejčastěji
            </RevealClient>
            <RevealClient as="p" from="bottom" className={s.sectionDescription}>
              Srozumitelné vysvětlení, klidný přístup a jasný další krok.
            </RevealClient>
          </div>

          <RevealClient as="div" from="bottom" className={s.referenceGrid}>
            {homepageReviews.map((review, index) => (
              <article
                className={`${s.referenceCard} ${
                  index === 1 ? s.referenceCardFeatured : ""
                }`}
                key={review.id}
              >
                {review.rating !== undefined ? (
                  <div
                    className={s.referenceStars}
                    aria-label={`Hodnocení ${review.rating} z 5`}
                    role="img"
                  >
                    {"★".repeat(review.rating)}
                  </div>
                ) : null}
                <div className={s.referenceText}>
                  <p className={s.referenceLabel}>{review.label}</p>
                  <blockquote className={s.referenceQuote}>
                    {review.fullText}
                  </blockquote>
                </div>
                <footer className={s.referenceMeta}>
                  <div className={s.referenceAuthor}>
                    <span className={s.referenceAvatar} aria-hidden>
                      {review.author.charAt(0)}
                    </span>
                    <div>
                      <span className={s.referenceName}>{review.author}</span>
                      <span className={s.referenceSource}>
                        Ověřená Google recenze
                      </span>
                    </div>
                  </div>
                  <a
                    className={s.googleLink}
                    href={review.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Přečíst na Google <span aria-hidden="true">↗</span>
                  </a>
                </footer>
              </article>
            ))}
          </RevealClient>

          <RevealClient as="div" from="bottom" className={s.referenceFooter}>
            <Link className={s.referenceLink} href="/reference/">
              Zobrazit všechny Google recenze <span aria-hidden="true">↗</span>
            </Link>
            <span>Každý odkaz vede na původní veřejnou recenzi na Google.</span>
          </RevealClient>
        </div>
      </Container>
    </section>
  );
};

export default Testimonials;
