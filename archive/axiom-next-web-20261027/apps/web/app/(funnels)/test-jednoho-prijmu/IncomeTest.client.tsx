"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Check, LockKeyhole, Mail, Phone } from "lucide-react";
import { cnbRegistryUrl } from "@/app/content/multipage";
import {
  INCOME_TEST_MAX_MONTHLY_AMOUNT,
  INCOME_TEST_MAX_RESERVE,
  INCOME_TEST_TARGET_MONTHS,
  validateIncomeTestInput,
  type IncomeTestInputField,
  type IncomeTestScenario,
  type IncomeTestValidationErrors,
  type NormalizedIncomeTestInput,
} from "@/lib/income-test/contract";
import { calculateIncomeTest } from "@/lib/income-test/calculation";
import { startIncomeTestJourney, trackIncomeTestEvent } from "@/lib/income-test/analytics.client";
import { safeJourneyStep } from "@/lib/analytics/journey.client";
import IncomeTestContact from "./IncomeTestContact.client";
import AdvisorPortrait from "./AdvisorPortrait";
import s from "./incomeTest.module.css";

type AmountField = Exclude<IncomeTestInputField, "targetMonths">;
type AmountDraft = Record<AmountField, string>;
type ContactIntent = "email_result" | "callback";
const numberFormat = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 });
const monthFormat = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 1 });
const subscribeToHydration = () => () => {};
const clientHydrated = () => true;
const serverHydrated = () => false;
const emptyDraft: AmountDraft = {
  incomeA: "", incomeB: "", mortgagePayment: "", essentialCosts: "", reserve: "",
  remainingIncomeA: "0", remainingIncomeB: "0",
};
const steps = [
  { title: "Začněme vašimi příjmy", label: "Příjmy", intro: "Zadejte dvě čisté měsíční výplaty nebo jiné pravidelné příjmy domácnosti. Stačí zaokrouhlený odhad." },
  { title: "Kolik měsíčně potřebujete?", label: "Výdaje", intro: "Odhadněte splátku hypotéky a ostatní nutné výdaje zvlášť. Přesné částky teď dohledávat nemusíte." },
  { title: "Jakou máte rezervu?", label: "Rezerva", intro: "Odhadněte peníze dostupné pro výpadek příjmu." },
] as const;
const stepFields: AmountField[][] = [["incomeA", "incomeB"], ["mortgagePayment", "essentialCosts"], ["reserve"]];

function money(value: number): string { return `${numberFormat.format(value)} Kč`; }
function signedMoney(value: number): string { return `${value > 0 ? "+" : ""}${money(value)}`; }
function parseMoney(value: string): number | undefined {
  const normalized = value.trim().replace(/[\s\u00a0\u202f]/g, "");
  return /^\d+$/.test(normalized) && Number.isSafeInteger(Number(normalized)) ? Number(normalized) : undefined;
}
function amountError(field: AmountField, value: string): string | undefined {
  const amount = parseMoney(value);
  if (amount === undefined) return value.trim() ? "Zadejte částku v celých korunách, nejméně 0 Kč." : "Doplňte částku. Pokud žádná není, napište 0.";
  const maximum = field === "reserve" ? INCOME_TEST_MAX_RESERVE : INCOME_TEST_MAX_MONTHLY_AMOUNT;
  return amount > maximum ? `Zadejte částku nejvýše ${money(maximum)}.` : undefined;
}
function focusById(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}

function MoneyField({ name, label, hint, value, error, onChange, prefix = "income" }: {
  name: AmountField; label: string; hint: string; value: string; error?: string;
  onChange: (name: AmountField, value: string) => void; prefix?: string;
}) {
  const id = `${prefix}-${name}`;
  return <div className={s.field}>
    <label className={s.label} htmlFor={id}>{label}</label>
    <div className={s.inputWrap}>
      <input className={s.input} id={id} type="text" inputMode="numeric" autoComplete="off" required
        value={value} maxLength={20} placeholder="Zadejte částku…" aria-invalid={Boolean(error)}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        onChange={(event) => onChange(name, event.target.value)}
        onBlur={() => { const parsed = parseMoney(value); if (parsed !== undefined) onChange(name, numberFormat.format(parsed)); }} />
      <span className={s.unit} aria-hidden="true">Kč</span>
    </div>
    <p className={s.hint} id={`${id}-hint`}>{hint}</p>
    {error ? <p className={s.error} id={`${id}-error`} aria-live="polite">{error}</p> : null}
  </div>;
}

