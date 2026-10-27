"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { formPrivacyNotice } from "@/app/content/form-privacy";
import type { NormalizedIncomeTestInput } from "@/lib/income-test/contract";
import { trackIncomeTestEvent } from "@/lib/income-test/analytics.client";
import type { JourneyStep } from "@/lib/analytics/journey";
import {
  incomeTestContactErrors, incomeTestSubmissionIdentity,
  type IncomeTestContact as Contact, type IncomeTestRequestDraft,
  type IncomeTestSubmissionIdentity,
} from "@/lib/leads/income-test-request";
import s from "./incomeTest.module.css";

const submitErrors: Record<string, string> = {
  invalid: "Zkontrolujte kontaktní údaje a odešlete žádost znovu.",
  unavailable: "Odeslání se teď nepodařilo potvrdit. Zkuste to prosím znovu.",
  conflict: "Tuto žádost se nepodařilo potvrdit. Zavřete formulář a otevřete ho znovu. Rozepsaný test zůstane zachovaný.",
  "rate-limited": "Žádostí přišlo příliš mnoho najednou. Počkejte chvíli a zkuste odeslání znovu.",
};

type IncomeTestContactProps = (
  | { intent: "email_result"; input: NormalizedIncomeTestInput }
  | { intent: "callback"; input?: NormalizedIncomeTestInput }
) & { onClose: () => void; originStep: Exclude<JourneyStep, "contact" | "page"> };

