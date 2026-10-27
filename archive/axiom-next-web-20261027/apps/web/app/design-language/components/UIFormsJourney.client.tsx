"use client";

import { RotateCcw, Send } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import Checkbox from "../../ui/forms/Checkbox";
import ErrorSummary, { type FieldError } from "../../ui/forms/ErrorSummary";
import SelectField from "../../ui/forms/SelectField";
import TextareaField from "../../ui/forms/TextareaField";
import TextField from "../../ui/forms/TextField";
import Button from "../../ui/primitives/Button";
import Notice from "../../ui/primitives/Notice";
import Surface from "../../ui/primitives/Surface";
import s from "./uiFormsFoundationPreview.module.css";

type JourneyState = "pristine" | "invalid" | "repairing" | "submitting" | "success" | "server-error";
type ResponseScenario = "success" | "server-error";

const journeySteps: ReadonlyArray<{ id: JourneyState; label: string }> = [
  { id: "pristine", label: "Pristine" },
  { id: "invalid", label: "Neplatný submit" },
  { id: "repairing", label: "Oprava" },
  { id: "submitting", label: "Submitting" },
  { id: "success", label: "Success" },
  { id: "server-error", label: "Server error" },
];

export default function UIFormsJourney() {
  const instanceId = useId().replaceAll(":", "");
  const ids = {
    name: `${instanceId}-journey-name`,
    email: `${instanceId}-journey-email`,
    message: `${instanceId}-journey-message`,
    consent: `${instanceId}-journey-consent`,
  };
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [focusKey, setFocusKey] = useState(0);
  const [journeyState, setJourneyState] = useState<JourneyState>("pristine");
  const [scenario, setScenario] = useState<ResponseScenario>("success");

  const errorFor = (fieldId: string) => errors.find((error) => error.fieldId === fieldId)?.message;
  const repair = (fieldId: string) => {
    setErrors((current) => current.filter((error) => error.fieldId !== fieldId));
    setJourneyState((current) => current === "invalid" ? "repairing" : current);
  };

  const resetJourney = (form?: HTMLFormElement | null) => {
    form?.reset();
    setErrors([]);
    setJourneyState("pristine");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const emailControl = form.elements.namedItem("email") as HTMLInputElement | null;
    const nextErrors: FieldError[] = [];

    if (!String(formData.get("name") ?? "").trim()) {
      nextErrors.push({ fieldId: ids.name, message: "Doplňte jméno." });
    }
    if (!email || !emailControl?.validity.valid) {
      nextErrors.push({ fieldId: ids.email, message: "Doplňte platný e-mail." });
    }
    if (!String(formData.get("message") ?? "").trim()) {
      nextErrors.push({ fieldId: ids.message, message: "Napište stručně, co chcete řešit." });
    }
    if (formData.get("consent") !== "on") {
      nextErrors.push({ fieldId: ids.consent, message: "Potvrďte souhlas se zpracováním údajů." });
    }

    setErrors(nextErrors);
    if (nextErrors.length > 0) {
      setJourneyState("invalid");
      setFocusKey((key) => key + 1);
      return;
    }

    setJourneyState("submitting");
    await new Promise((resolve) => window.setTimeout(resolve, 800));
    if (scenario === "server-error") {
      setJourneyState("server-error");
      return;
    }

    form.reset();
    setJourneyState("success");
  };

  return (
    <section className={s.labLayer} data-journey-state={journeyState} data-lab-layer="journey">
      <header className={s.layerIntro}>
        <span>Form Journey</span>
        <h3>Validace je cesta, ne statický screenshot</h3>
        <p>Pristine formulář přejde přes focusovaný souhrn chyb, opravu, submitting a zvolenou serverovou odpověď.</p>
      </header>

      <ol aria-label="Form journey states" className={s.journeyRail}>
        {journeySteps.map((step) => (
          <li aria-current={journeyState === step.id ? "step" : undefined} data-active={journeyState === step.id || undefined} key={step.id}>
            <span aria-hidden="true" />
            {step.label}
          </li>
        ))}
      </ol>

      <div className={s.journeyTools}>
        <span>Server response</span>
        <div aria-label="Server response scenario" className={s.segmentedControl} role="group">
          <button aria-pressed={scenario === "success"} data-active={scenario === "success" || undefined} onClick={() => setScenario("success")} type="button">Success</button>
          <button aria-pressed={scenario === "server-error"} data-active={scenario === "server-error" || undefined} onClick={() => setScenario("server-error")} type="button">Server error</button>
        </div>
      </div>

      <Surface as="div" className={s.journeySurface} surface="card-dark" tone="dark">
        <form className={s.formSpecimen} data-journey-form noValidate onSubmit={handleSubmit}>
          <ErrorSummary errors={errors} focusKey={focusKey} focusOnMount headingLevel="h4" />

          {journeyState === "success" ? (
            <Notice live="polite" title="Poptávka byla odeslána" tone="success">
              Děkuji. Ozvu se s návrhem dalšího kroku.
            </Notice>
          ) : null}
          {journeyState === "server-error" ? (
            <Notice live="assertive" title="Chyba odeslání" tone="error">
              Data zůstala ve formuláři. Zkontrolujte připojení a odešlete je znovu.
            </Notice>
          ) : null}

          <TextField
            autoComplete="name"
            error={errorFor(ids.name)}
            hint="Uveďte jméno, pod kterým vás mohu oslovit."
            id={ids.name}
            label="Jméno"
            name="name"
            onChange={() => repair(ids.name)}
            required
          />
          <TextField
            autoComplete="email"
            error={errorFor(ids.email)}
            hint="Například david@example.cz."
            id={ids.email}
            label="E-mail"
            name="email"
            onChange={() => repair(ids.email)}
            required
            type="email"
          />
          <SelectField autoComplete="off" defaultValue="overview" label="Hlavní téma" name="topic">
            <option value="overview">Celkový finanční přehled</option>
            <option value="mortgage">Hypotéka</option>
            <option value="investing">Investice</option>
          </SelectField>
          <TextareaField
            autoComplete="off"
            error={errorFor(ids.message)}
            hint="Stačí krátce popsat současnou situaci a očekávaný výsledek."
            id={ids.message}
            label="Co chcete vyřešit"
            name="message"
            onChange={() => repair(ids.message)}
            required
          />
          <Checkbox
            error={errorFor(ids.consent)}
            hint="Údaje použiji pouze pro odpověď na poptávku."
            id={ids.consent}
            name="consent"
            onChange={() => repair(ids.consent)}
            required
          >
            Souhlasím se zpracováním osobních údajů.
          </Checkbox>

          <div className={s.formActions}>
            <Button loading={journeyState === "submitting"} loadingLabel="Odesílám poptávku" startIcon={<Send />} type="submit">
              Odeslat poptávku
            </Button>
            <Button onClick={(event) => resetJourney(event.currentTarget.form)} startIcon={<RotateCcw />} type="button" variant="quiet">
              Začít znovu
            </Button>
          </div>
        </form>
      </Surface>
    </section>
  );
}
