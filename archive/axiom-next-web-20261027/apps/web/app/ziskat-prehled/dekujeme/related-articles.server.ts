import "server-only";

import { getArticleCollection } from "@/lib/article-content.server";
import { categoryLabels } from "@/lib/blog";
import type { LeadIntent } from "@/lib/leads/lead-contract";

export type ThankYouRelatedArticle = {
  slug: string;
  title: string;
  categoryLabel: string;
  readingTime?: string;
};

const GENERAL_READING = [
  "mate-financni-produkty-ale-mate-skutecne-financni-plan",
  "v-jakem-poradi-resit-osobni-finance",
  "kolik-ma-mit-domacnost-v-rezerve",
] as const;

const READING_BY_INTENT = {
  overview: GENERAL_READING,
  unsure: GENERAL_READING,
  housing: [
    "banka-vam-pujci-vic-nez-si-muzete-dovolit",
    "urokova-sazba-neni-cena-hypoteky",
    "konec-fixace-hypoteky",
  ],
  financing: [
    "urokova-sazba-neni-cena-hypoteky",
    "banka-vam-pujci-vic-nez-si-muzete-dovolit",
    "mate-financni-produkty-ale-mate-skutecne-financni-plan",
  ],
  protection: [
    "mate-pojisteni-prijmu-nebo-jen-pocit",
    "zdrazilo-vam-pojisteni",
    "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou",
  ],
  future: [
    "chcete-investovat-zacnete-planem",
    "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku",
    "kolik-ma-mit-domacnost-v-rezerve",
  ],
} as const satisfies Record<LeadIntent, readonly string[]>;

export async function getThankYouRelatedArticles(
  intent: LeadIntent,
): Promise<ThankYouRelatedArticle[]> {
  try {
    // The production source contains only published articles. Select from that
    // collection so a recommendation never points to an unpublished slug.
    const articles = await getArticleCollection();
    const available = new Map(
      articles
        .filter((article) => article.seoIndex !== false)
        .map((article) => [article.slug, article] as const),
    );
    const orderedSlugs = [
      ...READING_BY_INTENT[intent],
      ...GENERAL_READING,
      ...[...available.keys()].sort(),
    ];
    const selected: ThankYouRelatedArticle[] = [];
    const seen = new Set<string>();

    for (const slug of orderedSlugs) {
      if (seen.has(slug)) continue;
      seen.add(slug);

      const article = available.get(slug);
      if (!article) continue;

      selected.push({
        slug: article.slug,
        title: article.title,
        categoryLabel: article.heroCategoryLabel ?? categoryLabels[article.category],
        ...(article.readingTime ? { readingTime: article.readingTime } : {}),
      });
      if (selected.length === 3) break;
    }

    return selected;
  } catch {
    // The lead was already accepted. A transient article outage must not turn
    // the confirmation page into an error page.
    return [];
  }
}
