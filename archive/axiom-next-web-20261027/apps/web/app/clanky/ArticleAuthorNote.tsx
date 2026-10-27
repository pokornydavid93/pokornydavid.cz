import Image from "next/image";
import type { LeadTopic } from "@/lib/api";
import type { BlogArticleNextActionBlock } from "@/lib/blog";
import ArticleLeadButton from "./ArticleLeadButton.client";
import type { ArticleLeadContext } from "./articleLeadContext";
import s from "./ArticleAuthorNote.module.css";

type ArticleAuthorNoteProps = {
  author?: string;
  finalAction?: BlogArticleNextActionBlock;
  leadTopic?: LeadTopic;
  leadContext?: ArticleLeadContext;
};

export default function ArticleAuthorNote({ author, finalAction, leadTopic, leadContext }: ArticleAuthorNoteProps) {
  const name = author ?? "David Pokorný";
  if (name !== "David Pokorný") return null;

  return (
    <section
      aria-labelledby="article-author-title"
      className={s.section}
      data-article-author
      data-suppress-sticky-cta
    >
      <div className={s.identity}>
        <div className={s.portrait}>
          <Image
            alt="Portrét Davida Pokorného"
            className={s.portraitImage}
            height={1096}
            sizes="(max-width: 620px) 150px, 170px"
            src="/david-profile-cutout.webp"
            width={700}
          />
        </div>
        <div className={s.copy}>
          <p className={s.eyebrow}>Autor článku</p>
          <h2 id="article-author-title">David Pokorný</h2>
          <p className={s.role}>Finanční poradce</p>
        </div>
      </div>
      <div className={s.invitation}>
        <div className={s.invitationCopy}>
          {finalAction ? (
            <>
              <h3>{finalAction.title}</h3>
              {finalAction.body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </>
          ) : (
            <p>Na úvodním hovoru spolu projdeme vaši situaci a ujasníme si další krok.</p>
          )}
        </div>
        <ArticleLeadButton
          className={s.action}
          cta="article-final"
          conversionId={finalAction?.conversionId}
          docked
          fallbackTopic={leadTopic}
          inheritedContext={leadContext}
          label={finalAction?.buttonLabel ?? "Domluvit úvodní hovor"}
          topic={finalAction?.leadTopic !== leadTopic ? finalAction?.leadTopic : undefined}
        />
      </div>
    </section>
  );
}
