export type ArticleVisual = {
  src: string;
  alt?: string;
};

export const articleVisuals: Record<string, ArticleVisual> = {
  "mate-financni-produkty-ale-mate-skutecne-financni-plan": {
    src: "/articles/financni-plan-editorial.webp",
  },
  "v-jakem-poradi-resit-osobni-finance": {
    src: "/articles/poradi-osobnich-financi-editorial.webp",
  },
  "kolik-ma-mit-domacnost-v-rezerve": {
    src: "/articles/rezerva-domacnosti-editorial.webp",
  },
  "banka-vam-pujci-vic-nez-si-muzete-dovolit": {
    src: "/articles/bezpecne-bydleni-editorial.webp",
  },
  "urokova-sazba-neni-cena-hypoteky": {
    src: "/articles/cena-hypoteky-editorial.webp",
  },
  "penize-na-rezervu-bydleni-a-duchod-nemaji-byt-v-jednom-baliku": {
    src: "/articles/rezerva-bydleni-duchod-editorial.webp",
  },
  "cestovko-zdarma-od-karty-vas-nemusi-zachranit": {
    src: "/articles/cestovni-pojisteni-editorial.webp",
    alt: "Cestující s kufrem drží kartu cestovního pojištění.",
  },
  "planujete-jednou-deti-pojistit-se-na-to-da-jen-dokud-je-to-jednou": {
    src: "/articles/planovani-rodiny-editorial.webp",
  },
  "konec-fixace-hypoteky": {
    src: "/articles/fixace-hypoteky-editorial.webp",
  },
  "zdrazilo-vam-pojisteni": {
    src: "/articles/zdrazene-pojisteni-editorial.webp",
  },
  "mate-pojisteni-prijmu-nebo-jen-pocit": {
    src: "/articles/ochrana-prijmu-editorial.webp",
  },
  "chcete-investovat-zacnete-planem": {
    src: "/articles/investicni-plan-editorial.webp",
  },
};

export function getArticleVisual(slug: string) {
  return articleVisuals[slug];
}
