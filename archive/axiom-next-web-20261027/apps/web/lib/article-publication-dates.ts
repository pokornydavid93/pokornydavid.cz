import type { PublicArticleDocumentV2 } from "./article-document-v2.ts";

// Publication dates explicitly assigned by the site owner on 2026-10-08.
// These exact eight repository documents now carry the same dates. The released
// web also reads older published API revisions, so resolve their publication
// metadata here, before every HTML/SEO projection, without publishing to the CMS
// or mutating the validated revision document/digest. This is not a deploy date
// fallback for other articles. A subsequently authored publication date wins.
export const APPROVED_ARTICLE_PUBLICATION_DATE = "2026-10-08";
export const APPROVED_ARTICLE_PUBLICATION_SLUGS = [
  "mate-financni-produkty-ale-mate-skutecne-financni-plan",
  "v-jakem-poradi-resit-osobni-finance",
  "kolik-ma-mit-domacnost-v-rezerve",
  "banka-vam-pujci-vic-nez-si-muzete-dovolit",
  "urokova-sazba-neni-cena-hypoteky",
  "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku",
  "cestovko-zdarma-od-karty-vas-nemusi-zachranit",
  "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou",
] as const;

const approvedSlugs: ReadonlySet<string> = new Set(APPROVED_ARTICLE_PUBLICATION_SLUGS);
type Publication = PublicArticleDocumentV2["publication"];

export function resolveArticlePublication(
  slug: string,
  publication: Publication,
): Publication {
  if (
    !approvedSlugs.has(slug) ||
    publication.author !== "David Pokorný" ||
    publication.publishedAt
  ) {
    return publication;
  }

  // One older published revision has an editorial update timestamp but no
  // publication date. The owner's new revision supersedes that older date;
  // a later CMS update must still survive future cache regeneration.
  const updatedAt = publication.updatedAt &&
    Date.parse(publication.updatedAt) >= Date.parse(APPROVED_ARTICLE_PUBLICATION_DATE)
    ? publication.updatedAt
    : APPROVED_ARTICLE_PUBLICATION_DATE;

  return {
    ...publication,
    publishedAt: APPROVED_ARTICLE_PUBLICATION_DATE,
    updatedAt,
  };
}
