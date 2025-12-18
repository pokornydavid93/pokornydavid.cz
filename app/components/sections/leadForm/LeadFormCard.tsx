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

export const leadFormTopics = [
  "Hypotéka & bydlení",
  "Finanční plán",
  "Investice a spoření",
  "Zajištění příjmu",
  "Pojištění vozidla",
  "Ochrana majetku",
  "Pojištění odpovědnosti",
  "Spotřebitelské a podnikatelské úvěry",
  "Jiná situace",
] as const;

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

const LeadFormCard = ({
  prefillTopic,
  variant = "section",
  onRequestClose,
}: LeadFormCardProps) => {
  const isSection = variant === "section";
  const topicOptions = useMemo(() => {
    if (prefillTopic && !leadFormTopics.includes(prefillTopic as typeof leadFormTopics[number])) {
      return [prefillTopic, ...leadFormTopics];
    }
    return [...leadFormTopics];
  }, [prefillTopic]);

  const defaultTopic = useMemo(
    () => prefillTopic ?? topicOptions[0],
    [prefillTopic, topicOptions],
  );

  const [selectedTopic, setSelectedTopic] = useState<string>(defaultTopic);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<StatusState>({ state: "idle" });
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
      window.addEventListener(event, handler, capture),
    );

    return () => {
      handlers.forEach(([event, handler, capture]) =>
        window.removeEventListener(event, handler, capture),
      );
    };
  }, [isOpen]);

  const toggleMenu = () =>
    setIsOpen((prev) => {
      const next = !prev;
      if (next) updateMenuPosition();
      return next;
    });

  const handleSelect = (value: string) => {
    resetStatus();
    setSelectedTopic(value);
    setIsOpen(false);
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
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

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 9) {
      nextErrors.phone = "Telefon musí mít 9 číslic.";
    }

    if (!selectedTopic) {
      nextErrors.topic = "Vyberte téma hovoru.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({ state: "error", message: "Zkontrolujte zvýrazněná pole." });
      return;
    }

    setErrors({});
    setStatus({ state: "submitting" });

    // Fake API call
    window.setTimeout(() => {
      const failed = Math.random() < 0.1;
      if (failed) {
        setStatus({
          state: "error",
          message:
            "Odeslání se nepovedlo. Zkuste to prosím znovu, nebo mě kontaktujte telefonicky.",
        });
        return;
      }

      setStatus({
        state: "success",
        message:
          "Na vaši e-mailovou adresu bylo posláno potvrzení o přijetí údajů.",
      });
    }, 900);
  };

  const resetStatus = () =>
    setStatus((prev) => (prev.state === "idle" ? prev : { state: "idle" }));

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

      <div className={`${s.formHead} ${isSection ? "reveal" : ""}`}>
        <p className={s.kicker}>Bez závazku, v klidu</p>
        <h2 className={s.title}>Probereme vaši situaci?</h2>
        <p className={s.subtitle}>
          Nechte na sebe kontakt a v klidu si projdeme vaši situaci. Bez
          závazků, bez nátlaku – jen jasnější představa, jak se posunout dál.
          Ozvu se vám nejpozději do 24 hodin.
        </p>
      </div>

      <form
        className={`${s.form} ${isSection ? "reveal" : ""}`.trim()}
        onSubmit={handleSubmit}
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
              <span className={s.phonePrefix}>+420</span>
              <input
                type="tel"
                name="phone"
                inputMode="tel"
                placeholder="731 830 897"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
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

        <label className={s.field}>
          <span className={s.fieldLabel}>
            E-mail <span className={s.required}>*</span>
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            placeholder="např. jana@seznam.cz"
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
              <span>{selectedTopic}</span>
              <span className={s.selectChevron} aria-hidden />
            </button>
            <input type="hidden" name="topic" value={selectedTopic} />

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
                  document.body,
                )
              : null}
            {errors.topic ? (
              <span className={s.errorText}>{errors.topic}</span>
            ) : null}
          </div>
        </label>

        <label className={s.field}>
          <div className={s.labelRow}>
            <span>Poznámka</span>
            <span className={s.optional}>Nepovinné</span>
          </div>
          <textarea
            name="note"
            rows={4}
            placeholder="Stručně napište, co chcete probrat."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              resetStatus();
            }}
          />
        </label>

        <div className={s.actions}>
          <Button
            type="submit"
            variant="cta"
            className={s.submitBtn}
            disabled={status.state === "submitting"}
            aria-busy={status.state === "submitting"}
          >
            {status.state === "submitting" ? (
              <span className={s.loader} aria-hidden />
            ) : null}
            {status.state === "submitting"
              ? "Odesílám…"
              : "Sjednat konzultaci"}
          </Button>
        </div>

        <p className={s.ctaNote}>
          Konzultace je nezávazná a nepředstavuje investiční doporučení.
        </p>

        <p className={s.privacyNote}>
          Správcem osobních údajů je SAB servis s.r.o. Údaje slouží pouze k
          domluvě úvodního hovoru. Pokud nevznikne spolupráce, budou do 6 měsíců
          smazány.
        </p>

        {status.state === "success" ? (
          <p className={s.statusSuccess}>{status.message}</p>
        ) : null}
        {status.state === "error" && status.message ? (
          <p className={s.statusError}>{status.message}</p>
        ) : null}
      </form>
    </div>
  );
};

export default LeadFormCard;