function Scenario({ letter, scenario, input }: { letter: "A" | "B"; scenario: IncomeTestScenario; input: NormalizedIncomeTestInput }) {
  const changed = letter === "A" ? input.remainingIncomeA : input.remainingIncomeB;
  const original = letter === "A" ? input.incomeA : input.incomeB;
  const retained = letter === "A" ? input.incomeB : input.incomeA;
  const noDeficit = scenario.reserveMonths === null;
  const reserveMonths = scenario.reserveMonths;
  const ratio = reserveMonths === null ? 1 : Math.min(1, reserveMonths / input.targetMonths);
  const monthsText = reserveMonths === null ? "" : reserveMonths > 999 ? "999+" : reserveMonths > 0 && reserveMonths < 0.1 ? "< 0,1" : monthFormat.format(reserveMonths);
  return <article className={s.scenario} aria-labelledby={`scenario-${letter}-title`} data-income-scenario={letter}>
    <p className={s.scenarioKicker}>Varianta {letter}</p>
    <h3 id={`scenario-${letter}-title`}>{changed === 0 ? `Vypadne příjem ${letter}` : `Sníží se příjem ${letter}`}</h3>
    <p className={s.scenarioSub}>{money(original)} → {money(changed)}. Druhý příjem zůstává {money(retained)}.</p>
    {noDeficit ? <p className={s.noDeficitLabel}><Check aria-hidden="true" /> Bez měsíčního schodku</p> : null}
    <div className={s.scenarioMain} data-no-deficit={noDeficit}>
      <strong>{noDeficit ? money(scenario.remainingBalance) : monthsText}</strong>{!noDeficit ? <span>{monthsText === "1" ? "měsíc" : ["2", "3", "4"].includes(monthsText) || monthsText.includes(",") ? "měsíce" : "měsíců"}</span> : null}
    </div>
    <p className={s.scenarioCaption}>{noDeficit ? "Měsíčně vám zbývá" : "Tak dlouho rezerva pokrývá měsíční schodek"}</p>
    {!noDeficit ? <div className={s.timeline} role="img" aria-label={`Rezerva pokryje ${monthFormat.format(Math.min(reserveMonths ?? 0, input.targetMonths))} ze zvolených ${input.targetMonths} měsíců.`}>
      <div className={s.timelineTrack} aria-hidden="true">
        <div className={s.timelineFill} style={{ transform: `scaleX(${ratio})` }} />
        <div className={s.timelineTicks}>{Array.from({ length: input.targetMonths }, (_, index) => <span key={index} />)}</div>
      </div>
      <div className={s.timelineLabels} aria-hidden="true"><span>Dnes</span><span>Váš horizont: {input.targetMonths} měsíců</span></div>
    </div> : null}
    {!noDeficit ? <dl className={s.scenarioDetails}>
      <div><dt>{scenario.remainingBalance < 0 ? "Měsíčně chybí" : "Měsíčně zbývá"}</dt><dd>{money(Math.abs(scenario.remainingBalance))}</dd></div>
      <div><dt>Rezerva na {input.targetMonths} {input.targetMonths === 3 ? "měsíce" : "měsíců"}</dt><dd>{money(scenario.requiredReserve)}</dd></div>
      <div><dt>K této rezervě chybí</dt><dd>{money(scenario.reserveGap)}</dd></div>
    </dl> : null}
    <p className={s.scenarioMeaning}>{noDeficit
      ? `Na zadané výdaje rezervu nečerpáte. Vašich ${money(input.reserve)} zůstává k dispozici pro další nečekané situace.`
      : scenario.targetCovered
        ? `Zadaná rezerva pokrývá tento schodek po dobu ${input.targetMonths} měsíců. Výpočet nezahrnuje další nečekaný výdaj.`
        : `Na pokrytí stejného schodku po dobu ${input.targetMonths} měsíců by bylo potřeba doplnit ${money(scenario.reserveGap)}.`}</p>
  </article>;
}

