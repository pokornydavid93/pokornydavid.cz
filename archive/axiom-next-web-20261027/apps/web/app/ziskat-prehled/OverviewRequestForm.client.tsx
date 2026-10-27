"use client";

import { ArrowLeft, ArrowRight, Check, Plus } from "lucide-react";
import {
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type FormEvent,
} from "react";
import {
  overviewConversation,
  overviewFlowContent,
  overviewSituationLabels,
  overviewSituationOptions,
} from "../content/overview-flow";
import { contactOptions } from "../content/multipage";
import Button from "../ui/primitives/Button";
import Link from "../ui/primitives/Link";
import TextField from "../ui/forms/TextField";
import {
  isValidLeadEmail,
  isValidPhone,
  leadTopicLabels,
  topicIntent,
  type LeadIntent,
  type LeadSourceContext,
  type LeadTopic,
} from "../../lib/leads/lead-contract";
import type { OverviewFormState } from "../../lib/leads/overview-request";
import { trackAnalyticsEvent } from "../../lib/analytics/track.client";
import { COOKIE_CONSENT_CHANGED_EVENT } from "@/src/app/ui/privacy/cookieConsent";
import { openCookieSettings } from "@/src/app/ui/privacy/cookieSettings";
import { submitOverviewRequest } from "./actions";
import OverviewQuestion from "./OverviewQuestion.client";
import s from "./overviewFunnel.module.css";

type OverviewStep = 1 | 2;
type ClientErrors = Partial<Record<"phone" | "email", string>>;

const isValidEmail = (value: string) => isValidLeadEmail(value.trim());

// Let submit validate actions; blur errors must not move a button mid-click.
const isLeavingForAction = ({ relatedTarget }: FocusEvent<HTMLInputElement>) =>
  relatedTarget instanceof Element && relatedTarget.closest("button, a") !== null;

const statusMessages = {
  "provider-unavailable": overviewFlowContent.messages.providerUnavailable,
  "rate-limited": overviewFlowContent.messages.rateLimited,
  "duplicate-or-ambiguous": overviewFlowContent.messages.duplicateOrAmbiguous,
} as const;

const phoneContact = contactOptions.find((option) => option.label === "Telefon");

const safeHistoryState = () => {
  const current = window.history.state;
  return current && typeof current === "object"
    ? current as Record<string, unknown>
    : {};
};

function DirectContactLink() {
  if (!phoneContact) return null;

  return (
    <a
      className={s.directContactError}
      data-analytics-contact="phone"
      data-analytics-event="lead_flow_direct_contact_click"
      data-analytics-placement="error"
      href={phoneContact.href}
    >
      {phoneContact.value}
    </a>
  );
}

