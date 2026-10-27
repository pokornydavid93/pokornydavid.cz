import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  CircleDot,
  Clock3,
  FileText,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import Container from "@/app/ui/container/Container";
import s from "./articlesPreview.module.css";

type ArticleCheck = {
  category: string;
  cta: string;
  description: string;
  href: string;
  icon: LucideIcon;
  image?: {
    alt: string;
    src: string;
  };
  key: string;
  readingTime: string;
  title: [string, string];
  value: string;
};

const articleChecks: ArticleCheck[] = [
  {
    category: "Hypotéka",
    cta: "Projít kontrolu",
    description:
      "Před novou sazbou se vyplatí zkontrolovat splátku, rezervu a dopad na domácí rozpočet.",
    href: "/clanky/konec-fixace-hypoteky/",
    icon: FileText,
    image: {
      alt: "Kontrola hypotečních dokumentů před podpisem",
      src: "/articles/fixace-hypoteky-editorial.webp",
    },
    key: "fixace",
    readingTime: "5 min čtení",
    title: ["Končí vám fixace?", "Neberte první nabídku automaticky."],
    value: "sazbu, splátku a rezervu na další roky.",
  },
  {
    category: "Pojištění",
    cta: "Číst článek",
    description: "Navýšené pojistné nemusí znamenat, že musíte platit víc.",
    href: "/clanky/zdrazilo-vam-pojisteni/",
    icon: ShieldCheck,
    key: "pojisteni",
    readingTime: "6 min čtení",
    title: ["Zdražilo vám pojištění?", "Neplaťte automaticky víc."],
    value: "jestli platíte za krytí, nebo setrvačnost.",
  },
  {
    category: "Příjem",
    cta: "Číst článek",
    description:
      "Nestačí mít nějakou pojistku. Důležité je, jestli skutečně kryje výpadek příjmu.",
    href: "/clanky/mate-pojisteni-prijmu-nebo-jen-pocit/",
    icon: CircleDot,
    key: "prijem",
    readingTime: "6 min čtení",
    title: ["Máte ochranu příjmu,", "nebo jen pocit?"],
    value: "jestli pojistka kryje skutečný výpadek příjmu.",
  },
];

function ArticleCard({
  article,
  featured = false,
}: {
  article: ArticleCheck;
  featured?: boolean;
}) {
  const Icon = article.icon;

  return (
    <Link
      className={`${s.card} ${featured ? s.featuredCard : s.smallCard}`}
      data-cursor="article"
      data-cursor-icon="external"
      data-cursor-label="OTEVŘÍT ČLÁNEK • ČÍST DÁL •"
      data-cursor-magnetic="true"
      href={article.href}
    >
      {featured && article.image ? (
        <div className={s.featuredImage} data-cursor-media>
          <Image
            alt={article.image.alt}
            fill
            sizes="(max-width: 1050px) 100vw, 48vw"
            src={article.image.src}
          />
          <div className={`${s.cardTop} ${s.imageMeta}`}>
            <div className={s.meta}>
              <span>{article.category}</span>
              <small>
                <Clock3 aria-hidden="true" size={14} strokeWidth={2.15} />
                {article.readingTime}
              </small>
            </div>
            <span className={s.iconShell} aria-hidden="true">
              <Icon size={25} strokeWidth={1.9} />
            </span>
          </div>
        </div>
      ) : (
        <div className={s.cardTop}>
          <div className={s.meta}>
            <span>{article.category}</span>
            <small>
              <Clock3 aria-hidden="true" size={14} strokeWidth={2.15} />
              {article.readingTime}
            </small>
          </div>
          <span className={s.iconShell} aria-hidden="true">
            <Icon size={21} strokeWidth={1.9} />
          </span>
        </div>
      )}

      <div className={s.cardBody}>
        <h3>
          {article.title[0]}
          <br />
          {article.title[1]}
        </h3>
        <p>{article.description}</p>
      </div>

      <p className={s.valueLine}>
        <strong>Co si ověříte:</strong> {article.value}
      </p>

      <span className={s.cardAction} data-cursor-direction>
        {article.cta}
        <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.25} />
      </span>
    </Link>
  );
}

export default function ArticlesPreview() {
  const [featuredArticle, ...supportingArticles] = articleChecks;

  return (
    <section
      className={s.section}
      data-cursor-surface="dark"
      data-surface-tone="dark"
      aria-labelledby="articles-preview-title"
    >
      <div className={s.ambient} aria-hidden="true" />
      <Container>
        <div className={s.header}>
          <p className={s.eyebrow}>ČLÁNKY A PŘEHLEDY</p>
          <h2 id="articles-preview-title">
            <span className={s.titleAccent}>Nejdřív ověřit.</span>
            <span>Potom podepsat.</span>
          </h2>
          <p>
            Krátké praktické kontroly k hypotékám, pojištění, investicím a
            ochraně příjmu — psané tak, abyste věděli, co zkontrolovat a proč.
          </p>
        </div>

        <div className={s.articleShell}>
          <div className={s.layout}>
            <ArticleCard article={featuredArticle} featured />
            <div className={s.sideList}>
              {supportingArticles.map((article) => (
                <ArticleCard article={article} key={article.key} />
              ))}
            </div>
          </div>

          <div className={s.ctaRow}>
            <p>
              Na stránce článků najdete další kontroly k hypotékám, pojištění,
              investicím a ochraně příjmu.
            </p>
            <Link className={s.ctaButton} href="/clanky/">
              Zobrazit všechny praktické články
              <ArrowUpRight aria-hidden="true" size={16} strokeWidth={2.25} />
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
