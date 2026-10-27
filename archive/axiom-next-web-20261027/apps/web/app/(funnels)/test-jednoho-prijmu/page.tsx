import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import LogoMark from "@/app/svgr/LogoMark";
import { PublicSiteFooter } from "@/app/_components/PublicSiteChrome";
import { getHomepageReviewById } from "@/app/content/testimonials";
import { createPageMetadata } from "@/lib/seo";
import IncomeTest from "./IncomeTest.client";
import s from "./incomeTest.module.css";

export const metadata: Metadata = { ...createPageMetadata({
  title: "Test jednoho příjmu: hypotéka a výdrž rezervy",
  description:
    "Spočítejte si, jak by se změnil rozpočet domácnosti při výpadku jednoho příjmu. Dvě varianty, měsíční rozdíl a výdrž rezervy. Výsledek bez zadání kontaktu.",
  path: "/test-jednoho-prijmu/",
}), robots: { index: false, follow: true } };

export const viewport: Viewport = { colorScheme: "light", themeColor: "#f6f5eb" };

export default function IncomeTestPage() {
  const review = getHomepageReviewById("denisa-reznickova");
  return (
    <div data-income-test-page>
      <div className={s.page}>
      <header className={s.header}>
        <Link href="/" data-journey-cta="main_site" data-journey-placement="header" className={s.brand} aria-label="David Pokorný – hlavní web">
          <LogoMark aria-hidden="true" focusable="false" />
          <span>David Pokorný<small>Finanční poradce</small></span>
        </Link>
        <Link href="/" data-journey-cta="main_site" data-journey-placement="header" className={s.backLink}>Hlavní web <ArrowUpRight aria-hidden="true" /></Link>
      </header>
      <main id="main-content" tabIndex={-1} className={s.main}>
        <IncomeTest />
        <figure className={s.clientProof} data-journey-section="testimonial">
          <div><p className={s.eyebrow}>Ze zkušeností mých klientů</p><p className={s.proofContext}>O spolupráci a přístupu</p></div>
          <div>
            <blockquote>„{review.excerpt}“</blockquote>
            <figcaption>{review.author} <span aria-hidden="true">·</span> <a href={review.sourceUrl} data-journey-cta="review_source" data-journey-placement="testimonial" target="_blank" rel="noopener noreferrer">Celá recenze na {review.source} <ArrowUpRight aria-hidden="true" /></a></figcaption>
          </div>
        </figure>
        <section data-journey-section="method" className={s.method} aria-labelledby="income-method-title">
          <h2 id="income-method-title">Co test počítá</h2>
          <p>Od příjmů odečítá splátku hypotéky a ostatní nutné výdaje. Pokud při výpadku příjmu vznikne měsíční schodek, dělí jím dostupnou rezervu. Počítá se stejnými příjmy a výdaji po celé zvolené období.</p>
          <p>Jde o orientační model, nikoli posouzení úvěruschopnosti ani doporučení konkrétního produktu. Automaticky nezahrnuje nemocenskou, podporu, pojistné plnění ani změny cen. Příjem, který by vám při výpadku skutečně zůstal, můžete ve výsledku doplnit.</p>
        </section>
      </main>
      </div>
      <PublicSiteFooter />
    </div>
  );
}
