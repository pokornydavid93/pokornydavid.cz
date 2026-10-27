"use client";

import {
  type CSSProperties,
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { trackAnalyticsEvent } from "@/lib/analytics/track.client";
import {
  articleScreeningTopics,
  isArticleScreeningType,
  screeningContactErrors,
  screeningSubmissionIdentity,
  SCREENING_REQUEST_ID_PATTERN,
  type ArticleScreeningResult,
} from "@/lib/leads/article-screening-request";
import LegalLink from "@/app/ui/legal/LegalLink";
import { formPrivacyNotice } from "../content/form-privacy";
import type {
  ArticleScreeningConfig,
  ArticleScreeningQuestion,
} from "./articleScreeningConfigs";
import {
  getScreeningPrimaryReviewCount,
  getScreeningReviewItems,
  selectedScreeningValues,
  type ScreeningAnswers,
} from "./articleScreeningReview";
import s from "./ArticleScreeningEmbed.module.css";

type ArticleScreeningEmbedProps = {
  articleSlug: string;
  config: ArticleScreeningConfig;
  id?: string;
};

type ScreeningPhase = "intro" | "questions" | "review" | "contact";

function focusScreeningElement(element: HTMLElement | null) {
  if (!element) return;
  element.focus({ preventScroll: true });
  const bounds = element.getBoundingClientRect();
  const topMargin = Number.parseFloat(getComputedStyle(element).scrollMarginTop) || 112;
  if (bounds.top < topMargin || bounds.bottom > window.innerHeight - 24) {
    element.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  }
}

export default function ArticleScreeningEmbed({
  articleSlug,
  config,
  id,
}: ArticleScreeningEmbedProps) {
  const instanceId = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const startRef = useRef<HTMLButtonElement>(null);
  const submittingRef = useRef(false);
  const submissionIdentityRef = useRef<ReturnType<typeof screeningSubmissionIdentity> | null>(null);
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);
  const [phase, setPhase] = useState<ScreeningPhase>("intro");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [resumePhase, setResumePhase] = useState<ScreeningPhase>("questions");
  const [editingAnswer, setEditingAnswer] = useState(false);
  const [answers, setAnswers] = useState<ScreeningAnswers>({});
  const [contact, setContact] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<
    | { state: "idle" }
    | { state: "submitting" }
    | { state: "submitted"; message: string }
    | { state: "error"; message: string }
  >({ state: "idle" });

  const questions = config.steps.flatMap((step) => step.questions);
  const currentQuestion = questions[questionIndex];
  const reviewItems = getScreeningReviewItems(answers, config.review);
  const primaryReviewCount = getScreeningPrimaryReviewCount(answers, reviewItems);
  const progressStyle: CSSProperties = { transform: `scaleX(${questionIndex / questions.length})` };
  const headingId = `${config.type}-screening-title-${instanceId}`;
  const phaseHeadingId = `${headingId}-phase`;
  const submitted = status.state === "submitted";
  const analyticsTopic = isArticleScreeningType(config.type) ? articleScreeningTopics[config.type] : null;
  const fieldErrorIds = {
    email: `${headingId}-email-error`,
    name: `${headingId}-name-error`,
    phone: `${headingId}-phone-error`,
  };

  // New content is announced by focus, without moving focus during answer entry.
  useEffect(() => {
    if (phase === "intro") {
      if (hasStarted) focusScreeningElement(startRef.current);
    } else {
      focusScreeningElement(phaseHeadingRef.current);
    }
  }, [phase, questionIndex, submitted, hasStarted]);

  const start = () => {
    setPhase(hasStarted ? resumePhase : "questions");
    if (!hasStarted) {
      setHasStarted(true);
      if (analyticsTopic) trackAnalyticsEvent({ name: "lead_form_view", source: "article", ...analyticsTopic });
    }
  };

  const close = () => {
    setResumePhase(phase);
    setPhase("intro");
    setErrors({});
    setStatus({ state: "idle" });
  };

  const setAnswer = (question: ArticleScreeningQuestion, option: string) => {
    setErrors({});
    setStatus({ state: "idle" });
    setAnswers((current) => {
      if (!question.multiple) {
        return { ...current, [question.id]: option };
      }

      const selected = selectedScreeningValues(current[question.id]);
      const next = selected.includes(option)
        ? selected.filter((item) => item !== option)
        : question.exclusiveOptions?.includes(option)
          ? [option]
          : [...selected.filter((item) => !question.exclusiveOptions?.includes(item)), option];

      return { ...current, [question.id]: next };
    });
  };

  const goNext = () => {
    if (selectedScreeningValues(answers[currentQuestion.id]).length === 0) {
      setErrors({
        question: currentQuestion.multiple ? "Vyberte alespoň jednu možnost." : "Vyberte jednu možnost.",
      });
      requestAnimationFrame(() => {
        focusScreeningElement(document.getElementById(`${headingId}-${currentQuestion.id}-0`));
      });
      return;
    }

    if (editingAnswer || questionIndex === questions.length - 1) {
      setPhase("review");
      setEditingAnswer(false);
    } else {
      setQuestionIndex((current) => current + 1);
    }
    setErrors({});
  };

  const goBack = () => {
    if (phase === "contact" || editingAnswer) {
      setPhase("review");
      setEditingAnswer(false);
    } else {
      setQuestionIndex((current) => Math.max(current - 1, 0));
    }
    setErrors({});
    setStatus({ state: "idle" });
  };

  const updateContact = (
    key: keyof typeof contact,
    value: string,
  ) => {
    if (submittingRef.current) return;
    setContact((current) => ({ ...current, [key]: value }));
    setErrors({});
    setStatus({ state: "idle" });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;

    const nextErrors = screeningContactErrors(contact);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({ state: "error", message: "Zkontrolujte zvýrazněná pole." });
      requestAnimationFrame(() => {
        focusScreeningElement(formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? null);
      });
      return;
    }

    if (!isArticleScreeningType(config.type)) return;

    setErrors({});
    submittingRef.current = true;
    setStatus({ state: "submitting" });

    const input = { ...contact, articleSlug, screeningType: config.type, privacyNoticeVersion: formPrivacyNotice.version };
    const identity = screeningSubmissionIdentity(submissionIdentityRef.current, input);
    submissionIdentityRef.current = identity;
    if (analyticsTopic) trackAnalyticsEvent({ name: "lead_submit_attempt", source: "article", ...analyticsTopic });

    try {
      const response = await fetch("/api/article-screening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ ...input, requestId: identity.requestId, submittedAt: identity.submittedAt }),
        signal: AbortSignal.timeout(20_000),
      });
      const result = await response.json() as ArticleScreeningResult;
      if (response.status !== 201 || result.status !== "accepted" || !SCREENING_REQUEST_ID_PATTERN.test(result.receiptId)) {
        const reason = result.status === "error" ? result.reason : "unavailable";
        if (analyticsTopic) trackAnalyticsEvent({ name: "lead_submit_error", source: "article", ...analyticsTopic,
          reason: reason === "rate-limited" ? "rate-limited" : reason === "conflict" ? "duplicate-or-ambiguous" : reason === "invalid" ? "invalid" : "provider-unavailable" });
        setStatus({ state: "error", message: reason === "rate-limited"
          ? "Teď přišlo příliš mnoho požadavků. Zkuste to prosím za chvíli."
          : reason === "conflict"
            ? "Přijetí tohoto požadavku se nepodařilo potvrdit. Napište prosím na info@pokornydavid.cz."
            : reason === "invalid"
              ? "Údaje nebo platnost požadavku se nepodařilo ověřit. Zkontrolujte kontakt, případně napište na info@pokornydavid.cz."
            : "Odeslání se nepovedlo. Zkuste to prosím znovu, nebo napište na info@pokornydavid.cz." });
        return;
      }
      if (analyticsTopic) trackAnalyticsEvent({ name: "lead_submit_success", source: "article", ...analyticsTopic });
      setStatus({
        state: "submitted",
        message: config.successMessage,
      });
    } catch {
      if (analyticsTopic) trackAnalyticsEvent({ name: "lead_submit_error", source: "article", ...analyticsTopic, reason: "provider-unavailable" });
      setStatus({
        state: "error",
        message:
          "Odeslání se nepovedlo. Zkuste to prosím znovu, nebo napište na info@pokornydavid.cz.",
      });
    } finally {
      submittingRef.current = false;
    }
  };

  if (questions.length === 0) {
    return (
      <aside className={s.root} id={id} aria-labelledby={headingId} data-article-special-block data-suppress-sticky-cta>
        <span className={s.eyebrow}>{config.eyebrow}</span>
        <h3 id={headingId} className={s.heading}>{config.title}</h3>
        <p className={s.note}>Kontrolu se nyní nepodařilo načíst. Můžete pokračovat ve čtení článku.</p>
      </aside>
    );
  }

  if (status.state === "submitted") {
    return (
      <aside
        className={s.root}
        id={id}
        aria-labelledby={phaseHeadingId}
        data-article-special-block
        data-screening-active="true"
        data-screening-phase="submitted"
        data-suppress-sticky-cta
      >
        <span className={s.eyebrow}>{config.eyebrow}</span>
        <h3 id={phaseHeadingId} ref={phaseHeadingRef} tabIndex={-1} className={s.heading}>{config.successTitle}</h3>
        <p className={s.description}>{status.message}</p>
      </aside>
    );
  }

  const renderReviewItem = (item: (typeof reviewItems)[number], index: number) => (
    <li key={item.id} data-screening-review-item={item.id}>
      <details className={s.reviewItem}>
        <summary>
          <span className={s.itemNumber} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
          <span className={s.itemCopy}>
            <strong>{item.title}</strong>
            <span>{item.summary}</span>
          </span>
          <span className={s.disclosureIcon} aria-hidden="true" />
        </summary>
        <p>{item.text}</p>
      </details>
    </li>
  );

  return (
    <aside
      className={s.root}
      id={id}
      aria-labelledby={phase === "intro" ? headingId : phaseHeadingId}
      data-article-special-block
      data-screening-active={phase === "intro" ? "false" : "true"}
      data-screening-phase={phase}
      data-suppress-sticky-cta
    >
      <div className={s.masthead}>
        <span className={s.eyebrow}>{config.eyebrow}</span>
        {phase !== "intro" ? (
          <button
            className={s.closeButton}
            data-screening-action="close"
            type="button"
            aria-label="Zavřít kontrolu a pokračovat ve čtení"
            disabled={status.state === "submitting"}
            onClick={close}
          >
            Zavřít <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>

      {phase === "intro" ? (
        <>
          <h3 id={headingId} className={s.heading}>{config.title}</h3>
          <p className={s.description}>{config.text}</p>
          <div className={s.introFooter}>
            <span className={s.microcopy}>{config.microcopy}</span>
            <button ref={startRef} className={s.primaryButton} data-screening-action="start" type="button" onClick={start}>
              {hasStarted ? resumePhase === "review" ? "Zobrazit přehled" : resumePhase === "contact" ? "Pokračovat v domluvě" : "Pokračovat v kontrole" : config.startCtaLabel}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </>
      ) : phase === "questions" ? (
        <form noValidate onSubmit={(event) => { event.preventDefault(); goNext(); }} aria-labelledby={phaseHeadingId}>
          <div className={s.progress}>
            <span>{editingAnswer ? "Úprava odpovědi" : `Otázka ${questionIndex + 1} z ${questions.length}`}</span>
            {!editingAnswer ? (
              <div className={s.progressTrack} role="progressbar" aria-valuenow={questionIndex} aria-valuemin={0} aria-valuemax={questions.length} aria-label="Postup kontroly" aria-valuetext={`Otázka ${questionIndex + 1} z ${questions.length}`}>
                <span style={progressStyle} />
              </div>
            ) : null}
          </div>
          <h3 id={phaseHeadingId} ref={phaseHeadingRef} tabIndex={-1} className={s.heading}>{currentQuestion.title}</h3>
          <fieldset
            className={s.question}
            key={currentQuestion.id}
            aria-describedby={`${currentQuestion.hint ? `${phaseHeadingId}-context ` : ""}${phaseHeadingId}-hint${errors.question ? ` ${phaseHeadingId}-error` : ""}`}
          >
            <legend className={s.srOnly}>{currentQuestion.title}</legend>
            {currentQuestion.hint ? (
              <p id={`${phaseHeadingId}-context`} className={s.questionContext}>{currentQuestion.hint}</p>
            ) : null}
            <p id={`${phaseHeadingId}-hint`} className={s.hint}>
              {currentQuestion.multiple ? "Můžete vybrat více možností." : "Vyberte jednu možnost."}
            </p>
            <div className={s.options}>
              {currentQuestion.options.map((option, optionIndex) => {
                const selected = selectedScreeningValues(answers[currentQuestion.id]).includes(option);
                const optionId = `${headingId}-${currentQuestion.id}-${optionIndex}`;
                return (
                  <label className={s.option} data-selected={selected} htmlFor={optionId} key={option}>
                    <input
                      id={optionId}
                      name={`${headingId}-${currentQuestion.id}`}
                      type={currentQuestion.multiple ? "checkbox" : "radio"}
                      checked={selected}
                      onChange={() => setAnswer(currentQuestion, option)}
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {errors.question ? <p id={`${phaseHeadingId}-error`} className={s.error} role="alert">{errors.question}</p> : null}
          <div className={s.actions}>
            {questionIndex > 0 || editingAnswer ? (
              <button className={s.textButton} data-screening-action="back" type="button" onClick={goBack}>
                <span aria-hidden="true">←</span> {editingAnswer ? "Zpět k přehledu" : "Zpět"}
              </button>
            ) : null}
            <button className={s.primaryButton} data-screening-action="next" type="submit">
              {editingAnswer ? "Zobrazit přehled" : questionIndex === questions.length - 1 ? "Zobrazit přehled" : "Pokračovat"}
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      ) : phase === "review" ? (
        <section aria-labelledby={phaseHeadingId} data-screening-review>
          <h3 id={phaseHeadingId} ref={phaseHeadingRef} tabIndex={-1} className={s.heading}>{config.review.title}</h3>
          <p className={s.description}>{config.review.text}</p>
          <ol className={s.reviewList} data-screening-primary-review>
            {reviewItems.slice(0, primaryReviewCount).map(renderReviewItem)}
          </ol>
          {reviewItems.length > primaryReviewCount ? (
            <details className={s.extraReview} data-screening-extra-review>
              <summary>Další body ke kontrole ({reviewItems.length - primaryReviewCount})<span className={s.disclosureIcon} aria-hidden="true" /></summary>
              <ol className={s.reviewList} start={primaryReviewCount + 1}>
                {reviewItems.slice(primaryReviewCount).map((item, index) => renderReviewItem(item, index + primaryReviewCount))}
              </ol>
            </details>
          ) : null}
          <details className={s.answerReview} data-screening-answers>
            <summary>Vaše odpovědi<span className={s.disclosureIcon} aria-hidden="true" /></summary>
            <dl>
              {questions.map((question, index) => (
                <div key={question.id}>
                  <dt>{question.title}</dt>
                  <dd>
                    <span>{selectedScreeningValues(answers[question.id]).join(" · ")}</span>
                    <button
                      className={s.editButton}
                      type="button"
                      data-screening-action="edit"
                      data-screening-question={index}
                      aria-label={`Upravit odpověď: ${question.title}`}
                      onClick={() => {
                        setQuestionIndex(index);
                        setEditingAnswer(true);
                        setPhase("questions");
                      }}
                    >Upravit</button>
                  </dd>
                </div>
              ))}
            </dl>
          </details>
          <p className={s.note}>{config.review.note}</p>
          <div className={s.reviewFooter}>
            <span className={s.microcopy}>Chcete se mnou projít tyto body?</span>
            <button className={s.primaryButton} data-screening-action="contact" type="button" onClick={() => setPhase("contact")}>
              {config.review.contactCtaLabel}<span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      ) : (
        <form ref={formRef} noValidate onSubmit={handleSubmit} aria-labelledby={phaseHeadingId}>
          <h3 id={phaseHeadingId} ref={phaseHeadingRef} tabIndex={-1} className={s.heading}>{config.contactTitle}</h3>
          <p className={s.description}>{config.contactText}</p>
          <div className={s.contactFields}>
            {(["name", "email", "phone"] as const).map((field) => (
              <label className={s.field} key={field}>
                <span>{{ name: "Jméno", email: "E-mail", phone: "Telefon" }[field]}</span>
                <input
                  name={field}
                  type={field === "name" ? "text" : field === "email" ? "email" : "tel"}
                  autoComplete={field === "phone" ? "tel" : field}
                  autoCapitalize={field === "email" ? "none" : undefined}
                  spellCheck={field === "email" ? false : undefined}
                  inputMode={field === "phone" ? "tel" : undefined}
                  value={contact[field]}
                  disabled={status.state === "submitting"}
                  aria-required="true"
                  aria-invalid={Boolean(errors[field])}
                  aria-describedby={errors[field] ? fieldErrorIds[field] : undefined}
                  onChange={(event) => updateContact(field, event.target.value)}
                />
                {errors[field] ? <small id={fieldErrorIds[field]}>{errors[field]}</small> : null}
              </label>
            ))}
          </div>
          <p className={s.note} data-form-privacy-notice={formPrivacyNotice.version}>
            {formPrivacyNotice.screeningText}{" "}
            <LegalLink href={formPrivacyNotice.detailHref}>Jak zpracovávám osobní údaje</LegalLink>
          </p>
          {status.state === "error" ? <p className={s.error} role="alert">{status.message}</p> : null}
          <div className={s.actions}>
            <button className={s.textButton} data-screening-action="back" type="button" onClick={goBack} disabled={status.state === "submitting"}>
              <span aria-hidden="true">←</span> Zpět k přehledu
            </button>
            <button className={s.primaryButton} data-screening-action="submit" type="submit" disabled={status.state === "submitting"} aria-busy={status.state === "submitting"}>
              {status.state === "submitting" ? "Odesílám…" : config.submitLabel}<span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}
