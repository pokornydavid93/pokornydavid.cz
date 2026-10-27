"use client";

import { Send } from "lucide-react";
import { useId, useState, useSyncExternalStore, type FormEvent } from "react";
import Button from "../primitives/Button";
import Link from "../primitives/Link";
import Notice from "../primitives/Notice";
import { formPrivacyNotice } from "../../content/form-privacy";
import ErrorSummary, { type FieldError } from "../forms/ErrorSummary";
import SelectField from "../forms/SelectField";
import TextareaField from "../forms/TextareaField";
import TextField from "../forms/TextField";
import s from "./domain.module.css";

export type EnquiryPayload = {
  name: string;
  email: string;
  topic: string;
  message: string;
  privacyNoticeVersion: string;
};

export type EnquiryFormProps = {
  preset?: "lead" | "contact";
  initialTopic?: string;
  onSubmit?: (payload: EnquiryPayload) => void | Promise<void>;
  privacyHref?: string;
};

type SubmissionState = "idle" | "invalid" | "submitting" | "success" | "error";

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function EnquiryForm({
  initialTopic = "overview",
  onSubmit,
  preset = "lead",
  privacyHref = "/zasady-zpracovani-osobnich-udaju",
}: EnquiryFormProps) {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const instanceId = useId().replaceAll(":", "");
  const ids = {
    name: `${instanceId}-name`,
    email: `${instanceId}-email`,
    topic: `${instanceId}-topic`,
    message: `${instanceId}-message`,
  };
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [state, setState] = useState<SubmissionState>("idle");
  const [submitAttempt, setSubmitAttempt] = useState(0);

  const errorFor = (fieldId: string) => errors.find((error) => error.fieldId === fieldId)?.message;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload: EnquiryPayload = {
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      topic: String(formData.get("topic") ?? ""),
      message: String(formData.get("message") ?? "").trim(),
      privacyNoticeVersion: formPrivacyNotice.version,
    };
    const nextErrors: FieldError[] = [];
    const emailControl = form.elements.namedItem("email") as HTMLInputElement | null;

    if (!payload.name) nextErrors.push({ fieldId: ids.name, message: "Doplňte jméno." });
    if (!payload.email || !emailControl?.validity.valid) {
      nextErrors.push({ fieldId: ids.email, message: "Doplňte platný e-mail." });
    }
    if (!payload.message) nextErrors.push({ fieldId: ids.message, message: "Napište stručně, co chcete řešit." });

    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      setState("invalid");
      setSubmitAttempt((attempt) => attempt + 1);
      return;
    }

    setState("submitting");
    try {
      await onSubmit?.(payload);
      form.reset();
      setState("success");
    } catch {
      setState("error");
    }
  };

  return (
    <form
      className={s.enquiryForm}
      data-component="enquiry-form"
      data-hydrated={hydrated ? "true" : "false"}
      data-preset={preset}
      data-state={state}
      noValidate
      onSubmit={handleSubmit}
    >
      <ErrorSummary
        errors={errors}
        focusKey={submitAttempt}
        focusOnMount
        headingLevel="h3"
      />
      {state === "success" ? (
        <Notice live="polite" title="Poptávka je připravená" tone="success">
          Děkuji. Navazující zpracování může nyní převzít route integrace.
        </Notice>
      ) : null}
      {state === "error" ? (
        <Notice live="assertive" title="Poptávku se nepodařilo odeslat" tone="error">
          Zkontrolujte připojení a odešlete formulář znovu.
        </Notice>
      ) : null}

      <TextField
        autoComplete="name"
        error={errorFor(ids.name)}
        hint="Uveďte jméno, pod kterým vás mohu oslovit."
        id={ids.name}
        label="Jméno"
        name="name"
        required
      />
      <TextField
        autoComplete="email"
        error={errorFor(ids.email)}
        hint="Například david@example.cz."
        id={ids.email}
        label="E-mail"
        name="email"
        required
        type="email"
      />

      <SelectField
        autoComplete="off"
        defaultValue={initialTopic}
        id={ids.topic}
        label="Téma"
        name="topic"
      >
          <option value="overview">Celkový finanční přehled</option>
          <option value="mortgage">Hypotéka</option>
          <option value="investing">Investice</option>
          <option value="protection">Ochrana příjmu</option>
      </SelectField>

      <TextareaField
        autoComplete="off"
        error={errorFor(ids.message)}
        hint="Stačí krátce popsat současnou situaci a očekávaný výsledek."
        id={ids.message}
        label="Co chcete vyřešit"
        name="message"
        required
      />

      <p data-form-privacy-notice={formPrivacyNotice.version}>
        {formPrivacyNotice.leadText}{" "}
        <Link href={privacyHref} variant="text">Jak zpracovávám osobní údaje</Link>
      </p>

      <Button loading={state === "submitting"} startIcon={<Send />} type="submit">
        {preset === "contact" ? "Odeslat zprávu" : "Domluvit konzultaci"}
      </Button>
    </form>
  );
}
