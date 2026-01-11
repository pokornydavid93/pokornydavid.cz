"use client";

import {
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Button from "@/app/ui/cta/Button";
import s from "./leadform.module.css";
import { Reveal } from "@/app/ui/animations/Reveal";
import { StatusToast } from "./StatusToast";
import { Send } from "lucide-react";
import type { LeadFormPayload, LeadTopic } from "@/lib/api";
import { getApiClient } from "@/src/services/api";

export const leadFormTopics = [
  "Hypotéka & bydlení",
  "Finanční plán",
  "Investice a spoření",
  "Zajištění příjmu",
  "Pojištění vozidla",
  "Reality (prodej nemovitosti)",
  "Energie a úspory",
  "Ochrana majetku",
  "Pojištění odpovědnosti",
  "Spotřebitelské a podnikatelské úvěry",
  "Jiná situace",
] as const;

type LeadFormTopic = (typeof leadFormTopics)[number];

const isLeadTopic = (value: string): value is LeadTopic =>
  leadFormTopics.some((topic) => topic === value);

type LeadFormCardProps = {
  prefillTopic?: string;
  variant?: "section" | "modal";
  onRequestClose?: () => void;
};

type StatusState =
  | { state: "idle" }
  | { state: "submitting" }
  | { state: "success"; message: string }
  | { state: "error"; message: string };

const SectionReveal = ({
  enabled,
  children,
  ...props
}: {
  enabled: boolean;
  children: React.ReactNode;
} & React.ComponentProps<typeof Reveal>) => {
  if (!enabled) return <>{children}</>;
  return <Reveal {...props}>{children}</Reveal>;
};

const LeadFormCard = ({
  prefillTopic,
  variant = "section",
  onRequestClose,
}: LeadFormCardProps) => {
  const isSection = variant === "section";
  const topicOptions = useMemo<LeadFormTopic[]>(() => [...leadFormTopics], []);

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
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{
    left: number;
    top: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!isOpen) return;
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const updateMenuPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const maxHeight = Math.max(160, viewportHeight - rect.bottom - 24); // leave breathing room
    setMenuPos({
      left: rect.left,
      top: rect.bottom + 8,
      width: rect.width,
      maxHeight,
    });
  };

  useEffect(() => {
    if (!isOpen) return;

    updateMenuPosition();
    const handlers = [
      ["scroll", updateMenuPosition, true],
      ["resize", updateMenuPosition, false],
    ] as const;

    handlers.forEach(([event, handler, capture]) =>
      window.addEventListener(event, handler, capture)
    );

    return () => {
      handlers.forEach(([event, handler, capture]) =>
        window.removeEventListener(event, handler, capture)
      );
    };
  }, [isOpen]);

  const toggleMenu = () =>
    setIsOpen((prev) => {
      const next = !prev;
      if (next) updateMenuPosition();
      return next;
    });

  const handleSelect = (value: LeadTopic) => {
    resetStatus();
    setSelectedTopic(value);
    setIsOpen(false);
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

  const handleTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      toggleMenu();
    }
    if (event.key === "Escape") {
      setIsOpen(false);
    }
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

    const nextErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      nextErrors.fullName = "Vyplňte jméno a příjmení.";
    }

    const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!email.trim()) {
      nextErrors.email = "Vyplňte e-mail.";
    } else if (!emailRegex.test(email.trim())) {
      nextErrors.email = "E-mail není ve správném tvaru.";
    }

    const normalizedPhone = normalizePhone(phone);
    if (!normalizedPhone) {
      nextErrors.phone =
        "Zadejte telefon ve formátu 731 830 897 nebo +420… / +421…";
    }

    if (!selectedTopic) {
      nextErrors.topic = "Vyberte téma hovoru.";
    }

    if (Object.keys(nextErrors).length > 0) {
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
      const payload: LeadFormPayload = {
        name: fullName.trim(),
        email: email.trim(),
        phone: normalizedPhone.national,
        topic: selectedTopic,
        message: note.trim() || undefined,
      };

      await getApiClient().submitLead(payload);

      setStatus({
        state: "success",
        message:
          "Na vaši e-mailovou adresu bylo posláno potvrzení o přijetí údajů.",
      });

      resetForm();

      // volitelně: když je to modal, můžeš zavřít hned po success
      // onRequestClose?.()

      // volitelně: log pro debug
      // console.log("Lead created:", res?.id)
    } catch (e) {
      console.error(e);
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

  const handleSuccessContinue = () => {
    setStatus({ state: "idle" });
    setIsFormHidden(true);
    onRequestClose?.();
  };

  if (isFormHidden) return null;

  return (
    <div
      className={`${s.formCard} ${variant === "modal" ? s.formCardModal : ""}`}
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
          <p className={s.kicker}>V klidu a bez závazku</p>
          <h2 className={s.title}>Probereme vaši situaci</h2>
          <p className={s.subtitle}>
            Domluvíme další krok. Ozvu se do 24 hodin.
          </p>
        </div>
      </SectionReveal>

      <form className={`${s.form}`} onSubmit={handleSubmit}>
        <SectionReveal once={true} enabled={isSection} from="left">
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
                  setFullName(e.target.value);
                  resetStatus();
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
                    setPhone(formatPhone(e.target.value));
                    resetStatus();
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
            <span className={s.fieldLabel}>
              E-mail <span className={s.required}>*</span>
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              placeholder="Např. jana@seznam.cz"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                resetStatus();
              }}
              className={errors.email ? s.fieldError : undefined}
            />
            {errors.email ? (
              <span className={s.errorText}>{errors.email}</span>
            ) : null}
          </label>
        </SectionReveal>

        <SectionReveal once={true} enabled={isSection} from="left">
          <label className={s.field}>
            <span className={s.fieldLabel}>
              Téma hovoru <span className={s.required}>*</span>
            </span>
            <div className={s.selectWrap}>
              <button
                type="button"
                className={`${s.selectTrigger} ${isOpen ? s.selectOpen : ""} ${
                  errors.topic ? s.fieldError : ""
                }`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={toggleMenu}
                onKeyDown={handleTriggerKey}
                ref={triggerRef}
              >
                <span>{selectedTopic || "Vyberte téma"}</span>
                <span className={s.selectChevron} aria-hidden />
              </button>
              <input type="hidden" name="topic" value={selectedTopic ?? ""} />

              {isOpen && menuPos
                ? createPortal(
                    <div
                      className={s.selectMenu}
                      role="listbox"
                      aria-label="Téma hovoru"
                      ref={menuRef}
                      style={{
                        position: "fixed",
                        left: menuPos.left,
                        top: menuPos.top,
                        width: menuPos.width,
                        maxWidth: menuPos.width,
                        maxHeight: menuPos.maxHeight,
                        overflowY: "auto",
                      }}
                    >
                      {topicOptions.map((topic) => (
                        <button
                          key={topic}
                          type="button"
                          role="option"
                          aria-selected={selectedTopic === topic}
                          className={`${s.selectItem} ${
                            selectedTopic === topic ? s.selectItemActive : ""
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelect(topic);
                          }}
                          onClick={() => {
                            handleSelect(topic);
                            resetStatus();
                          }}
                        >
                          {topic}
                        </button>
                      ))}
                    </div>,
                    document.body
                  )
                : null}
              {errors.topic ? (
                <span className={s.errorText}>{errors.topic}</span>
              ) : null}
            </div>
          </label>
        </SectionReveal>

        <SectionReveal once={true} enabled={isSection} from="left">
          <label className={s.field}>
            <div className={s.labelRow}>
              <span>Poznámka</span>
              <span className={s.optional}>Nepovinné</span>
            </div>
            <textarea
              name="note"
              rows={4}
              placeholder="Pokud chcete, napište pár slov"
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                resetStatus();
              }}
            />
          </label>
        </SectionReveal>

        <SectionReveal once={true} enabled={isSection} from="left">
          <div className={s.actions}>
            <Button
              type="submit"
              variant="cta"
              className={s.submitBtn}
              disabled={status.state === "submitting"}
              aria-busy={status.state === "submitting"}
              iconRight={<Send />}
            >
              {status.state === "submitting" ? "Odesílám…" : "Odeslat"}
            </Button>
            <div className={s.loadingCont}>
              {status.state === "submitting" ? (
                <span className={s.loader} aria-hidden />
              ) : null}
            </div>
          </div>
        </SectionReveal>
        <div className={s.noteCont}>
          <SectionReveal once={true} enabled={isSection} from="left">
            <p className={s.ctaNote}>
              Konzultace je nezávazná a nepředstavuje investiční doporučení.
            </p>
          </SectionReveal>

          <SectionReveal
            once={true}
            enabled={isSection}
            from="left"
            start="top 100%"
          >
            <p className={s.privacyNote}>
              Správcem osobních údajů je SAB servis s.r.o. Údaje slouží pouze k
              domluvě úvodního hovoru.
            </p>
          </SectionReveal>
        </div>

        {status.state === "success" ? (
          <StatusToast
            state="success"
            message={status.message}
            duration={Infinity}
            actionLabel="Pokračovat"
            onAction={handleSuccessContinue}
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

export default LeadFormCard;