export default function IncomeTestContact({ intent, input, onClose, originStep }: IncomeTestContactProps) {
  const callback = intent === "callback";
  const earlyCallback = callback && input === undefined;
  const [contact, setContact] = useState<Contact>({ name: "", email: "", ...(callback ? { phone: "", preferredCallTime: "", note: "" } : {}) });
  const [errors, setErrors] = useState<Partial<Record<keyof Contact, string>>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const identity = useRef<IncomeTestSubmissionIdentity | null>(null);
  const activeRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    heading.current?.closest("section")?.scrollIntoView({ block: "start", behavior: "instant" });
    return () => { activeRequest.current?.abort(); };
  }, []);

  function change(name: keyof Contact, value: string) {
    setContact((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (activeRequest.current) return;
    const fieldErrors = incomeTestContactErrors(contact, intent);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      trackIncomeTestEvent("contact_validation_failed", originStep);
      const invalidField = document.getElementById(`income-contact-${Object.keys(fieldErrors)[0]}`);
      invalidField?.closest("details")?.setAttribute("open", "");
      invalidField?.focus();
      return;
    }
    setError("");
    const common = { ...contact, privacyNoticeVersion: formPrivacyNotice.version };
    const request: IncomeTestRequestDraft = intent === "email_result"
      ? { ...common, intent, calculation: input }
      : { ...common, intent, ...(input ? { calculation: input } : {}) };
    identity.current = incomeTestSubmissionIdentity(identity.current, request);
    if (Date.now() - Date.parse(identity.current.submittedAt) >= 30 * 60_000) {
      setError("Platnost tohoto pokusu vypršela. Zavřete formulář a otevřete ho znovu. Rozepsaný test zůstane zachovaný.");
      return;
    }
    const controller = new AbortController();
    activeRequest.current = controller;
    setPending(true);
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 25_000);
    try {
      const response = await fetch("/api/income-test/", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin",
        body: JSON.stringify({ ...request, requestId: identity.current.requestId, submittedAt: identity.current.submittedAt }),
        signal: controller.signal,
      });
      const result: unknown = await response.json();
      if (typeof result !== "object" || result === null) throw new Error("invalid-response");
      const payload = result as Record<string, unknown>;
      if (response.ok && payload.status === "accepted" && typeof payload.receiptId === "string" && payload.receiptId.length > 0 && payload.intent === intent && (payload.delivery === "queued" || payload.delivery === "accepted")) {
        setAccepted(true);
        trackIncomeTestEvent(callback ? "callback_requested" : "email_result_requested", originStep);
        requestAnimationFrame(() => heading.current?.focus());
      } else {
        setError(submitErrors[typeof payload.reason === "string" ? payload.reason : "unavailable"] ?? submitErrors.unavailable);
        trackIncomeTestEvent("submission_failed", originStep);
      }
    } catch {
      if (!controller.signal.aborted || timedOut) {
        setError(submitErrors.unavailable);
        trackIncomeTestEvent("submission_failed", originStep);
      }
    } finally {
      clearTimeout(timeout);
      if (activeRequest.current === controller) activeRequest.current = null;
      setPending(false);
    }
  }

  function textField(name: "name" | "email" | "phone", label: string, type: "text" | "email" | "tel", autoComplete: string) {
    return <div className={s.field}>
      <label className={s.label} htmlFor={`income-contact-${name}`}>{label}</label>
      <input className={s.input} id={`income-contact-${name}`} name={name} type={type} autoComplete={autoComplete}
        required spellCheck={false} autoCapitalize={name === "email" ? "none" : undefined} value={contact[name] ?? ""} onChange={(event) => change(name, event.target.value)}
        maxLength={name === "name" ? 80 : name === "email" ? 254 : 40}
        aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `income-contact-${name}-error` : undefined} />
      {errors[name] ? <p className={s.error} id={`income-contact-${name}-error`} aria-live="polite">{errors[name]}</p> : null}
    </div>;
  }

  return <section data-journey-section="contact" id="income-contact" className={s.contact} aria-labelledby="income-contact-title">
    {accepted ? <div className={s.success} role="status">
      <CheckCircle2 aria-hidden="true" />
      <div>
        <h2 className={s.contactHeading} id="income-contact-title" ref={heading} tabIndex={-1}>{callback ? "Děkuji za zprávu." : "Děkuji, žádost o výsledek jsem přijal."}</h2>
        <p>{earlyCallback ? "Ozvu se vám, abychom probrali vaši situaci a domluvili další krok." : callback ? "Ozvu se vám, abychom prošli výsledek a domluvili další krok." : "Souhrn vám pošlu na zadaný e-mail. Pokud ho nenajdete v doručené poště, podívejte se také do hromadné pošty a spamu."}</p>
        <button type="button" className={s.backButton} onClick={onClose} data-journey-cta="contact_close" data-journey-placement="contact">{earlyCallback ? "Zpět k testu" : "Zpět k výsledku"}</button>
      </div>
    </div> : <>
      <div className={s.contactTop}>
        <h2 className={s.contactHeading} id="income-contact-title" ref={heading} tabIndex={-1}>{earlyCallback ? "Probrat moji situaci" : callback ? "Domluvit úvodní hovor" : "Pošlu vám výsledek e-mailem."}</h2>
        <button type="button" className={s.editLink} disabled={pending} onClick={onClose} data-journey-cta="contact_close" data-journey-placement="contact">{earlyCallback ? "Zpět k testu" : "Zavřít formulář"}</button>
      </div>
      <p className={s.contactIntro}>{earlyCallback ? "Nechte mi na sebe kontakt. Probereme, co právě řešíte, a společně najdeme další krok. K testu se můžete vrátit na této stránce." : callback ? "Nechte mi na sebe kontakt. Společně projdeme, co výsledek znamená pro vaši domácnost a jaké možnosti stojí za ověření." : "Pošlu vám souhrn zadaných částek, obou variant a výdrže rezervy. Odesláním nežádáte o telefonát ani se nepřihlašujete k newsletteru."}</p>
      <form onSubmit={submit} noValidate>
        <fieldset className={s.fieldset} disabled={pending}>
          <legend className={s.srOnly}>{callback ? "Kontakt pro žádost o zavolání" : "Kontakt pro odeslání výsledku"}</legend>
          <div className={s.contactFields}>
            {textField("name", "Jméno a příjmení", "text", "name")}
            {textField("email", "E-mail", "email", "email")}
            {callback ? textField("phone", "Telefon", "tel", "tel") : null}
          </div>
          {callback ? <details className={s.contactOptional}>
            <summary>Doplnit čas nebo poznámku (nepovinné)</summary>
            <div className={s.contactFields}>
              <div className={s.field}>
                <label className={s.label} htmlFor="income-contact-preferredCallTime">Kdy se vám hodí zavolat <span className={s.optional}>(nepovinné)</span></label>
                <select className={s.select} id="income-contact-preferredCallTime" name="preferredCallTime" value={contact.preferredCallTime ?? ""} onChange={(event) => change("preferredCallTime", event.target.value)}>
                  <option value="">Vyberte čas</option><option value="morning">Dopoledne</option><option value="afternoon">Odpoledne</option><option value="evening">Podvečer</option><option value="any">Bez preference</option>
                </select>
                <p className={s.hint}>Konkrétní termín si společně domluvíme.</p>
              </div>
              <div className={`${s.field} ${s.fullField}`}>
                <label className={s.label} htmlFor="income-contact-note">Co chcete doplnit <span className={s.optional}>(nepovinné)</span></label>
                <textarea className={s.textarea} id="income-contact-note" name="note" maxLength={500} value={contact.note ?? ""} onChange={(event) => change("note", event.target.value)} aria-invalid={Boolean(errors.note)} aria-describedby={`income-contact-note-hint${errors.note ? " income-contact-note-error" : ""}`} />
                <p className={s.hint} id="income-contact-note-hint">Nejvýše 500 znaků. Nepište sem rodná čísla, čísla účtů ani zdravotní údaje.</p>
                {errors.note ? <p className={s.error} id="income-contact-note-error" aria-live="polite">{errors.note}</p> : null}
              </div>
            </div>
          </details> : null}
        </fieldset>
        <p className={s.consent}>{earlyCallback ? "Odesláním mě žádáte o zavolání k vaší situaci. Váš kontakt a případnou zprávu použiji k vyřízení této žádosti. Rozepsané částky z testu se neodesílají." : callback ? "Odesláním mě žádáte o zavolání k výsledku testu. Váš kontakt, zadané částky a výsledek použiji k vyřízení této žádosti." : "Odesláním mě žádáte o zaslání výsledku e-mailem. Vaše jméno, e-mail, zadané částky a výsledek použiji k vyřízení této žádosti."} <Link href={formPrivacyNotice.detailHref}>Jak nakládám s údaji</Link></p>
        {error ? <p className={s.formError} role="alert">{error}</p> : null}
        <div className={s.actions}><button className={s.primary} type="submit" disabled={pending} data-journey-cta="contact_submit" data-journey-placement="contact">{pending ? "Odesílám žádost…" : callback ? "Požádat o zavolání" : "Poslat výsledek e-mailem"}{!pending ? <ArrowRight aria-hidden="true" /> : null}</button></div>
      </form>
    </>}
  </section>;
}
