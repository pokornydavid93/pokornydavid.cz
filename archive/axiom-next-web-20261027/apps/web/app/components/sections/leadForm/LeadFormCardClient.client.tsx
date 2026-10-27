"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Button from "@/app/ui/cta/Button";
import { testimonialGoogleProfile } from "@/app/content/testimonials";
import s from "./leadform.module.css";
import RevealClient from "@/app/ui/animations/RevealClient";
import { StatusToast } from "./StatusToast";
import { Send } from "lucide-react";
import type { LeadFormPayload, LeadTopic } from "@/lib/api";
import { getApiClient } from "@/src/services/api";
import {
  isLeadTopic,
} from "./leadFormTopics";
import {
  LEAD_FORM_PREFILL_EVENT,
  type LeadFormPrefillEventDetail,
} from "./leadFormPrefillEvent";
import LegalLink from "@/app/ui/legal/LegalLink";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";
import { formPrivacyNotice } from "@/app/content/form-privacy";

type LeadFormCardProps = {
  prefillTopic?: string;
  variant?: "section" | "modal";
  onRequestClose?: () => void;
};

type StatusState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string; tone: "success" | "info" }
  | { state: "error"; message: string };

const modalTopicOptions: ReadonlyArray<{ label: string; value: LeadTopic }> = [
  { label: "Hypotéka / bydlení", value: "Hypotéka & bydlení" },
  { label: "Finanční plán", value: "Finanční plán" },
  { label: "Zajištění příjmu", value: "Zajištění příjmu" },
  { label: "Investice", value: "Investice a spoření" },
  { label: "Pojištění", value: "Pojištění odpovědnosti" },
  { label: "Nemovitost", value: "Reality / prodej nemovitosti" },
  {
    label: "Úvěr / financování",
    value: "Spotřebitelské a podnikatelské úvěry",
  },
  { label: "Jiná situace", value: "Jiná situace" },
];