export default function OverviewRequestForm({
  initialState,
  initialStep,
  websiteHref,
  legalHref,
}: {
  initialState: OverviewFormState;
  initialStep: OverviewStep;
  websiteHref: string | null;
  legalHref: string | null;
}) {
  const [actionState, formAction, pending] = useActionState(
    submitOverviewRequest,
    initialState,
    "/ziskat-prehled/",
  );
  const [step, setStep] = useState<OverviewStep>(initialStep);
  const [intent, setIntent] = useState<LeadIntent | "">(
    initialState.values.intent as LeadIntent | "",
  );
  const [topic, setTopic] = useState<LeadTopic | "">(
    initialState.values.topic as LeadTopic | "",
  );
  const source = initialState.values.sourceContext as LeadSourceContext;
  const sourceCta = initialState.values.sourceCta;
  const [situationNote, setSituationNote] = useState(
    initialState.values.situationNote,
  );
  const [noteExpanded, setNoteExpanded] = useState(
    Boolean(initialState.values.situationNote),
  );
  const [phone, setPhone] = useState(initialState.values.phone);
  const [email, setEmail] = useState(initialState.values.email);
  const [firstName, setFirstName] = useState(initialState.values.firstName);
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});

  const formRef = useRef<HTMLFormElement>(null);
  const selectedIntentRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const serverErrorRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef<OverviewStep>(initialStep);
  const pushedStepRef = useRef(false);
  const submittingRef = useRef(false);
  const lastAttemptRef = useRef(actionState.attempt);
  const viewTrackedRef = useRef(false);
  const contactStepTrackedRef = useRef(false);
  const progressLabelId = useId().replaceAll(":", "");
  const stepOneDescriptionId = useId().replaceAll(":", "");
  const situationNoteHintId = useId().replaceAll(":", "");
  const situationNoteErrorId = useId().replaceAll(":", "");

  useEffect(() => {
    formRef.current?.setAttribute("data-overview-interactive", "true");
  }, []);

  useEffect(() => {
    window.history.replaceState(
      { ...safeHistoryState(), overviewStep: initialStep },
      "",
      window.location.href,
    );

    const onPopState = (event: PopStateEvent) => {
      const historyStep = event.state?.overviewStep;
      if (historyStep === 1 || historyStep === 2) {
        pushedStepRef.current = historyStep === 2;
        setStep(historyStep);
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initialStep]);

  useEffect(() => {
    if (previousStepRef.current === step) return;
    previousStepRef.current = step;
    const frame = window.requestAnimationFrame(() => {
      if (step === 1) {
        selectedIntentRef.current?.focus();
      } else {
        if (window.__lenis) window.__lenis.scrollTo(0, { immediate: true, force: true });
        else window.scrollTo({ top: 0, behavior: "instant" });
        phoneRef.current?.focus({ preventScroll: true });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    let timer: number | undefined;

    const attempt = (remaining = 20) => {
      if (viewTrackedRef.current) return;
      viewTrackedRef.current = trackAnalyticsEvent({
        name: "lead_form_view",
        source,
        ...(intent ? { intent } : {}),
        ...(topic ? { topic } : {}),
      });
      if (!viewTrackedRef.current && remaining > 0) {
        timer = window.setTimeout(() => attempt(remaining - 1), 250);
      }
    };

    const onConsentChange = () => attempt();
    attempt();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChange);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChange);
    };
  }, [intent, source, topic]);

  useEffect(() => {
    if (step !== 2 || !intent) return;
    let timer: number | undefined;

    const attempt = (remaining = 20) => {
      if (contactStepTrackedRef.current) return;
      contactStepTrackedRef.current = trackAnalyticsEvent({
        name: "lead_contact_step_view",
        source,
        intent,
        ...(topic ? { topic } : {}),
      });
      if (!contactStepTrackedRef.current && remaining > 0) {
        timer = window.setTimeout(() => attempt(remaining - 1), 250);
      }
    };

    const onConsentChange = () => attempt();
    attempt();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChange);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, onConsentChange);
    };
  }, [intent, source, step, topic]);

  useEffect(() => {
    if (actionState.attempt === lastAttemptRef.current) return;
    lastAttemptRef.current = actionState.attempt;
    submittingRef.current = false;

    if (actionState.status !== "idle") {
      trackAnalyticsEvent({
        name: "lead_submit_error",
        source,
        reason: actionState.status,
        ...(intent ? { intent } : {}),
        ...(topic ? { topic } : {}),
      });
    }

    const frame = window.requestAnimationFrame(() => {
      if (actionState.status in statusMessages) {
        serverErrorRef.current?.focus();
        return;
      }
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [actionState.attempt, actionState.status, intent, source, topic]);

  const showStepTwo = () => {
    if (!intent) return;
    trackAnalyticsEvent({
      name: "lead_step_completed",
      source,
      step: 1,
      intent,
      ...(topic ? { topic } : {}),
    });
    window.history.pushState(
      { ...safeHistoryState(), overviewStep: 2 },
      "",
      window.location.href,
    );
    pushedStepRef.current = true;
    setStep(2);
  };

  const showStepOne = () => {
    if (pushedStepRef.current) {
      window.history.back();
      return;
    }
    window.history.replaceState(
      { ...safeHistoryState(), overviewStep: 1 },
      "",
      window.location.href,
    );
    setStep(1);
  };

  const selectIntent = (value: LeadIntent) => {
    if (topic && topicIntent[topic] !== value) setTopic("");
    setIntent(value);
    trackAnalyticsEvent({
      name: "lead_intent_selected",
      source,
      intent: value,
      ...(topic && topicIntent[topic] === value ? { topic } : {}),
    });
  };

  const validatePhone = () => {
    const error = isValidPhone(phone)
      ? undefined
      : overviewFlowContent.validation.phone;
    setClientErrors((current) => ({ ...current, phone: error }));
    return error;
  };

  const validateEmail = () => {
    const error = isValidEmail(email)
      ? undefined
      : overviewFlowContent.validation.email;
    setClientErrors((current) => ({ ...current, email: error }));
    return error;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    if (pending || submittingRef.current) {
      event.preventDefault();
      return;
    }
    if (intent) {
      trackAnalyticsEvent({
        name: "lead_submit_attempt",
        source,
        intent,
        ...(topic ? { topic } : {}),
      });
    }
    const invalidFields: Array<"phone" | "email"> = [];
    if (validatePhone()) invalidFields.push("phone");
    if (validateEmail()) invalidFields.push("email");
    if (invalidFields.length === 0) {
      submittingRef.current = true;
      return;
    }
    event.preventDefault();
    if (intent) {
      trackAnalyticsEvent({
        name: "lead_validation_error",
        source,
        intent,
        fieldIds: invalidFields,
        ...(topic ? { topic } : {}),
      });
    }
    window.requestAnimationFrame(() => {
      formRef.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    });
  };

  const statusMessage = actionState.status in statusMessages
    ? statusMessages[actionState.status as keyof typeof statusMessages]
    : null;
  const phoneError = clientErrors.phone ?? (
    phone === actionState.values.phone
      ? actionState.errors.phone
      : undefined
  );
  const emailError = clientErrors.email ?? (
    email === actionState.values.email
      ? actionState.errors.email
      : undefined
  );
  const firstNameError = firstName === actionState.values.firstName
    ? actionState.errors.firstName
    : undefined;
  const situationNoteError =
    situationNote === actionState.values.situationNote
      ? actionState.errors.situationNote
      : undefined;
  const activeSummary = intent ? overviewSituationLabels[intent] : "";
  const activeTopic = topic && intent && topicIntent[topic] === intent
    ? topic
    : "";
  const canSubmit = !pending;

  return (
    <div className={s.overviewExperience} data-overview-step={step}>
      <div className={s.formColumn}>
        <form
          action={formAction}
          className={s.overviewForm}
          data-analytics-form="overview"
          data-overview-step={step}
          data-state={actionState.status}
          noValidate
          onReset={(event) => event.preventDefault()}
          onSubmit={handleSubmit}
          ref={formRef}
        >
        <input name="sourceContext" type="hidden" value={source} />
        {actionState.values.campaignHandle ? (
          <input name="campaignHandle" type="hidden" value={actionState.values.campaignHandle} />
        ) : null}
        {sourceCta ? (
          <input name="sourceCta" type="hidden" value={sourceCta} />
        ) : null}
        <input
          name="idempotencyKey"
          type="hidden"
          value={actionState.idempotencyKey}
        />
        <input
          name="privacyNoticeVersion"
          type="hidden"
          value={overviewFlowContent.collectionNotice.version}
        />
        <div aria-hidden="true" className={s.honeypot}>
          <label htmlFor="overview-website">Webová stránka</label>
          <input
            autoComplete="off"
            id="overview-website"
            name="website"
            tabIndex={-1}
            type="text"
          />
        </div>

        <header className={s.conversationHeader}>
          <div
            aria-labelledby={progressLabelId}
            aria-valuemax={2}
            aria-valuemin={1}
            aria-valuenow={step}
            aria-valuetext={step === 1 ? "Krok 1 ze 2: Vaše situace" : "Krok 2 ze 2: Kontakt"}
            className={s.progressBlock}
            data-current-step={step}
            role="progressbar"
          >
            <span className={s.visuallyHidden} id={progressLabelId}>Postup formuláře</span>
            <ol aria-hidden="true" className={s.progressSteps}>
              <li data-active={step === 1 ? "true" : undefined} data-complete={step > 1 ? "true" : undefined}>
                <span className={s.progressNumber}>{step > 1 ? <Check /> : "01"}</span>
                <span>Vaše situace</span>
              </li>
              <li data-active={step === 2 ? "true" : undefined}>
                <span className={s.progressNumber}>02</span>
                <span>Kontakt</span>
              </li>
            </ol>
          </div>
        </header>

        <p aria-live="polite" className={s.visuallyHidden}>
          Zobrazen krok {step} ze 2.
        </p>
        <p aria-live="polite" className={s.visuallyHidden}>
          {[phoneError, emailError].filter(Boolean).join(" ")}
        </p>

        {step === 1 ? (
          <section
            aria-labelledby="overview-step-one-title"
            className={s.stepPanel}
            key="step-one"
          >
            <fieldset
              aria-describedby={stepOneDescriptionId}
              className={s.situationGroup}
            >
              <legend className={s.visuallyHidden}>
                {overviewFlowContent.fields.intent.label}
              </legend>

              <header className={s.stepOneIntro}>
                <OverviewQuestion
                  {...overviewConversation.situation.question}
                  id="overview-step-one-title"
                />
                <p className={s.intro} id={stepOneDescriptionId}>
                  {overviewFlowContent.intro.lead}
                </p>
              </header>

              <div className={s.situationOptions}>
                {overviewSituationOptions.map((option) => {
                  const selected = intent === option.value;

                  return (
                    <div className={s.situationOptionCluster} key={option.value}>
                      <label
                        className={s.situationOption}
                        data-selected={selected ? "true" : undefined}
                      >
                        <input
                          aria-describedby={`overview-intent-${option.value}-description`}
                          aria-labelledby={`overview-intent-${option.value}-label`}
                          checked={selected}
                          name="intent"
                          onChange={() => selectIntent(option.value)}
                          ref={selected ? selectedIntentRef : undefined}
                          type="radio"
                          value={option.value}
                        />
                        <span aria-hidden="true" className={s.radioMark} />
                        <span className={s.situationOptionCopy}>
                          <strong id={`overview-intent-${option.value}-label`}>{option.label}</strong>
                          <span id={`overview-intent-${option.value}-description`}>{option.description}</span>
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <div
              className={s.situationNoteDisclosure}
              data-expanded={noteExpanded ? "true" : "false"}
            >
              <button
                aria-controls="overview-situation-note-panel"
                aria-expanded={noteExpanded}
                className={s.situationNoteToggle}
                onClick={() => setNoteExpanded((expanded) => !expanded)}
                type="button"
              >
                <Plus aria-hidden="true" className={s.noteToggleIcon} />
                {noteExpanded
                  ? overviewConversation.note.hideLabel
                  : situationNote.trim()
                    ? overviewConversation.note.editLabel
                    : overviewConversation.note.addLabel}
              </button>
              <div
                aria-hidden={!noteExpanded}
                className={s.situationNoteReveal}
                id="overview-situation-note-panel"
              >
                <div>
                  <div className={s.situationNotePanel}>
                    <label
                      className={s.situationNoteLabel}
                      htmlFor="overview-situation-note"
                    >
                      <span>{overviewFlowContent.fields.situationNote.label}</span>
                      <small>Volitelné</small>
                    </label>
                    <textarea
                      aria-describedby={[
                        situationNoteHintId,
                        situationNoteError ? situationNoteErrorId : undefined,
                      ].filter(Boolean).join(" ")}
                      aria-invalid={situationNoteError ? "true" : undefined}
                      autoComplete="off"
                      disabled={!noteExpanded}
                      id="overview-situation-note"
                      maxLength={500}
                      name="situationNote"
                      onChange={(event) => setSituationNote(event.target.value)}
                      placeholder={overviewConversation.note.placeholder}
                      rows={4}
                      value={situationNote}
                    />
                    <div className={s.situationNoteMeta}>
                      <span id={situationNoteHintId}>
                        {overviewFlowContent.fields.situationNote.hint}
                      </span>
                      {situationNote.length > 0 ? (
                        <span aria-label={`${situationNote.length} z 500 znaků`}>
                          {situationNote.length}/500
                        </span>
                      ) : null}
                    </div>
                    {situationNoteError ? (
                      <p className={s.fieldError} id={situationNoteErrorId} role="alert">
                        Chyba: {situationNoteError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>

            <div className={s.stepOneActions}>
              <Button
                className={s.primaryAction}
                disabled={!intent}
                endIcon={<span className={s.actionIconMotion}><ArrowRight /><ArrowRight /></span>}
                onClick={showStepTwo}
                type="button"
              >
                {overviewConversation.situation.continueLabel}
              </Button>
              <p className={s.reassurance}>
                {overviewConversation.situation.reassurance}
              </p>
            </div>
          </section>
        ) : (
          <section
            aria-labelledby="overview-step-two-title"
            className={s.stepPanel}
            key="step-two"
          >
            <input name="intent" type="hidden" value={intent} />
            {activeTopic ? (
              <input name="topic" type="hidden" value={activeTopic} />
            ) : null}
            {situationNote.trim() ? (
              <input
                name="situationNote"
                type="hidden"
                value={situationNote}
              />
            ) : null}

            <div className={s.contactIntro}>
              <div>
                <OverviewQuestion
                  {...overviewConversation.contact.question}
                  compact
                  id="overview-step-two-title"
                />
                <p className={s.intro}>
                  {overviewConversation.contact.description}
                </p>
              </div>
              <div className={s.situationSummary}>
                <div className={s.situationSummaryContext}>
                  <span>
                    <small>{overviewConversation.contact.summaryLabel}</small>
                    <strong>{activeSummary}</strong>
                  </span>
                  {activeTopic && leadTopicLabels[activeTopic] !== activeSummary ? (
                    <span>
                      <small>Konkrétně</small>
                      <strong>{leadTopicLabels[activeTopic]}</strong>
                    </span>
                  ) : null}
                </div>
                <button onClick={showStepOne} type="button">{overviewConversation.contact.changeLabel}</button>
              </div>
            </div>

            {statusMessage ? (
              <div
                aria-live="assertive"
                className={s.serverError}
                ref={serverErrorRef}
                role="alert"
                tabIndex={-1}
              >
                <strong>Odeslání se nepodařilo</strong>
                <p>{statusMessage}</p>
                <DirectContactLink />
              </div>
            ) : null}

            {actionState.status === "invalid" ? (
              <p className={s.validationMessage} role="alert">
                Zkontrolujte zvýrazněná pole.
              </p>
            ) : null}

            <div className={s.contactFields}>
              <TextField
                autoComplete="tel"
                error={phoneError}
                fieldClassName={s.contactField}
                hint={overviewFlowContent.fields.phone.hint}
                id="overview-phone"
                inputMode="tel"
                label={overviewFlowContent.fields.phone.label}
                name="phone"
                onBlur={(event) => {
                  if (!isLeavingForAction(event)) validatePhone();
                }}
                onChange={(event) => {
                  const nextPhone = event.target.value;
                  setPhone(nextPhone);
                  setClientErrors((current) => ({
                    ...current,
                    phone: isValidPhone(nextPhone)
                      ? undefined
                      : current.phone,
                  }));
                }}
                placeholder="+420 123 456 789"
                ref={phoneRef}
                required
                type="tel"
                value={phone}
              />

              <TextField
                autoComplete="email"
                error={emailError}
                fieldClassName={s.contactField}
                hint={overviewFlowContent.fields.email.hint}
                id="overview-email"
                label={overviewFlowContent.fields.email.label}
                maxLength={254}
                name="email"
                onBlur={(event) => {
                  if (!isLeavingForAction(event)) validateEmail();
                }}
                onChange={(event) => {
                  const nextEmail = event.target.value;
                  setEmail(nextEmail);
                  setClientErrors((current) => ({
                    ...current,
                    email: isValidEmail(nextEmail)
                      ? undefined
                      : current.email,
                  }));
                }}
                placeholder="vas@email.cz"
                required
                type="email"
                value={email}
              />

              <TextField
                autoComplete="given-name"
                error={firstNameError}
                fieldClassName={s.contactField}
                hint={overviewFlowContent.fields.firstName.hint}
                id="overview-first-name"
                label={overviewFlowContent.fields.firstName.label}
                maxLength={80}
                name="firstName"
                onChange={(event) => setFirstName(event.target.value)}
                optionalLabel="Volitelné"
                value={firstName}
              />
            </div>

            <div className={s.finalActionBlock}>
              <div className={s.submitActions}>
                <Button
                  aria-busy={pending || undefined}
                  className={s.primaryAction}
                  disabled={!canSubmit}
                  endIcon={pending
                    ? <span className={s.submittingIndicator} />
                    : <span className={s.actionIconMotion}><ArrowRight /><ArrowRight /></span>}
                  type="submit"
                >
                  {pending ? overviewConversation.contact.pendingLabel : overviewConversation.contact.submitLabel}
                </Button>
                <p className={s.reassurance}>
                  {overviewConversation.contact.reassurance}
                </p>
              </div>
              <div className={s.collectionNotice} data-form-privacy-notice={overviewFlowContent.collectionNotice.version}>
                <p>{overviewFlowContent.collectionNotice.shortText}</p>
                <Link
                  href={overviewFlowContent.collectionNotice.detailHref}
                  variant="text"
                >
                  Jak zpracovávám osobní údaje
                </Link>
              </div>
            </div>
          </section>
        )}
        </form>
      </div>
      <footer className={s.footer}>
        <nav aria-label="Právní informace" className={s.legalLinks}>
          <Link data-cursor-no-frame data-cursor-no-magnetic href={overviewFlowContent.collectionNotice.detailHref} variant="text">Osobní údaje</Link>
          {legalHref ? <Link data-cursor-no-frame data-cursor-no-magnetic href={legalHref} variant="text">Právní informace</Link> : null}
          <Link data-cursor-no-frame data-cursor-no-magnetic href="/cookies-a-mereni/" variant="text">Cookies</Link>
          <button data-cursor-no-frame data-cursor-no-magnetic onClick={openCookieSettings} type="button">Nastavení cookies</button>
        </nav>
        {websiteHref ? (
          <Link className={s.backToWebsite} data-cursor-no-frame data-cursor-no-magnetic href={websiteHref} variant="text">
            <ArrowLeft aria-hidden="true" /> Zpět na web
          </Link>
        ) : null}
      </footer>
    </div>
  );
}
