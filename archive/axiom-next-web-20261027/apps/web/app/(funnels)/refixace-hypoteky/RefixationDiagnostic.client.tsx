"use client";

import Image from "next/image";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CalendarPlus,
  CheckCircle2,
  ExternalLink,
  PhoneCall,
  Send,
  Star,
} from "lucide-react";
import { cnbRegistryUrl } from "@/app/content/multipage";
import { testimonialGoogleProfile } from "@/app/content/testimonials";
import ReactBitsSilk from "@/app/_components/effects/ReactBitsSilk.client";
import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import Button from "@/app/ui/primitives/Button";
import Link from "@/app/ui/primitives/Link";
import Surface from "@/app/ui/primitives/Surface";
import ErrorSummary, { type FieldError } from "@/app/ui/forms/ErrorSummary";
import RadioGroup from "@/app/ui/forms/RadioGroup";
import SelectField from "@/app/ui/forms/SelectField";
import TextField from "@/app/ui/forms/TextField";
import {
  ATTRIBUTION_FIELDS,
  type RefixationAttribution,
  type RefixationFormState,
} from "@/lib/leads/refixation-request";
import {
  formatCzechMonthCount,
  formatCzechMonthYear,
  fixationBucketLabels,
  fixationBucketTexts,
  getRecommendedReviewDate,
  resolveFixationBucket,
  type FixationBucketResult,
  type RefixationPath,
} from "@/lib/leads/refixation-bucket";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import { mainSiteHref } from "@/lib/site-mode-routes";
import { submitRefixationLead } from "./actions";
import {
  callbackWindowLabels,
  callbackWindowOptions,
  checklist,
  monthOptions,
  priorityOptions,
  refixationPrivacyNoticeVersion,
  remainingBalanceOptions,
  threePaths,
} from "./content";
import s from "./refixationFunnel.module.css";

type DiagnosticStep = 0 | 1 | 2 | 3;

type DiagnosticState = {
  step: DiagnosticStep;
  fixationDateKnown: "known" | "unknown";
  fixationMonth: string;
  fixationYear: string;
  remainingBalanceBand: string;
  priority: string;
  refixationPath: RefixationPath | null;
  errors: Partial<Record<"fixationDate" | "remainingBalanceBand" | "priority", string>>;
  attribution: RefixationAttribution;
};

type DiagnosticAction =
  | { type: "set-fixation-known"; value: "known" | "unknown" }
  | { type: "set-fixation-month"; value: string }
  | { type: "set-fixation-year"; value: string }
  | { type: "set-balance"; value: string }
  | { type: "set-priority"; value: string }
  | { type: "set-refixation-path"; value: RefixationPath | null }
  | { type: "set-attribution"; value: RefixationAttribution }
  | { type: "go"; step: DiagnosticStep }
  | { type: "next" };

const buildYearOptions = (baseYear: number) =>
  Array.from({ length: 9 }, (_, index) => String(baseYear - 1 + index));

const initialDiagnosticState: DiagnosticState = {
  step: 0,
  fixationDateKnown: "known",
  fixationMonth: "",
  fixationYear: "",
  remainingBalanceBand: "",
  priority: "",
  refixationPath: null,
  errors: {},
  attribution: {},
};

const TRUST_STARS = [0, 1, 2, 3, 4] as const;

const validateStep = (state: DiagnosticState) => {
  const errors: DiagnosticState["errors"] = {};
  if (
    state.step === 0 &&
    state.fixationDateKnown === "known" &&
    (!state.fixationMonth || !state.fixationYear)
  ) {
    errors.fixationDate = "Vyberte měsíc a rok, nebo označte, že termín neznáte.";
  }
  if (state.step === 1 && !state.remainingBalanceBand) {
    errors.remainingBalanceBand = "Vyberte jedno pásmo zůstatku.";
  }
  if (state.step === 2 && !state.priority) {
    errors.priority = "Vyberte, co je pro vás nejdůležitější.";
  }
  return errors;
};

const reducer = (
  state: DiagnosticState,
  action: DiagnosticAction,
): DiagnosticState => {
  switch (action.type) {
    case "set-fixation-known":
      return {
        ...state,
        fixationDateKnown: action.value,
        refixationPath: null,
        errors: { ...state.errors, fixationDate: undefined },
      };
    case "set-fixation-month":
      return {
        ...state,
        fixationMonth: action.value,
        refixationPath: null,
        errors: { ...state.errors, fixationDate: undefined },
      };
    case "set-fixation-year":
      return {
        ...state,
        fixationYear: action.value,
        refixationPath: null,
        errors: { ...state.errors, fixationDate: undefined },
      };
    case "set-balance":
      return {
        ...state,
        remainingBalanceBand: action.value,
        errors: { ...state.errors, remainingBalanceBand: undefined },
      };
    case "set-priority":
      return {
        ...state,
        priority: action.value,
        errors: { ...state.errors, priority: undefined },
      };
    case "set-refixation-path":
      return { ...state, refixationPath: action.value };
    case "set-attribution":
      return { ...state, attribution: action.value };
    case "go":
      return { ...state, step: action.step, errors: {} };
    case "next": {
      const errors = validateStep(state);
      if (Object.keys(errors).length > 0) return { ...state, errors };
      const nextStep = Math.min(state.step + 1, 3) as DiagnosticStep;
      gaEvent("diagnostic_step_complete", {
        funnel_id: "mortgage-refixation",
        page_path: "/refixace-hypoteky/",
        step_index: state.step + 1,
      });
      return { ...state, step: nextStep, errors: {} };
    }
    default:
      return state;
  }
};