function Adjustments({ input, onApply }: { input: NormalizedIncomeTestInput; onApply: (next: NormalizedIncomeTestInput) => void }) {
  const [draft, setDraft] = useState<AmountDraft>(() => ({
    incomeA: String(input.incomeA), incomeB: String(input.incomeB),
    mortgagePayment: numberFormat.format(input.mortgagePayment), essentialCosts: String(input.essentialCosts),
    reserve: numberFormat.format(input.reserve), remainingIncomeA: numberFormat.format(input.remainingIncomeA), remainingIncomeB: numberFormat.format(input.remainingIncomeB),
  }));
  const [errors, setErrors] = useState<IncomeTestValidationErrors>({});
  function change(name: AmountField, value: string) { setDraft((current) => ({ ...current, [name]: value })); setErrors((current) => ({ ...current, [name]: undefined })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    const keys: AmountField[] = ["mortgagePayment", "reserve", "remainingIncomeA", "remainingIncomeB"];
    const fieldErrors: IncomeTestValidationErrors = {};
    for (const key of keys) { const error = amountError(key, draft[key]); if (error) fieldErrors[key] = error; }
    const next = validateIncomeTestInput({ ...input, ...Object.fromEntries(keys.map((key) => [key, parseMoney(draft[key])])) });
    if (!next.success) Object.assign(fieldErrors, next.errors);
    if (Object.keys(fieldErrors).length) { setErrors(fieldErrors); focusById(`adjust-${Object.keys(fieldErrors)[0]}`); return; }
    if (next.success) { onApply(next.data); focusById("income-result-title"); }
  }
  return <details className={s.adjustments}>
    <summary data-journey-cta="adjust_open" data-journey-placement="adjustments">Vyzkoušet jinou variantu</summary>
    <p className={s.adjustIntro}>Změňte splátku nebo rezervu. Pokud by při výpadku dál přicházela část příjmu, například nemocenská nebo rodičovský příspěvek, doplňte ji do příslušné varianty. Oba výpadky stále počítáme zvlášť.</p>
    <form onSubmit={submit} noValidate>
      <div className={s.adjustFields}>
        <MoneyField prefix="adjust" name="mortgagePayment" label="Splátka hypotéky" hint="Ostatní nutné výdaje zůstávají stejné." value={draft.mortgagePayment} error={errors.mortgagePayment} onChange={change} />
        <MoneyField prefix="adjust" name="reserve" label="Dostupná rezerva" hint="Peníze, které můžete na výpadek použít." value={draft.reserve} error={errors.reserve} onChange={change} />
        <MoneyField prefix="adjust" name="remainingIncomeA" label="Kolik by zůstalo z příjmu A" hint={`Z původních ${money(input.incomeA)} měsíčně. Pro úplný výpadek ponechte 0.`} value={draft.remainingIncomeA} error={errors.remainingIncomeA} onChange={change} />
        <MoneyField prefix="adjust" name="remainingIncomeB" label="Kolik by zůstalo z příjmu B" hint={`Z původních ${money(input.incomeB)} měsíčně. Pro úplný výpadek ponechte 0.`} value={draft.remainingIncomeB} error={errors.remainingIncomeB} onChange={change} />
      </div>
      {errors.form ? <p className={s.formError} role="alert">{errors.form}</p> : null}
      <div className={s.actions}><button className={s.secondary} type="submit" data-journey-cta="adjust_apply" data-journey-placement="adjustments">Přepočítat varianty <ArrowRight aria-hidden="true" /></button></div>
    </form>
  </details>;
}

export default function IncomeTest() {
  const hydrated = useSyncExternalStore(subscribeToHydration, clientHydrated, serverHydrated);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<AmountDraft>(emptyDraft);
  const [targetMonths, setTargetMonths] = useState<3 | 6 | 12>(6);
  const [errors, setErrors] = useState<IncomeTestValidationErrors>({});
  const [input, setInput] = useState<NormalizedIncomeTestInput | null>(null);
  const [intent, setIntent] = useState<ContactIntent | null>(null);
  const started = useRef(false);
  const initialMount = useRef(true);
  const contactTrigger = useRef("income-early-callback-action");
  const hasResult = input !== null;

  useEffect(() => {
    const measurement = startIncomeTestJourney(() => safeJourneyStep(document.querySelector("[data-journey-step]")?.getAttribute("data-journey-step")) ?? "income");
    return measurement.stop;
  }, []);

  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    focusById(hasResult ? "income-result-title" : "income-step-title");
  }, [step, hasResult]);

  function openCallback(triggerId: string) {
    contactTrigger.current = triggerId;
    setIntent("callback");
    trackIncomeTestEvent(input ? "callback_opened_result" : (["callback_opened_income", "callback_opened_budget", "callback_opened_reserve"] as const)[step]);
  }
  function closeCallback() {
    setIntent(null);
    focusById(contactTrigger.current);
  }

  function change(name: AmountField, value: string) {
    if (!started.current) started.current = trackIncomeTestEvent("test_started");
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    const nextErrors: IncomeTestValidationErrors = {};
    for (const name of stepFields[step]) { const error = amountError(name, draft[name]); if (error) nextErrors[name] = error; }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors); focusById(`income-${Object.keys(nextErrors)[0]}`); return;
    }
    setErrors({});
    if (step < 2) {
      trackIncomeTestEvent(step === 0 ? "step_completed_income" : "step_completed_budget");
      setStep(step + 1); return;
    }
    const checked = validateIncomeTestInput({ ...Object.fromEntries(Object.entries(draft).map(([name, value]) => [name, parseMoney(value)])), targetMonths });
    if (!checked.success) { setErrors(checked.errors); return; }
    setInput(checked.data); trackIncomeTestEvent("result_viewed");
  }
  function editAll() {
    setDraft((current) => ({ ...current, remainingIncomeA: "0", remainingIncomeB: "0" }));
    setInput(null); setIntent(null); setStep(0); setErrors({});
  }
  function apply(next: NormalizedIncomeTestInput) {
    setInput(next); setIntent(null);
    setDraft((current) => ({ ...current, mortgagePayment: numberFormat.format(next.mortgagePayment), reserve: numberFormat.format(next.reserve), remainingIncomeA: numberFormat.format(next.remainingIncomeA), remainingIncomeB: numberFormat.format(next.remainingIncomeB) }));
  }

  if (intent === "callback" && !input) {
    return <section className={s.earlyContact} aria-labelledby="income-direct-contact-title" data-income-early-contact data-journey-step="contact">
      <div className={s.earlyContactIntro}>
        <p className={s.eyebrow}>Nemusíte nejdřív dokončit test</p>
        <h1 id="income-direct-contact-title">Proberme vaši situaci.</h1>
        <div className={s.heroPerson}>
          <AdvisorPortrait compact />
          <div><p>Jsem David Pokorný.</p><span>Proberu s vámi splátku, výdaje a rezervu. Společně určíme, čím začít.</span></div>
        </div>
        <p className={s.earlyContactNote}>Rozpracované částky zůstávají v tomto testu. Když se k němu vrátíte, můžete pokračovat tam, kde jste skončili.</p>
      </div>
      <IncomeTestContact intent="callback" originStep={(["income", "budget", "reserve"] as const)[step]} onClose={closeCallback} />
    </section>;
  }

  if (input) {
    const result = calculateIncomeTest(input);
    const noDeficit = result.scenarioA.reserveMonths === null && result.scenarioB.reserveMonths === null;
    const covered = result.scenarioA.targetCovered && result.scenarioB.targetCovered;
    const resultTitle = noDeficit ? "V obou variantách výdaje pokryjete."
      : covered ? "Rezerva pokryje zvolené období."
        : "Rezerva nepokryje celé zvolené období.";
    return <section className={s.result} aria-labelledby="income-result-title" data-income-test-result data-journey-step={intent ? "contact" : "result"}>
      <div className={s.resultTop} data-journey-section="result">
        <div>
          <p className={s.eyebrow}>Váš výsledek · období {input.targetMonths} {input.targetMonths === 3 ? "měsíce" : "měsíců"}</p>
          <h1 className={s.resultHeading} id="income-result-title" tabIndex={-1}>{resultTitle}</h1>
          <p className={s.resultIntro}>{noDeficit
            ? "Podle zadaných částek v žádné z variant nevzniká měsíční schodek. Podívejte se, kolik vám zůstává."
            : covered ? "Podle zadaných částek zvládnete oba scénáře po zvolenou dobu. Níže vidíte, jakou část rezervy byste potřebovali."
              : "Alespoň v jedné variantě by vám rezerva došla dříve. Níže vidíte měsíční rozdíl a částku, která by ho pokryla."}</p>
          <button id="income-result-callback-action" data-journey-cta="callback_open" data-journey-placement="result_top" type="button" className={`${s.helpLink} ${s.resultContactLink}`} aria-expanded={intent === "callback"} aria-controls={intent === "callback" ? "income-contact" : undefined} onClick={() => openCallback("income-result-callback-action")}><Phone aria-hidden="true" /> Probrat můj výsledek <ArrowRight aria-hidden="true" /></button>
        </div>
        <button className={s.editLink} type="button" onClick={editAll} data-journey-cta="edit_all" data-journey-placement="result_top">Upravit všechny údaje</button>
      </div>
      <fieldset className={s.resultPeriod}>
        <legend className={s.label}>Období pro porovnání</legend>
        <div className={s.choices}>{INCOME_TEST_TARGET_MONTHS.map((months) => <label className={s.choice} key={months}>
          <input type="radio" name="targetMonths" value={months} checked={input.targetMonths === months}
            onChange={() => { setTargetMonths(months); setInput({ ...input, targetMonths: months }); setIntent(null); }} />
          <span>{months} {months === 3 ? "měsíce" : "měsíců"}</span>
        </label>)}</div>
      </fieldset>
      <div className={s.currentBudget}><p>Se dvěma příjmy vám po zadaných výdajích měsíčně {result.todayBalance < 0 ? "chybí" : "zbývá"}</p><strong>{result.todayBalance < 0 ? money(Math.abs(result.todayBalance)) : signedMoney(result.todayBalance)}</strong></div>
      <h2 className={s.srOnly}>Dva možné výpadky příjmu</h2>
      <div className={s.scenarioGrid}><Scenario letter="A" scenario={result.scenarioA} input={input} /><Scenario letter="B" scenario={result.scenarioB} input={input} /></div>
      <p className={s.resultNote}>Každá varianta počítá s výpadkem jednoho příjmu; druhý zůstává stejný. Vaše dostupná rezerva je {money(input.reserve)}, splátka {money(input.mortgagePayment)} a ostatní nutné výdaje {money(input.essentialCosts)} měsíčně. Výdrž je orientační, zaokrouhlená na desetinu měsíce.</p>
      <section className={s.consultation} aria-labelledby="income-consultation-title" data-income-consultation data-journey-section="consultation">
        <div className={s.consultationPerson}>
          <AdvisorPortrait />
          <div><p className={s.eyebrow}>Jsem David Pokorný</p><p className={s.personRole}>Finanční poradce</p></div>
        </div>
        <div className={s.consultationCopy}>
          <p className={s.eyebrow}>Váš další krok</p>
          <h2 id="income-consultation-title">Projděme váš výsledek společně.</h2>
          <p>{noDeficit
            ? "Rozpočet v testu vychází. Projdu s vámi, zda v něm nechybí důležité výdaje a s jakou rezervou má smysl dál počítat."
            : covered
              ? "Rezerva podle testu pokryje zvolené období. Proberu s vámi, co by se změnilo při delším výpadku nebo dalších výdajích."
              : "Podívám se s vámi, jak velký rozdíl potřebujete pokrýt a jaké možnosti připadají ve vaší situaci v úvahu."}</p>
          <ul className={s.consultationBenefits}>
            <li><Check aria-hidden="true" /> Projdeme vaši splátku, výdaje a rezervu.</li>
            <li><Check aria-hidden="true" /> Ujasníme si, co má smysl řešit jako první.</li>
          </ul>
          <button id="income-callback-action" data-journey-cta="callback_open" data-journey-placement="consultation" type="button" className={s.primary} aria-expanded={intent === "callback"} aria-controls={intent === "callback" ? "income-contact" : undefined} onClick={() => openCallback("income-callback-action")}><Phone aria-hidden="true" /> Domluvit úvodní hovor <ArrowRight aria-hidden="true" /></button>
          <p className={s.callExpectation}>Nechte mi kontakt. Ozvu se vám a navážu na váš výsledek.</p>
        </div>
        <p className={s.professionalProof}>Působím jako vázaný zástupce společnosti SAB servis s.r.o. <a href={cnbRegistryUrl} data-journey-cta="advisor_registry" data-journey-placement="consultation" target="_blank" rel="noopener noreferrer">Ověřit můj zápis v ČNB <ArrowUpRight aria-hidden="true" /></a></p>
      </section>
      {intent === "callback" ? <IncomeTestContact key={`callback:${JSON.stringify(input)}`} intent="callback" originStep="result" input={input} onClose={closeCallback} /> : null}
      <div className={s.emailAlternative}>
        <div><h2>Chcete si výsledek nejdřív v klidu projít?</h2><p>Pošlu vám souhrn e-mailem. O telefonát tím nežádáte.</p></div>
        <button id="income-email-action" data-journey-cta="email_result_open" data-journey-placement="result_email" type="button" className={s.emailLink} aria-expanded={intent === "email_result"} aria-controls={intent === "email_result" ? "income-contact" : undefined} onClick={() => setIntent("email_result")}><Mail aria-hidden="true" /> Poslat výsledek e-mailem <ArrowRight aria-hidden="true" /></button>
      </div>
      {intent === "email_result" ? <IncomeTestContact key={`email_result:${JSON.stringify(input)}`} intent="email_result" originStep="result" input={input} onClose={() => { setIntent(null); focusById("income-email-action"); }} /> : null}
      <Adjustments input={input} onApply={apply} />
    </section>;
  }

  return <div className={s.introLayout} data-journey-step={(["income", "budget", "reserve"] as const)[step]}>
    <div className={s.intro} data-journey-section="intro">
      <p className={s.eyebrow}>Test jednoho příjmu</p>
      <h1>Utáhnete hypotéku<span> i z jedné výplaty?</span></h1>
      <p className={s.lead}>Ukážu vám, kolik by při výpadku jednoho příjmu chybělo a na jak dlouho by stačila rezerva. Pro první přehled stačí odhad.</p>
      <div className={s.heroPerson}>
        <AdvisorPortrait compact />
        <div><p>Jsem David Pokorný.</p><span>Proberu s vámi splátku, výdaje a rezervu. Společně určíme, čím začít.</span></div>
      </div>
      <div className={s.earlyAction}>
        <button id="income-early-callback-action" data-journey-cta="callback_open" data-journey-placement="hero" type="button" className={s.secondary} disabled={!hydrated} onClick={() => openCallback("income-early-callback-action")}><Phone aria-hidden="true" /> Probrat moji situaci <ArrowRight aria-hidden="true" /></button>
        <p>Můžete se mi ozvat rovnou, i bez vyplnění testu.</p>
      </div>
    </div>
    <section className={s.wizard} aria-labelledby="income-step-title" data-journey-section="calculator">
      <ol className={s.progress} aria-label="Postup testu">{steps.map((item, index) => <li key={item.label} aria-current={index === step ? "step" : undefined} data-complete={index < step}>{index + 1}. {item.label}</li>)}</ol>
      <h2 className={s.stepHeading} id="income-step-title" tabIndex={-1}>{steps[step].title}</h2>
      <p className={s.stepIntro}>{steps[step].intro}{step === 2 ? ` Pro porovnání počítám s obdobím ${targetMonths} měsíců. Ve výsledku ho můžete změnit.` : ""}</p>
      <div className={s.stepHelp}>
        <button id="income-step-callback-action" data-journey-cta="callback_open" data-journey-placement="calculator" type="button" className={s.helpLink} disabled={!hydrated} onClick={() => openCallback("income-step-callback-action")}><Phone aria-hidden="true" /> Probrat moji situaci <ArrowRight aria-hidden="true" /></button>
      </div>
      <form onSubmit={submit} noValidate autoComplete="off">
        <fieldset className={s.fieldset} disabled={!hydrated} data-income-test-ready={hydrated}>
        <legend className={s.srOnly}>Test jednoho příjmu</legend>
        <fieldset className={s.fieldset}>
          <legend className={s.srOnly}>{steps[step].title}</legend>
          <div className={s.fieldStack}>
            {step === 0 ? <>
              <MoneyField name="incomeA" label="Čistý příjem A" hint="První pravidelný příjem domácnosti za měsíc." value={draft.incomeA} error={errors.incomeA} onChange={change} />
              <MoneyField name="incomeB" label="Čistý příjem B" hint="Druhý pravidelný příjem domácnosti za měsíc." value={draft.incomeB} error={errors.incomeB} onChange={change} />
            </> : step === 1 ? <>
              <MoneyField name="mortgagePayment" label="Měsíční splátka hypotéky" hint="Plánovaná splátka, nebo splátka současné hypotéky." value={draft.mortgagePayment} error={errors.mortgagePayment} onChange={change} />
              <MoneyField name="essentialCosts" label="Ostatní nutné výdaje a závazky" hint="Jídlo, energie, doprava, pojištění i splátky dalších úvěrů. Bez hypotéky uvedené výše." value={draft.essentialCosts} error={errors.essentialCosts} onChange={change} />
            </> : <>
              <MoneyField name="reserve" label="Dostupná finanční rezerva" hint="Úspory dostupné pro výpadek příjmu. Hodnotu nemovitosti ani dlouhodobě vázané peníze nezahrnujte." value={draft.reserve} error={errors.reserve} onChange={change} />
            </>}
          </div>
        </fieldset>
        {errors.form ? <p className={s.formError} role="alert">{errors.form}</p> : null}
        <div className={s.actions}>
          {step > 0 ? <button className={s.backButton} type="button" data-journey-cta="step_back" data-journey-placement="calculator" onClick={() => { setErrors({}); setStep(step - 1); }}>Zpět</button> : null}
          <button className={s.primary} type="submit" data-journey-cta={step === 2 ? "result_show" : "step_next"} data-journey-placement="calculator">{step === 2 ? "Zobrazit můj výsledek" : "Pokračovat"}<ArrowRight aria-hidden="true" /></button>
        </div>
        <p className={s.smallNote}>Krok {step + 1} ze 3 · Stačí odhad v celých Kč.</p>
        </fieldset>
      </form>
      <div className={s.promise}><LockKeyhole aria-hidden="true" /><div><strong>Výsledek bez e-mailu a telefonu.</strong><span>Částky zůstávají ve vašem prohlížeči, dokud si sami nevyžádáte souhrn nebo hovor.</span></div></div>
      <noscript><p className={s.formError}>Pro výpočet přímo ve vašem prohlížeči zapněte JavaScript. Bez něj se částky neodesílají a test zůstává vypnutý.</p></noscript>
    </section>
  </div>;
}
