import ArticleLeadButton from "./ArticleLeadButton.client";
import {
  getArticleConversionBlock,
  type ArticleConversionId,
} from "./articleConversionBlocks";
import s from "./articles.module.css";

function ArticleCTA({ id }: { id?: ArticleConversionId }) {
  const block = getArticleConversionBlock(id);

  return (
    <aside className={s.inlineCta}>
      <span className={s.inlineCtaLabel}>První krok</span>
      <h3>{block.inlineCta.title}</h3>
      {block.inlineCta.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ArticleLeadButton
        className={s.articleCtaButton}
        conversionId={id}
        label={block.inlineCta.buttonLabel}
        topic={block.leadTopic}
      />
    </aside>
  );
}

function ArticleScreening({ id }: { id?: ArticleConversionId }) {
  const block = getArticleConversionBlock(id);
  const screening = block.screening;
  const headingId = `article-screening-${id ?? "default"}`;

  return (
    <aside className={s.screeningModule} aria-labelledby={headingId}>
      <div className={s.screeningHeader}>
        <span className={s.inlineCtaLabel}>Orientační screening</span>
        <h3 id={headingId}>{screening.title}</h3>
        <p>{screening.text}</p>
      </div>

      <div className={s.screeningSteps}>
        {screening.steps.map((step) => (
          <section className={s.screeningStep} key={step.label}>
            <span className={s.screeningStepLabel}>{step.label}</span>
            <h4>{step.title}</h4>
            <div className={s.screeningQuestions}>
              {step.questions.map((question) => (
                <div className={s.screeningQuestion} key={question.question}>
                  <p>{question.question}</p>
                  <ul>
                    {question.options.map((option) => (
                      <li key={option}>{option}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className={s.screeningContact}>
        <span className={s.screeningStepLabel}>
          Krok 4: Kontakt / výzva ke konzultaci
        </span>
        <h4>{screening.title}</h4>
        <p>{screening.text}</p>
        <div className={s.screeningFields}>
          <span>Pole</span>
          <ul>
            {screening.fields.map((field) => (
              <li key={field}>{field}</li>
            ))}
          </ul>
        </div>
      </section>

      <div className={s.screeningResult}>
        <span>{screening.resultLabel}</span>
        <p>{screening.resultPromise}</p>
      </div>

      <div className={s.screeningFollowUp}>
        <span>{screening.followUpLabel}</span>
        <p>{screening.followUp}</p>
      </div>

      <ArticleLeadButton
        cta="article-screening"
        conversionId={id}
        className={s.articleCtaButton}
        label={screening.buttonLabel}
        topic={block.leadTopic}
      />
    </aside>
  );
}

function ArticleFinalCTA({ id }: { id?: ArticleConversionId }) {
  const block = getArticleConversionBlock(id);

  return (
    <aside className={s.finalArticleCta} data-surface-tone="action">
      <span className={s.inlineCtaLabel}>Další krok</span>
      <h3>{block.finalCta.title}</h3>
      {block.finalCta.body.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
      <ArticleLeadButton
        cta="article-final"
        conversionId={id}
        className={s.articleCtaButton}
        label={block.finalCta.buttonLabel}
        topic={block.leadTopic}
      />
    </aside>
  );
}

export function createArticleMdxComponents() {
  return {
    ArticleCTA,
    ArticleFinalCTA,
    ArticleScreening,
  };
}