const SectionReveal = ({
  enabled,
  children,
  ...props
}: {
  enabled: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof RevealClient>) => {
  if (!enabled) return <>{children}</>;
  return <RevealClient {...props}>{children}</RevealClient>;
};

const LeadFormCardClient = ({
  prefillTopic,
  variant = "section",
  onRequestClose,
}: LeadFormCardProps) => {
  const isSection = variant === "section";
  const renderedTopicOptions = useMemo(() => modalTopicOptions, []);

  const defaultTopic = useMemo<LeadTopic | undefined>(() => {
    if (!prefillTopic) return undefined;
    return isLeadTopic(prefillTopic) ? prefillTopic : undefined;
  }, [prefillTopic]);

  const [selectedTopic, setSelectedTopic] = useState<LeadTopic | undefined>(
    defaultTopic
  );
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusState>({ state: "idle" });
  const [isFormHidden, setIsFormHidden] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);
  const startedRef = useRef(false);
  const focusedFieldsRef = useRef<Set<string>>(new Set());
  const modalOpenTrackedRef = useRef(false);

  useEffect(() => {
    if (variant !== "modal" || modalOpenTrackedRef.current) return;
    gaEvent("lead_modal_open", { location: "lead_form", variant: "modal" });
    modalOpenTrackedRef.current = true;
  }, [variant]);

  const prefilledTopic = Boolean(defaultTopic);

  const trackFormStartOnce = () => {
    if (startedRef.current) return;
    gaEvent("form_start", {
      location: "lead_form",
      variant,
      prefilled_topic: prefilledTopic,
    });
    startedRef.current = true;
  };

  const trackFieldFocusOnce = (field: string) => {
    if (focusedFieldsRef.current.has(field)) return;
    gaEvent("form_field_focus", { location: "lead_form", variant, field });
    focusedFieldsRef.current.add(field);
  };

  const formatPhone = (input: string) => {
    const trimmed = input.trim();
    const hasPlus = trimmed.startsWith("+");
    const hasDoubleZero = trimmed.startsWith("00");

    let digits = trimmed.replace(/\D/g, "");
    if (hasDoubleZero && digits.length >= 2) {
      digits = digits.slice(2);
    }

    const parts: string[] = [];
    for (let i = 0; i < digits.length; i += 3) {
      parts.push(digits.slice(i, i + 3));
    }

    if (parts.length === 0) {
      return hasPlus || hasDoubleZero ? "+" : "";
    }

    if (hasPlus || hasDoubleZero) {
      parts[0] = `+${parts[0]}`;
    }

    return parts.join(" ").trim().slice(0, 24);
  };

  const normalizePhone = (
    raw: string
  ): {
    country: "420" | "421";
    national: string;
    e164: string;
  } | null => {
    const trimmed = raw.trim();
    const hasDoubleZero = trimmed.startsWith("00");

    let digits = trimmed.replace(/\D/g, "");
    if (hasDoubleZero && digits.length >= 2) {
      digits = digits.slice(2);
    }

    if (digits.startsWith("420")) {
      const national = digits.slice(3);
      if (national.length === 9) {
        return { country: "420", national, e164: `+420${national}` };
      }
      return null;
    }

    if (digits.startsWith("421")) {
      const national = digits.slice(3);
      if (national.length === 9) {
        return { country: "421", national, e164: `+421${national}` };
      }
      return null;
    }

    if (digits.length === 9) {
      return { country: "420", national: digits, e164: `+420${digits}` };
    }

    return null;
  };

  const resetForm = () => {
    setSelectedTopic(defaultTopic);
    setFullName("");
    setEmail("");
    setPhone("");
    setNote("");
    setErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const fd = new FormData(form);
    const rawFullName = String(fd.get("fullName") ?? "");
    const rawEmail = String(fd.get("email") ?? "");
    const rawPhone = String(fd.get("phone") ?? "");
    const rawNote = String(fd.get("note") ?? "");
    const rawTopic = String(fd.get("topic") ?? "");

    const nextErrors: Record<string, string> = {};

    if (!rawFullName.trim()) {
      nextErrors.fullName = "Vyplňte jméno a příjmení.";
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!rawEmail.trim()) {
      nextErrors.email = "Vyplňte e-mail.";
    } else if (!emailRegex.test(rawEmail.trim())) {
      nextErrors.email = "E-mail není ve správném tvaru.";
    }

    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone) {
      nextErrors.phone =
        "Zadejte telefon ve formátu 731 830 897 nebo +420… / +421…";
    }

    if (Object.keys(nextErrors).length > 0) {
      const errorFields = Object.keys(nextErrors);
      gaEvent("form_validation_error", {
        location: "lead_form",
        variant,
        fields: errorFields,
        error_count: errorFields.length,
      });
      setErrors(nextErrors);
      setStatus({ state: "error", message: "Zkontrolujte zvýrazněná pole." });
      return;
    }

    if (!normalizedPhone) {
      return;
    }

    setErrors({});
    setStatus({ state: "submitting" });

    try {
      const trimmedNote = rawNote.trim();
      const payload: LeadFormPayload = {
        name: rawFullName.trim(),
        email: rawEmail.trim(),
        phone: normalizedPhone.national,
        ...(isLeadTopic(rawTopic) ? { topic: rawTopic } : {}),
        message: trimmedNote,
        privacy_notice_version: formPrivacyNotice.version,
      };
      const topicSelected = Boolean(payload.topic);

      const result = await getApiClient().submitLead(payload);
      const serverMessage = result.message?.trim();

      if (result.deduped) {
        gaEvent("generate_lead", {
          location: "lead_form",
          variant,
          deduped: true,
          topic_selected: topicSelected,
        });
        if (process.env.NODE_ENV === "development") {
          console.info("[lead] deduped");
        }
        setStatus({
          state: "success",
          tone: "info",
          message: serverMessage || "Poptávku již eviduji, brzy se ozvu.",
        });
        return;
      }

      gaEvent("generate_lead", {
        location: "lead_form",
        variant,
        deduped: false,
        topic_selected: topicSelected,
      });

      setStatus({
        state: "success",
        tone: "success",
        message: serverMessage || "Na váš e-mail bylo odesláno shrnutí.",
      });

      resetForm();

      // volitelně: když je to modal, můžeš zavřít hned po success
      // onRequestClose?.()

      // volitelně: log pro debug
      // console.log("Lead created:", res?.id)
    } catch (e) {
      console.error(e);
      const status =
        typeof e === "object" && e && "status" in e
          ? (e as { status?: number }).status
          : undefined;
      const data =
        typeof e === "object" && e && "data" in e
          ? (e as { data?: unknown }).data
          : undefined;
      const code =
        typeof data === "object" && data && "error" in data
          ? (data as { error?: string }).error
          : typeof data === "object" && data && "code" in data
          ? (data as { code?: string }).code
          : typeof data === "object" && data && "message" in data
          ? (data as { message?: string }).message
          : typeof data === "string"
          ? data
          : null;

      gaEvent("lead_submit_error", {
        location: "lead_form",
        variant,
        status,
        code: code ?? undefined,
      });

      if (status === 429) {
        setStatus({
          state: "error",
          message: "Příliš mnoho pokusů. Zkuste to prosím později.",
        });
        return;
      }

      if (status === 409 && code === "email_exists") {
        setStatus({
          state: "success",
          tone: "info",
          message:
            "Z této e-mailové adresy už eviduji novou poptávku. Ozvu se co nejdříve.",
        });
        return;
      }

      setStatus({
        state: "error",
        message:
          "Odeslání se nepovedlo. Zkuste to prosím znovu, nebo napište na info@pokornydavid.cz.",
      });
      resetForm();
    }
  };

  const resetStatus = () =>
    setStatus((prev) => (prev.state === "idle" ? prev : { state: "idle" }));

  useEffect(() => {
    if (!isSection) return;

    const handlePrefillTopic = (event: Event) => {
      const { detail } = event as CustomEvent<LeadFormPrefillEventDetail>;
      if (!detail || !isLeadTopic(detail.topic)) return;

      setSelectedTopic(detail.topic);
      setErrors({});
      setStatus({ state: "idle" });

      if (detail.focus) {
        window.setTimeout(() => {
          formRef.current
            ?.querySelector<HTMLButtonElement>("[data-topic-pill-active='true']")
            ?.focus({ preventScroll: true });
        }, 700);
      }
    };

    window.addEventListener(LEAD_FORM_PREFILL_EVENT, handlePrefillTopic);
    return () => {
      window.removeEventListener(LEAD_FORM_PREFILL_EVENT, handlePrefillTopic);
    };
  }, [isSection]);

  const handleSuccessContinue = () => {
    setStatus({ state: "idle" });
    if (variant === "modal") {
      setIsFormHidden(true);
      onRequestClose?.();
    }
  };

  if (isFormHidden) return null;

  if (variant === "modal") {
    return (
      <div
        className={`${s.formCard} ${s.formCardModal}`}
        data-modal-scroll="true"
        data-lenis-prevent-wheel="true"
      >
        <div className={s.formGlass} aria-hidden />
        <div className={s.formGlow} aria-hidden />

        {onRequestClose ? (
          <button
            type="button"
            className={s.modalClose}
            aria-label="Zavřít formulář"
            onClick={onRequestClose}
          >
            ×
          </button>
        ) : null}

        <div className={s.modalSheetLayout}>
          <aside className={s.modalInfoPanel}>
            <p className={s.modalEyebrow}>ÚVODNÍ HOVOR</p>
            <h2 id="lead-form-modal-title" className={s.modalInfoTitle}>
              Ujasníme, kde začít.
            </h2>
            <p className={s.modalInfoText}>
              Krátký úvodní hovor bez přípravy. Projdeme, co řešíte, co je
              důležité a jaký další krok dává smysl.
            </p>

            <ul className={s.modalBenefitList}>
              <li>Ozvu se obvykle do 24 hodin</li>
              <li>Hovor trvá zhruba 20 minut</li>
              <li>Bez přípravy a bez závazku</li>
            </ul>

            <div className={s.modalInfoChips} aria-label="Charakter hovoru">
              <span>Telefonicky</span>
              <span>20 minut</span>
              <span>Nezávazně</span>
            </div>
          </aside>

          <form
            className={`${s.form} ${s.modalForm}`}
            onSubmit={handleSubmit}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
              event.preventDefault();
              queueMicrotask(() => formRef.current?.requestSubmit());
            }}
            ref={formRef}
          >
            <div className={s.modalFormScroll}>
              <div className={s.modalFormHead}>
                <p className={s.kicker}>Kontaktní údaje</p>
                <h3>Kam se vám mám ozvat?</h3>
                <p className={s.modalFormIntro}>
                  Vyplňte kontakt a vyberte téma, ať se spolu dostaneme rovnou k
                  věci.
                </p>
              </div>

              <div className={s.inlineFields}>
                <label className={s.field}>
                  <span className={s.fieldLabel}>
                    Jméno a příjmení <span className={s.required}>*</span>
                  </span>
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Např. Jana Nováková"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => {
                      trackFormStartOnce();
                      setFullName(e.target.value);
                      resetStatus();
                    }}
                    onFocus={() => {
                      trackFormStartOnce();
                      trackFieldFocusOnce("fullName");
                    }}
                    className={errors.fullName ? s.fieldError : undefined}
                  />
                  {errors.fullName ? (
                    <span className={s.errorText}>{errors.fullName}</span>
                  ) : null}
                </label>

                <label className={s.field}>
                  <span className={s.fieldLabel}>
                    Telefon <span className={s.required}>*</span>
                  </span>
                  <div className={s.phoneGroup}>
                    <input
                      type="tel"
                      name="phone"
                      inputMode="numeric"
                      placeholder="Např. 725 375 855"
                      autoComplete="tel"
                      value={phone}
                      onChange={(e) => {
                        trackFormStartOnce();
                        setPhone(formatPhone(e.target.value));
                        resetStatus();
                      }}
                      onFocus={() => {
                        trackFormStartOnce();
                        trackFieldFocusOnce("phone");
                      }}
                      className={`${s.phoneInput} ${
                        errors.phone ? s.fieldError : ""
                      }`}
                    />
                  </div>
                  {errors.phone ? (
                    <span className={s.errorText}>{errors.phone}</span>
                  ) : null}
                </label>
              </div>

              <label className={s.field}>
                <div className={s.labelRow}>
                  <span>E-mail</span>
                  <span className={s.optional}>Povinné kvůli potvrzení</span>
                </div>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="Např. jana@seznam.cz"
                  value={email}
                  onChange={(e) => {
                    trackFormStartOnce();
                    setEmail(e.target.value);
                    resetStatus();
                  }}
                  onFocus={() => {
                    trackFormStartOnce();
                    trackFieldFocusOnce("email");
                  }}
                  className={errors.email ? s.fieldError : undefined}
                />
                {errors.email ? (
                  <span className={s.errorText}>{errors.email}</span>
                ) : null}
              </label>

              <fieldset className={`${s.field} ${s.topicChipField}`}>
                <div className={s.labelRow}>
                  <legend>Téma hovoru</legend>
                  <span className={s.optional}>Nepovinné</span>
                </div>
                <input type="hidden" name="topic" value={selectedTopic ?? ""} />
                <div className={s.topicChips} aria-label="Téma hovoru">
                  {renderedTopicOptions.map((topic) => {
                    const label = typeof topic === "string" ? topic : topic.label;
                    const value = typeof topic === "string" ? topic : topic.value;

                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${s.topicChip} ${
                          selectedTopic === value ? s.topicChipActive : ""
                        }`}
                        aria-pressed={selectedTopic === value}
                        onClick={() => {
                          trackFormStartOnce();
                          resetStatus();
                          setSelectedTopic((current) =>
                            current === value ? undefined : value
                          );
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                {errors.topic ? (
                  <span className={s.errorText}>{errors.topic}</span>
                ) : null}
              </fieldset>

              <label className={s.field}>
                <div className={s.labelRow}>
                  <span>Poznámka</span>
                  <span className={s.optional}>Nepovinné</span>
                </div>
                <textarea
                  name="note"
                  rows={3}
                  placeholder="Stačí jednou větou. Např. končí nám fixace, řešíme pojištění, chceme začít investovat…"
                  value={note}
                  onChange={(e) => {
                    trackFormStartOnce();
                    setNote(e.target.value);
                    resetStatus();
                  }}
                  onFocus={() => {
                    trackFormStartOnce();
                    trackFieldFocusOnce("note");
                  }}
                />
              </label>
            </div>

            <div className={s.modalActionBar}>
              <div className={s.modalLegalNote} data-form-privacy-notice={formPrivacyNotice.version}>
                <p>Nezávazně. Ozvu se kvůli domluvě termínu.</p>
                <p>
                  {formPrivacyNotice.leadText}{" "}
                  <LegalLink
                    className={s.privacyLink}
                    href={formPrivacyNotice.detailHref}
                    onClick={() => {
                      setIsFormHidden(true);
                    }}
                    onRequestClose={onRequestClose}
                  >
                    Zásady zpracování osobních údajů
                  </LegalLink>
                </p>
              </div>

              <div className={s.modalSubmitGroup}>
                <Button
                  type="submit"
                  variant="cta"
                  className={`${s.submitBtn} ${s.modalSubmitBtn}`}
                  data-cursor="action"
                  data-cursor-icon="send"
                  data-cursor-label="DOMLUVIT ÚVODNÍ HOVOR • PRVNÍ KROK •"
                  data-cursor-magnetic="true"
                  disabled={status.state === "submitting"}
                  aria-busy={status.state === "submitting"}
                  iconRight={<Send />}
                  onClick={() => {
                    gaEvent("cta_click", {
                      location: "lead_form",
                      variant,
                      label: "Domluvit úvodní hovor",
                      topic_selected: Boolean(selectedTopic),
                    });
                  }}
                >
                  {status.state === "submitting"
                    ? "Odesílám…"
                    : "Domluvit úvodní hovor"}
                </Button>
                {status.state === "submitting" ? (
                  <span className={s.loader} aria-hidden />
                ) : null}
              </div>
            </div>

            {status.state === "success" ? (
              <StatusToast
                state={status.tone}
                message={status.message}
                duration={Infinity}
                actionLabel="Pokračovat"
                onAction={handleSuccessContinue}
                showClose={status.tone !== "success"}
                onHide={() => setStatus({ state: "idle" })}
              />
            ) : null}

            {status.state === "error" && status.message ? (
              <StatusToast
                state="error"
                message={status.message}
                duration={Infinity}
                onHide={() => setStatus({ state: "idle" })}
              />
            ) : null}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div
      className={s.formCard}
    >
      <div className={s.formGlass} aria-hidden />
      <div className={s.formGlow} aria-hidden />

      {onRequestClose ? (
        <button
          type="button"
          className={s.modalClose}
          aria-label="Zavřít formulář"
          onClick={onRequestClose}
        >
          ×
        </button>
      ) : null}

      <SectionReveal once={true} enabled={isSection} from="left">
        <div className={s.formHead}>
          <p className={s.kicker}>ÚVODNÍ HOVOR</p>
          <h2 className={s.title}>Probereme vaši situaci</h2>
          <p className={s.subtitle}>
            Ozvu se vám nejpozději do 24 hodin.
          </p>
          <p className={s.formMicrocopy}>
            Stačí základní kontakt. Detaily probereme až spolu.
          </p>
        </div>

        {/* <p className={s.subtitle}>
          Jsem mimo kancelář do 8. února. Kontakt ale můžete vyplnit už teď – po návratu vám navrhnu první možný termín.
        </p> */}
      </SectionReveal>

      <form
        className={`${s.form}`}
        onSubmit={handleSubmit}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          if ((event.target as HTMLElement).tagName === "TEXTAREA") return;
          event.preventDefault();
          queueMicrotask(() => formRef.current?.requestSubmit());
        }}
        ref={formRef}
      >
        <div className={s.contactGrid}>
          <SectionReveal
            once={true}
            enabled={isSection}
            from="left"
            className={s.trustColumn}
          >
            <aside className={s.trustPanel}>
              <p className={s.trustKicker}>ÚVODNÍ HOVOR</p>
              <h3 className={s.trustTitle}>Úvodní hovor v kostce</h3>
              <p className={s.trustText}>
                Krátký úvodní hovor bez přípravy. Projdeme, co řešíte, co je
                důležité a jaký další krok dává smysl.
              </p>
              <ul className={s.trustList}>
                <li>Ozvu se obvykle do 24 hodin</li>
                <li>Hovor trvá zhruba 20 minut</li>
                <li>Bez přípravy a bez závazku</li>
              </ul>
              <div className={s.trustBadges} aria-label="Charakter konzultace">
                <span>Telefonicky</span>
                <span>20 minut</span>
                <span>Bez přípravy</span>
              </div>
              <p className={s.trustRating}>
                <span>5,0 Google hodnocení</span> · {testimonialGoogleProfile.reviewCount} ověřených recenzí
              </p>
            </aside>
          </SectionReveal>

          <div className={s.formColumn}>
        <div className={s.formSurface}>
          <SectionReveal
            once={true}
            enabled={isSection}
            from="left"
          >
            <div className={s.surfaceHead}>
              <p className={s.kicker}>KONTAKTNÍ ÚDAJE</p>
              <h3>Kam se vám mám ozvat?</h3>
              <p>
                Vyplňte kontakt a vyberte téma, ať se spolu dostaneme rovnou k
                věci.
              </p>
            </div>
          </SectionReveal>

          <SectionReveal
            once={true}
            enabled={isSection}
            from="left"
          >
            <div className={s.inlineFields}>
              <label className={s.field}>
                <span className={s.fieldLabel}>
                  Jméno a příjmení <span className={s.required}>*</span>
                </span>
                <input
                  type="text"
                  name="fullName"
                  placeholder="Např. Jana Nováková"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => {
                    trackFormStartOnce();
                    setFullName(e.target.value);
                    resetStatus();
                  }}
                  onFocus={() => {
                    trackFormStartOnce();
                    trackFieldFocusOnce("fullName");
                  }}
                  className={errors.fullName ? s.fieldError : undefined}
                />
                {errors.fullName ? (
                  <span className={s.errorText}>{errors.fullName}</span>
                ) : null}
              </label>
              <label className={s.field}>
                <span className={s.fieldLabel}>
                  Telefon <span className={s.required}>*</span>
                </span>
                <div className={s.phoneGroup}>
                  <input
                    type="tel"
                    name="phone"
                    inputMode="numeric"
                    placeholder="Např. 725 375 855"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => {
                      trackFormStartOnce();
                      setPhone(formatPhone(e.target.value));
                      resetStatus();
                    }}
                    onFocus={() => {
                      trackFormStartOnce();
                      trackFieldFocusOnce("phone");
                    }}
                    className={`${s.phoneInput} ${
                      errors.phone ? s.fieldError : ""
                    }`}
                  />
                </div>
                {errors.phone ? (
                  <span className={s.errorText}>{errors.phone}</span>
                ) : null}
              </label>
            </div>
          </SectionReveal>

        <SectionReveal once={true} enabled={isSection} from="left">
          <label className={s.field}>
            <div className={s.labelRow}>
              <span>E-mail</span>
              <span className={s.optional}>povinné kvůli potvrzení</span>
            </div>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Např. jana@seznam.cz"
              value={email}
              onChange={(e) => {
                trackFormStartOnce();
                setEmail(e.target.value);
                resetStatus();
              }}
              onFocus={() => {
                trackFormStartOnce();
                trackFieldFocusOnce("email");
              }}
              className={errors.email ? s.fieldError : undefined}
            />
            {errors.email ? (
              <span className={s.errorText}>{errors.email}</span>
            ) : null}
          </label>
        </SectionReveal>

        <SectionReveal once={true} enabled={isSection} from="left">
          <fieldset className={`${s.field} ${s.topicChipField}`}>
            <div className={s.labelRow}>
              <legend>Téma hovoru</legend>
              <span className={s.optional}>nepovinné</span>
            </div>
            <input type="hidden" name="topic" value={selectedTopic ?? ""} />
            <div className={s.topicChips} aria-label="Téma hovoru">
              {renderedTopicOptions.map((topic) => {
                const label = topic.label;
                const value = topic.value;
                const isActive = selectedTopic === value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={`${s.topicChip} ${
                      isActive ? s.topicChipActive : ""
                    }`}
                    data-topic-pill-active={isActive ? "true" : undefined}
                    aria-pressed={isActive}
                    onFocus={() => {
                      trackFormStartOnce();
                      trackFieldFocusOnce("topic");
                    }}
                    onClick={() => {
                      trackFormStartOnce();
                      resetStatus();
                      setSelectedTopic((current) =>
                        current === value ? undefined : value
                      );
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            {errors.topic ? (
              <span className={s.errorText}>{errors.topic}</span>
            ) : null}
          </fieldset>
        </SectionReveal>

        <SectionReveal once={true} enabled={isSection} from="left">
          <label className={s.field}>
            <div className={s.labelRow}>
              <span>Poznámka</span>
              <span className={s.optional}>nepovinné</span>
            </div>
            <textarea
              name="note"
              rows={3}
              placeholder="Stačí jednou větou. Např. končí nám fixace, řešíme pojištění, chceme začít investovat..."
              value={note}
              onChange={(e) => {
                trackFormStartOnce();
                setNote(e.target.value);
                resetStatus();
              }}
              onFocus={() => {
                trackFormStartOnce();
                trackFieldFocusOnce("note");
              }}
            />
          </label>
        </SectionReveal>
        </div>
          </div>
          <SectionReveal
            once={true}
            enabled={isSection}
            from="left"
            className={s.sectionActionReveal}
          >
            <div className={s.sectionActionBar}>
              <div className={s.sectionLegalNote} data-form-privacy-notice={formPrivacyNotice.version}>
                <p>Konzultace je nezávazná a nepředstavuje investiční doporučení.</p>
                <p>Ozvu se kvůli domluvě termínu.</p>
                <p>
                  {formPrivacyNotice.leadText}{" "}
                  <LegalLink
                    className={s.privacyLink}
                    href={formPrivacyNotice.detailHref}
                    onRequestClose={onRequestClose}
                  >
                    Zásady zpracování osobních údajů
                  </LegalLink>
                </p>
              </div>
              <div className={s.modalSubmitGroup}>
                <Button
                  type="submit"
                  variant="cta"
                  className={`${s.submitBtn} ${s.sectionSubmitBtn}`}
                  data-cursor="action"
                  data-cursor-icon="send"
                  data-cursor-label="DOMLUVIT ÚVODNÍ HOVOR • PRVNÍ KROK •"
                  data-cursor-magnetic="true"
                  disabled={status.state === "submitting"}
                  aria-busy={status.state === "submitting"}
                  iconRight={<Send />}
                  onClick={() => {
                    gaEvent("cta_click", {
                      location: "lead_form",
                      variant,
                      label: "Domluvit úvodní hovor",
                      topic_selected: Boolean(selectedTopic),
                    });
                  }}
                >
                  {status.state === "submitting"
                    ? "Odesílám…"
                    : "Domluvit úvodní hovor"}
                </Button>
                {status.state === "submitting" ? (
                  <span className={s.loader} aria-hidden />
                ) : null}
              </div>
            </div>
          </SectionReveal>
        </div>

        {status.state === "success" ? (
          <StatusToast
            state={status.tone}
            message={status.message}
            duration={Infinity}
            actionLabel="Pokračovat"
            onAction={handleSuccessContinue}
            showClose={status.tone !== "success"}
            onHide={() => setStatus({ state: "idle" })}
          />
        ) : null}

        {status.state === "error" && status.message ? (
          <StatusToast
            state="error"
            message={status.message}
            duration={Infinity}
            onHide={() => setStatus({ state: "idle" })}
          />
        ) : null}
      </form>
    </div>
  );
};

export default LeadFormCardClient;