const statusMessages: Partial<Record<RefixationFormState["status"], string>> = {
  "provider-unavailable":
    "Formulář teď nelze bezpečně doručit. Údaje nebyly označeny jako přijaté; použijte prosím přímý kontakt.",
  "rate-limited":
    "Z tohoto připojení proběhlo více pokusů. Počkejte prosím chvíli nebo použijte přímý kontakt.",
  "duplicate-or-ambiguous":
    "Stav odeslání nelze bezpečně potvrdit. Neodesílejte stejné údaje opakovaně a použijte přímý kontakt.",
};

const fieldIdForError = (field: string) => {
  const map: Record<string, string> = {
    fixationDate: "hero-refixation-month",
    remainingBalanceBand: "refixation-balance",
    priority: "refixation-priority",
    name: "refixation-name",
    phone: "refixation-phone",
    email: "refixation-email",
    callbackWindow: "refixation-callbackWindow",
  };
  return map[field] ?? "refixation-diagnostic";
};

const parseIntegerOption = (value: string) => {
  if (!/^\d+$/u.test(value)) return null;
  return Number.parseInt(value, 10);
};

type HeroResultContent = {
  horizon: string;
  headline: string;
  text: string;
  primaryLabel: string;
  primaryAction: "audit" | "reminder";
  secondaryLabel?: string;
  secondaryAction?: "audit" | "edit" | "help";
  reviewLabel?: string;
  reviewDate?: Date;
};

const getHeroResultContent = (
  result: FixationBucketResult,
  fixationDate: Date | null,
  baseDate: Date,
): HeroResultContent => {
  const monthCount =
    result.monthsUntil === null ? null : formatCzechMonthCount(result.monthsUntil);
  const remainingHorizon = monthCount
    ? `Do konce fixace zbývá přibližně ${monthCount}`
    : "Termín zatím neznáme";
  const recommendedReviewDate = fixationDate
    ? getRecommendedReviewDate(fixationDate)
    : undefined;
  const currentMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const activeReviewDate = recommendedReviewDate && recommendedReviewDate < currentMonth
    ? currentMonth
    : recommendedReviewDate;

  switch (result.bucket) {
    case "expired":
      return {
        horizon: "Vybraný termín už uplynul",
        headline: "Fixace už pravděpodobně skončila",
        text: "Pokud fixace skutečně skončila, můžeme místo její přípravy prověřit současné nastavení hypotéky. Pokud jde o překlep, datum jednoduše upravte.",
        primaryLabel: "Prověřit současné nastavení",
        primaryAction: "audit",
        secondaryLabel: "Upravit datum",
        secondaryAction: "edit",
      };
    case "active":
      return {
        horizon: remainingHorizon,
        headline: "Jste v rozhodovacím okně",
        text: "Teď má smysl prověřit nabídku současné banky a připravit srovnatelnou alternativu. Máte ještě prostor rozhodnout se bez zbytečného spěchu.",
        primaryLabel: "Pokračovat v auditu",
        primaryAction: "audit",
      };
    case "prepare":
      return {
        horizon: remainingHorizon,
        headline: "Teď je čas připravit si možnosti",
        text: "Finální nabídky se mohou ještě změnit. Už teď ale můžete zkontrolovat podklady a určit, kdy začít aktivně porovnávat.",
        primaryLabel: "Pokračovat v auditu",
        primaryAction: "audit",
        reviewLabel: "Aktivní kontrola",
        reviewDate: activeReviewDate,
      };
    case "nurture":
      return {
        horizon: remainingHorizon,
        headline: "Nejdůležitější je správný kontrolní termín",
        text: "Na konkrétní nabídky je ještě brzy. K aktivnímu srovnání se vraťte ve chvíli, kdy bude do konce fixace zbývat přibližně 6 až 12 měsíců.",
        primaryLabel: "Nastavit připomenutí",
        primaryAction: "reminder",
        secondaryLabel: "Přesto pokračovat v auditu",
        secondaryAction: "audit",
        reviewLabel: "Doporučená kontrola",
        reviewDate: recommendedReviewDate,
      };
    case "early":
      return {
        horizon: remainingHorizon,
        headline: "Aktivní řešení může zatím počkat",
        text: "Dnešní nabídky by do konce fixace zastaraly. Smysl má pohlídat správný okamžik, kdy se k tématu vrátit.",
        primaryLabel: "Připomenout správný čas",
        primaryAction: "reminder",
        secondaryLabel: "Pokračovat bez připomenutí",
        secondaryAction: "audit",
        reviewLabel: "Doporučená kontrola",
        reviewDate: recommendedReviewDate,
      };
    case "unknown":
      return {
        horizon: "Termín zatím neznáme",
        headline: "Přesné datum není překážka",
        text: "Konec fixace najdete ve smlouvě nebo internetovém bankovnictví. V auditu můžete pokračovat a termín doplnit později.",
        primaryLabel: "Pokračovat bez přesného data",
        primaryAction: "audit",
        secondaryLabel: "Kde datum najdu?",
        secondaryAction: "help",
      };
  }
};

const toCalendarDate = (date: Date) =>
  `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

const downloadReviewReminder = (date: Date) => {
  const calendarDate = toCalendarDate(date);
  const nextDay = new Date(date.getFullYear(), date.getMonth(), 2);
  const calendarEndDate = toCalendarDate(nextDay);
  const contents = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PokornyDavid.cz//Refixacni audit//CS",
    "BEGIN:VEVENT",
    `DTSTART;VALUE=DATE:${calendarDate}`,
    `DTEND;VALUE=DATE:${calendarEndDate}`,
    "SUMMARY:Kontrola terminu refixace hypoteky",
    "DESCRIPTION:Zkontrolujte konec fixace a rozhodnete se, zda je cas porovnat dostupne moznosti.",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([contents], { type: "text/calendar" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "kontrola-refixace.ics";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

function HeroTrustRail() {
  return (
    <section className={s.trustStrip} aria-label="Ověřitelné důvody důvěry">
      <div className={s.trustMetric}>
        <span className={s.trustLabel}>Klientská zkušenost</span>
        <strong>200+ klientů</strong>
        <span className={s.trustDetail}>Dlouhodobá spolupráce</span>
      </div>
      <Link className={`${s.trustMetric} ${s.trustLink}`} href={mainSiteHref("/reference/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN)}>
        <span className={s.trustLabel}>Veřejné hodnocení</span>
        <span className={s.trustRating}>
          <strong>5,0</strong>
          <span className={s.trustStars} aria-label="5 z 5 hvězdiček">
            {TRUST_STARS.map((star) => (
              <Star key={star} aria-hidden="true" />
            ))}
          </span>
        </span>
        <span className={s.trustDetail}>
          {testimonialGoogleProfile.reviewCount} ověřených Google recenzí
          <ExternalLink aria-hidden="true" />
        </span>
      </Link>
      <a
        className={`${s.trustMetric} ${s.trustLink}`}
        href={cnbRegistryUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={s.trustLabel}>Odborné oprávnění</span>
        <strong>Registr ČNB</strong>
        <span className={s.trustDetail}>
          Ověřit veřejný záznam
          <ExternalLink aria-hidden="true" />
        </span>
      </a>
    </section>
  );
}

function HeroDecisionInstrument({
  baseMonth,
  baseYear,
  diagnosticState,
  dateHelpVisible,
  dispatch,
  fixationDateError,
  heroResultVisible,
  highlighted,
  onContinueToAudit,
  onEditDate,
  onFieldChange,
  onReminder,
  onUnknownDate,
  onShowWindow,
  onToggleDateHelp,
  reminderPrepared,
  yearOptions,
}: {
  baseMonth: number;
  baseYear: number;
  diagnosticState: DiagnosticState;
  dateHelpVisible: boolean;
  dispatch: (action: DiagnosticAction) => void;
  fixationDateError?: string;
  heroResultVisible: boolean;
  highlighted: boolean;
  onContinueToAudit: (path: RefixationPath) => void;
  onEditDate: () => void;
  onFieldChange: () => void;
  onReminder: (path: RefixationPath, reviewDate: Date) => void;
  onUnknownDate: () => void;
  onShowWindow: () => void;
  onToggleDateHelp: () => void;
  reminderPrepared: boolean;
  yearOptions: string[];
}) {
  const selectedMonth = parseIntegerOption(diagnosticState.fixationMonth);
  const selectedYear = parseIntegerOption(diagnosticState.fixationYear);
  const baseDate = new Date(baseYear, baseMonth - 1, 1);
  const fixationDate = selectedMonth !== null && selectedYear !== null
    ? new Date(selectedYear, selectedMonth - 1, 1)
    : null;
  const hasCompleteInput =
    diagnosticState.fixationDateKnown === "unknown" ||
    (selectedMonth !== null && selectedYear !== null);
  const bucketResult = resolveFixationBucket(
    {
      month: selectedMonth,
      year: selectedYear,
      unknown: diagnosticState.fixationDateKnown === "unknown",
    },
    baseDate,
  );
  const showResult = heroResultVisible && hasCompleteInput;
  const resultContent = getHeroResultContent(bucketResult, fixationDate, baseDate);

  const handlePrimaryResultAction = () => {
    if (
      resultContent.primaryAction === "reminder" &&
      resultContent.reviewDate
    ) {
      onReminder(bucketResult.path, resultContent.reviewDate);
      return;
    }
    onContinueToAudit(bucketResult.path);
  };

  const handleSecondaryResultAction = () => {
    switch (resultContent.secondaryAction) {
      case "audit":
        onContinueToAudit(bucketResult.path);
        break;
      case "edit":
        onEditDate();
        break;
      case "help":
        onToggleDateHelp();
        break;
    }
  };

  return (
    <Surface
      as="section"
      aria-labelledby="hero-instrument-title"
      className={s.decisionInstrument}
      data-highlight={highlighted ? "true" : undefined}
      data-state={showResult ? "result" : hasCompleteInput ? "preview" : "neutral"}
      id="refixation-hero-instrument"
      surface="action"
      tone="action"
    >
      <div className={s.instrumentSignature} aria-hidden="true">
        <span>01</span>
        <span>Termín fixace</span>
      </div>

      <div className={s.instrumentQuestion}>
        <h2 id="hero-instrument-title">Kdy vám končí fixace?</h2>
        <p>Stačí měsíc a rok.</p>
      </div>

      <div className={s.instrumentDateGrid}>
        <SelectField
          autoComplete="off"
          error={fixationDateError}
          id="hero-refixation-month"
          label="Měsíc"
          name="heroFixationMonthUi"
          required={diagnosticState.fixationDateKnown === "known"}
          value={diagnosticState.fixationMonth}
          onChange={(event) => {
            onFieldChange();
            dispatch({ type: "set-fixation-known", value: "known" });
            dispatch({ type: "set-fixation-month", value: event.currentTarget.value });
          }}
        >
          <option value="">Vyberte měsíc</option>
          {monthOptions.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </SelectField>
        <SelectField
          autoComplete="off"
          id="hero-refixation-year"
          label="Rok"
          name="heroFixationYearUi"
          required={diagnosticState.fixationDateKnown === "known"}
          value={diagnosticState.fixationYear}
          onChange={(event) => {
            onFieldChange();
            dispatch({ type: "set-fixation-known", value: "known" });
            dispatch({ type: "set-fixation-year", value: event.currentTarget.value });
          }}
        >
          <option value="">Vyberte rok</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectField>
      </div>

      <button
        className={s.unknownDateButton}
        aria-pressed={diagnosticState.fixationDateKnown === "unknown"}
        data-active={diagnosticState.fixationDateKnown === "unknown" ? "true" : undefined}
        type="button"
        onClick={onUnknownDate}
      >
        Termín neznám
      </button>

      <div
        className={s.instrumentResult}
        aria-live="polite"
        data-bucket={showResult ? bucketResult.bucket : undefined}
        data-testid="hero-refixation-result"
        data-visible={showResult ? "true" : "false"}
      >
        {showResult ? (
          <div className={s.instrumentResultContent}>
            <p className={s.resultHorizon}>{resultContent.horizon}</p>
            <h3>{resultContent.headline}</h3>
            <p className={s.resultExplanation}>{resultContent.text}</p>
            {resultContent.reviewLabel && resultContent.reviewDate ? (
              <div className={s.reviewDate}>
                <span>{resultContent.reviewLabel}</span>
                <strong>{formatCzechMonthYear(resultContent.reviewDate)}</strong>
              </div>
            ) : null}
            {dateHelpVisible && bucketResult.bucket === "unknown" ? (
              <p className={s.dateHelp}>
                Datum bývá v oznámení banky, úvěrové smlouvě nebo detailu hypotéky
                v internetovém bankovnictví. Hledejte údaj „konec fixace“ nebo
                „platnost úrokové sazby“.
              </p>
            ) : null}
            {reminderPrepared && bucketResult.path === "reminder" ? (
              <p className={s.reminderConfirmation} role="status">
                Kontrolní termín je připravený jako událost pro váš kalendář.
                Žádné kontaktní údaje nebyly odeslány.
              </p>
            ) : null}
            <div className={s.instrumentResultActions}>
              <button
                className={s.primaryButton}
                type="button"
                onClick={handlePrimaryResultAction}
              >
                <span>{resultContent.primaryLabel}</span>
                {resultContent.primaryAction === "reminder" ? (
                  <CalendarPlus aria-hidden="true" />
                ) : (
                  <ArrowRight aria-hidden="true" />
                )}
              </button>
              {resultContent.secondaryLabel ? (
                <button
                  className={s.instrumentSecondaryButton}
                  type="button"
                  onClick={handleSecondaryResultAction}
                >
                  {resultContent.secondaryLabel}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {!showResult ? (
        <button
          className={s.primaryButton}
          disabled={!hasCompleteInput}
          type="button"
          onClick={onShowWindow}
        >
          <span>Ukázat, kdy začít</span>
          <ArrowRight aria-hidden="true" />
        </button>
      ) : null}
    </Surface>
  );
}

const readAttributionFromUrl = (): RefixationAttribution => {
  const params = new URLSearchParams(window.location.search);
  const attribution: RefixationAttribution = {};
  for (const field of ATTRIBUTION_FIELDS) {
    const value = params.get(field);
    if (value) attribution[field] = value.slice(0, 160);
  }
  return attribution;
};

function RefixationResult({
  callbackWindow,
  fixationBucket,
}: NonNullable<RefixationFormState["result"]>) {
  const label = fixationBucketLabels[fixationBucket];
  const text = fixationBucketTexts[fixationBucket];

  return (
    <section
      aria-labelledby="refixation-result-title"
      className={s.resultPanel}
      data-testid="refixation-result"
      tabIndex={-1}
    >
      <div className={s.resultHeader}>
        <span className={s.resultIcon} aria-hidden="true">
          <CheckCircle2 />
        </span>
        <div>
          <p className={s.kicker}>Server přijal žádost</p>
          <h3 id="refixation-result-title">{label}</h3>
          <p>{text}</p>
        </div>
      </div>

      <div className={s.resultMatrix}>
        <div>
          <h4>Tři cesty zůstávají otevřené</h4>
          <ul>
            {threePaths.map((path) => (
              <li key={path.title}>{path.title}</li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Co si připravit pro ověření</h4>
          <ul>
            {checklist.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className={s.callbackConfirmation}>
        <p>
          Preferovaný callback: <strong>{callbackWindowLabels[callbackWindow]}</strong>.
          Konkrétní termín zatím není rezervovaný.
        </p>
        <div className={s.resultActions}>
          <a href="tel:+420731830897">
            <PhoneCall aria-hidden="true" />
            <span>Zavolat mi</span>
          </a>
          <a href="mailto:info@pokornydavid.cz?subject=Změna preferovaného času callbacku">
            Změnit preferovaný čas e-mailem
          </a>
        </div>
      </div>
    </section>
  );
}

export default function RefixationDiagnostic({
  baseMonth,
  baseYear,
  initialState,
}: {
  baseMonth: number;
  baseYear: number;
  initialState: RefixationFormState;
}) {
  const [diagnosticState, dispatch] = useReducer(reducer, initialDiagnosticState);
  const [formState, formAction, pending] = useActionState(
    submitRefixationLead,
    initialState,
    "/refixace-hypoteky/",
  );
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const diagnosticSectionRef = useRef<HTMLElement | null>(null);
  const didMountRef = useRef(false);
  const diagnosticStartedRef = useRef(false);
  const highlightTimerRef = useRef<number | null>(null);
  const resultAnnouncedRef = useRef(false);
  const [heroResultVisible, setHeroResultVisible] = useState(false);
  const [heroHighlighted, setHeroHighlighted] = useState(false);
  const [dateHelpVisible, setDateHelpVisible] = useState(false);
  const [reminderPrepared, setReminderPrepared] = useState(false);
  const yearOptions = useMemo(() => buildYearOptions(baseYear), [baseYear]);

  const triggerHeroHighlight = useCallback(() => {
    setHeroHighlighted(true);
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHeroHighlighted(false);
      highlightTimerRef.current = null;
    }, 1400);
  }, []);

  const markDiagnosticStarted = useCallback(() => {
    if (diagnosticStartedRef.current) return;
    diagnosticStartedRef.current = true;
    gaEvent("diagnostic_start", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
  }, []);

  const focusHeroInstrument = useCallback(() => {
    triggerHeroHighlight();
    const target = document.getElementById("refixation-hero-instrument");
    const firstControl = document.getElementById("hero-refixation-month");
    const reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    ).matches;

    target?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "center",
    });

    window.setTimeout(
      () => firstControl?.focus({ preventScroll: true }),
      reducedMotion ? 0 : 260,
    );
  }, [triggerHeroHighlight]);

  const scrollToDiagnostic = useCallback(() => {
    const reducedMotion = window.matchMedia(
      DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion,
    ).matches;
    diagnosticSectionRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, []);

  const handleHeroFieldChange = useCallback(() => {
    markDiagnosticStarted();
    setHeroResultVisible(false);
    setDateHelpVisible(false);
    setReminderPrepared(false);
    dispatch({ type: "set-refixation-path", value: null });
  }, [markDiagnosticStarted]);

  const handleUnknownDate = useCallback(() => {
    markDiagnosticStarted();
    dispatch({ type: "set-fixation-known", value: "unknown" });
    setHeroResultVisible(false);
    setDateHelpVisible(false);
    setReminderPrepared(false);
    triggerHeroHighlight();
  }, [markDiagnosticStarted, triggerHeroHighlight]);

  const handleShowWindow = useCallback(() => {
    markDiagnosticStarted();
    const errors = validateStep(diagnosticState);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "next" });
      focusHeroInstrument();
      return;
    }

    gaEvent("fixation_date_submitted", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
    const selectedMonth = parseIntegerOption(diagnosticState.fixationMonth);
    const selectedYear = parseIntegerOption(diagnosticState.fixationYear);
    const result = resolveFixationBucket(
      {
        month: selectedMonth,
        year: selectedYear,
        unknown: diagnosticState.fixationDateKnown === "unknown",
      },
      new Date(baseYear, baseMonth - 1, 1),
    );
    dispatch({ type: "set-refixation-path", value: result.path });
    gaEvent("fixation_result_viewed", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
    setHeroResultVisible(true);
    triggerHeroHighlight();
  }, [
    baseMonth,
    baseYear,
    diagnosticState,
    focusHeroInstrument,
    markDiagnosticStarted,
    triggerHeroHighlight,
  ]);

  const handleContinueToAudit = useCallback((path: RefixationPath) => {
    dispatch({ type: "set-refixation-path", value: path });
    gaEvent("refixation_path_selected", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
    if (diagnosticState.step > 0) {
      scrollToDiagnostic();
      return;
    }

    const errors = validateStep(diagnosticState);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "next" });
      focusHeroInstrument();
      return;
    }

    if (!heroResultVisible) {
      handleShowWindow();
      return;
    }

    dispatch({ type: "next" });
    window.setTimeout(scrollToDiagnostic, 80);
  }, [
    diagnosticState,
    focusHeroInstrument,
    handleShowWindow,
    heroResultVisible,
    scrollToDiagnostic,
  ]);

  const handleReminder = useCallback((path: RefixationPath, reviewDate: Date) => {
    dispatch({ type: "set-refixation-path", value: path });
    gaEvent("refixation_path_selected", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
    downloadReviewReminder(reviewDate);
    setReminderPrepared(true);
  }, []);

  const handleEditDate = useCallback(() => {
    setHeroResultVisible(false);
    setDateHelpVisible(false);
    setReminderPrepared(false);
    dispatch({ type: "set-refixation-path", value: null });
    window.setTimeout(focusHeroInstrument, 0);
  }, [focusHeroInstrument]);

  const handleToggleDateHelp = useCallback(() => {
    setDateHelpVisible((visible) => !visible);
  }, []);

  const handleBack = useCallback(() => {
    if (diagnosticState.step === 1) {
      dispatch({ type: "go", step: 0 });
      window.setTimeout(focusHeroInstrument, 0);
      return;
    }

    dispatch({
      type: "go",
      step: (diagnosticState.step - 1) as DiagnosticStep,
    });
  }, [diagnosticState.step, focusHeroInstrument]);

  const summaryErrors = useMemo<FieldError[]>(() => {
    const clientErrors = Object.entries(diagnosticState.errors).map(
      ([fieldId, message]) => ({
        fieldId: fieldIdForError(fieldId),
        message: message ?? "",
      }),
    );
    const serverErrors = Object.entries(formState.errors).map(
      ([fieldId, message]) => ({
        fieldId: fieldIdForError(fieldId),
        message: message ?? "",
      }),
    );
    return [...clientErrors, ...serverErrors].filter((error) => error.message);
  }, [diagnosticState.errors, formState.errors]);

  useEffect(() => {
    dispatch({ type: "set-attribution", value: readAttributionFromUrl() });
  }, []);

  useEffect(() => {
    const handleHeroFocusRequest = () => triggerHeroHighlight();
    window.addEventListener("refixation:hero-focus", handleHeroFocusRequest);
    return () => window.removeEventListener("refixation:hero-focus", handleHeroFocusRequest);
  }, [triggerHeroHighlight]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
  }, [diagnosticState.step]);

  useEffect(() => {
    if (formState.status !== "invalid") return;
    let focusTimer: number | null = null;
    if (formState.errors.fixationDate) {
      focusTimer = window.setTimeout(() => {
        setHeroResultVisible(false);
        dispatch({ type: "go", step: 0 });
        focusHeroInstrument();
      }, 0);
    } else if (formState.errors.remainingBalanceBand) dispatch({ type: "go", step: 1 });
    else if (formState.errors.priority) dispatch({ type: "go", step: 2 });
    return () => {
      if (focusTimer !== null) window.clearTimeout(focusTimer);
    };
  }, [focusHeroInstrument, formState.status, formState.errors]);

  useEffect(() => {
    if (formState.status !== "accepted" || resultAnnouncedRef.current) return;
    resultAnnouncedRef.current = true;
    gaEvent("lead_submit", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
    gaEvent("callback_requested", {
      funnel_id: "mortgage-refixation",
      page_path: "/refixace-hypoteky/",
    });
  }, [formState.status]);

  const statusMessage = statusMessages[formState.status];
  const stepLabel = `Krok ${Math.min(diagnosticState.step + 1, 3)} ze 3`;
  const acceptedResult =
    formState.status === "accepted" && formState.result
      ? formState.result
      : null;
  const fixationDateError = diagnosticState.errors.fixationDate ?? formState.errors.fixationDate;

  return (
    <>
      <Surface
        as="div"
        className={s.heroBand}
        data-refixation-hero
        surface="page"
        tone="dark"
      >
        <ReactBitsSilk
          readyAttribute="data-silk-ready"
          readyTargetSelector="[data-refixation-hero]"
        />
        <section className={s.hero} aria-labelledby="refixation-hero-title">
          <div className={s.heroCopy}>
            <p className={s.kicker}>První výsledek za 2 minuty</p>
            <h1 id="refixation-hero-title">
              <span>Končí vám fixace?</span>
              <span className={s.heroAccent}>
                Banka nemá poslední slovo.
              </span>
            </h1>
            <p className={s.heroText}>
              Zadejte měsíc. Za pár sekund uvidíte, kdy začít porovnávat možnosti.
            </p>
            <div className={s.heroIdentity}>
              <div className={s.heroIdentityPortrait}>
                <Image
                  alt="Můj portrét"
                  className={s.heroIdentityPortraitImage}
                  height={280}
                  priority
                  src="/heroRemastered.png"
                  width={280}
                />
              </div>
              <div className={s.heroIdentityCopy}>
                <span>Výsledek osobně projdu s vámi.</span>
                <strong>David Pokorný</strong>
              </div>
            </div>
          </div>

          <HeroDecisionInstrument
            baseMonth={baseMonth}
            baseYear={baseYear}
            diagnosticState={diagnosticState}
            dateHelpVisible={dateHelpVisible}
            dispatch={dispatch}
            fixationDateError={fixationDateError}
            heroResultVisible={heroResultVisible}
            highlighted={heroHighlighted}
            onContinueToAudit={handleContinueToAudit}
            onEditDate={handleEditDate}
            onFieldChange={handleHeroFieldChange}
            onReminder={handleReminder}
            onUnknownDate={handleUnknownDate}
            onShowWindow={handleShowWindow}
            onToggleDateHelp={handleToggleDateHelp}
            reminderPrepared={reminderPrepared}
            yearOptions={yearOptions}
          />
        </section>

        <HeroTrustRail />
      </Surface>

      <section
        ref={diagnosticSectionRef}
        className={s.diagnosticShell}
        data-refixation-path={diagnosticState.refixationPath ?? undefined}
        id="refixation-diagnostic"
        aria-labelledby="refixation-diagnostic-title"
      >
        <div className={s.diagnosticIntro}>
          <p className={s.kicker}>Interaktivní diagnostika</p>
          <h2 id="refixation-diagnostic-title">Doplňte zůstatek a prioritu.</h2>
          <p>Termín fixace zůstává ve stejném diagnostickém stavu. Kontaktní údaje přijdou až po prvním výsledku.</p>
        </div>

        <Surface
          as="div"
          className={s.diagnosticCard}
          surface="card-light"
          tone="light"
        >
          {acceptedResult ? (
            <div aria-live="polite">
              <RefixationResult {...acceptedResult} />
            </div>
          ) : diagnosticState.step === 0 ? (
            <div className={s.diagnosticPending}>
              <p className={s.kicker}>Krok 1 je v hero</p>
              <h3>Začněte výběrem termínu fixace nahoře.</h3>
              <p>
                První otázka je součástí rozhodovacího okna. Jakmile potvrdíte
                první výsledek, pokračování se otevře tady.
              </p>
              <button className={s.secondaryButton} type="button" onClick={focusHeroInstrument}>
                Přejít k první otázce
              </button>
            </div>
          ) : (
            <>
              <div className={s.progressRow} aria-label={stepLabel}>
                <span>{stepLabel}</span>
                <span aria-hidden="true">
                  <i style={{ inlineSize: `${Math.min((diagnosticState.step + 1) * 33.33, 100)}%` }} />
                </span>
              </div>

              <ErrorSummary
                announce="assertive"
                errors={summaryErrors}
                focusKey={formState.attempt + diagnosticState.step}
                focusOnMount
                headingLevel="h3"
                title="Zkontrolujte diagnostiku"
              />

              {statusMessage ? (
                <div className={s.statusError} role="alert">
                  {statusMessage}{" "}
                  <Link href="mailto:info@pokornydavid.cz" variant="text">
                    Napsat e-mail
                  </Link>
                </div>
              ) : null}

              <form action={formAction} noValidate>
                <input name="idempotencyKey" type="hidden" value={formState.idempotencyKey} />
                <input
                  name="privacyNoticeVersion"
                  type="hidden"
                  value={refixationPrivacyNoticeVersion}
                />
                <input
                  name="fixationDateKnown"
                  type="hidden"
                  value={diagnosticState.fixationDateKnown}
                />
                <input name="fixationMonth" type="hidden" value={diagnosticState.fixationMonth} />
                <input name="fixationYear" type="hidden" value={diagnosticState.fixationYear} />
                <input
                  name="remainingBalanceBand"
                  type="hidden"
                  value={diagnosticState.remainingBalanceBand}
                />
                <input name="priority" type="hidden" value={diagnosticState.priority} />
                {Object.entries(diagnosticState.attribution).map(([key, value]) => (
                  <input key={key} name={key} type="hidden" value={value} />
                ))}
                <div aria-hidden="true" className={s.honeypot}>
                  <label htmlFor="refixation-website">Webová stránka</label>
                  <input
                    autoComplete="off"
                    id="refixation-website"
                    name="website"
                    tabIndex={-1}
                    type="text"
                  />
                </div>

                {diagnosticState.step === 1 ? (
                  <div className={s.stepPanel}>
                    <h3 ref={headingRef} tabIndex={-1}>
                      Jaký je přibližný zůstatek hypotéky?
                    </h3>
                    <RadioGroup
                      defaultValue={diagnosticState.remainingBalanceBand || undefined}
                      error={diagnosticState.errors.remainingBalanceBand}
                      id="refixation-balance"
                      key={`balance-${diagnosticState.step}`}
                      legend="Vyberte pouze pásmo. Přesnou částku zatím nepotřebuji."
                      name="remainingBalanceBandUi"
                      options={remainingBalanceOptions}
                      required
                      onValueChange={(value) => dispatch({ type: "set-balance", value })}
                    />
                  </div>
                ) : null}

                {diagnosticState.step === 2 ? (
                  <div className={s.stepPanel}>
                    <h3 ref={headingRef} tabIndex={-1}>
                      Co je pro vás při další fixaci nejdůležitější?
                    </h3>
                    <RadioGroup
                      defaultValue={diagnosticState.priority || undefined}
                      error={diagnosticState.errors.priority}
                      id="refixation-priority"
                      key={`priority-${diagnosticState.step}`}
                      legend="Nejde o automatické doporučení. Jen si ujasníme, co mám ověřit."
                      name="priorityUi"
                      options={priorityOptions}
                      required
                      onValueChange={(value) => dispatch({ type: "set-priority", value })}
                    />
                  </div>
                ) : null}

                {diagnosticState.step === 3 ? (
                  <div className={s.stepPanel}>
                    <div className={s.contactHead}>
                      <p className={s.kicker}>Kontaktní krok</p>
                      <h3 ref={headingRef} tabIndex={-1}>
                        Kam vám mám poslat výsledek a ozvat se kvůli ověření?
                      </h3>
                    </div>
                    <div className={s.contactGrid}>
                      <TextField
                        autoComplete="name"
                        error={formState.errors.name}
                        id="refixation-name"
                        label="Jméno"
                        name="name"
                        required
                      />
                      <TextField
                        autoComplete="tel"
                        error={formState.errors.phone}
                        id="refixation-phone"
                        label="Telefon"
                        name="phone"
                        required
                        type="tel"
                      />
                      <TextField
                        autoComplete="email"
                        error={formState.errors.email}
                        id="refixation-email"
                        inputMode="email"
                        label="E-mail"
                        name="email"
                        required
                        spellCheck={false}
                        type="email"
                      />
                      <SelectField
                        autoComplete="off"
                        error={formState.errors.callbackWindow}
                        id="refixation-callbackWindow"
                        label="Preferované časové okno"
                        name="callbackWindow"
                        required
                      >
                        <option value="">Vyberte čas</option>
                        {callbackWindowOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectField>
                    </div>
                    <p className={s.privacyMicrocopy}>
                      Údaje použiji k vyřízení vaší žádosti a domluvě kontaktu
                      k této konkrétní poptávce. Odesláním vás nepřihlašuji
                      k newsletteru.{" "}
                      <Link href="/zasady-zpracovani-osobnich-udaju/" variant="text">
                        Jak zpracovávám osobní údaje
                      </Link>
                    </p>
                  </div>
                ) : null}

                <div className={s.stepActions}>
                  <button
                    className={s.secondaryButton}
                    type="button"
                    onClick={handleBack}
                  >
                    Zpět
                  </button>
                  {diagnosticState.step < 3 ? (
                    <button
                      className={s.primaryButton}
                      type="button"
                      onClick={() => dispatch({ type: "next" })}
                    >
                      <span>Pokračovat</span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  ) : (
                    <Button
                      className={s.submitButton}
                      data-cursor="action"
                      data-cursor-icon="send"
                      data-cursor-label="ZÍSKAT PŘEHLED • ZAČÍT PRVNÍM KROKEM •"
                      data-cursor-magnetic="true"
                      loading={pending}
                      loadingLabel="Odesílám žádost…"
                      startIcon={<Send />}
                      type="submit"
                    >
                      Získat plán a požádat o kontakt
                    </Button>
                  )}
                </div>
              </form>
            </>
          )}
        </Surface>
      </section>
    </>
  );
}
