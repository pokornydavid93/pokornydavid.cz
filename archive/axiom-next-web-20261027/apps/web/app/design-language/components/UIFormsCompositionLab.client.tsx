"use client";

import {
  ArrowRight,
  CalendarCheck,
  MoreHorizontal,
  Phone,
} from "lucide-react";
import { useState } from "react";
import Checkbox from "../../ui/forms/Checkbox";
import ErrorSummary from "../../ui/forms/ErrorSummary";
import RadioGroup from "../../ui/forms/RadioGroup";
import SelectField from "../../ui/forms/SelectField";
import TextareaField from "../../ui/forms/TextareaField";
import TextField from "../../ui/forms/TextField";
import Badge from "../../ui/primitives/Badge";
import Button from "../../ui/primitives/Button";
import Disclosure from "../../ui/primitives/Disclosure";
import Divider from "../../ui/primitives/Divider";
import IconButton from "../../ui/primitives/IconButton";
import Link from "../../ui/primitives/Link";
import Notice from "../../ui/primitives/Notice";
import Prose from "../../ui/primitives/Prose";
import ResponsiveMedia from "../../ui/primitives/ResponsiveMedia";
import SelectionChip from "../../ui/primitives/SelectionChip";
import Surface from "../../ui/primitives/Surface";
import { previewTones, type PreviewTone } from "./UIFormsToneMatrix";
import s from "./uiFormsFoundationPreview.module.css";

const radioOptions = [
  { value: "overview", label: "Získat přehled", description: "Nejdřív srovnat současnou situaci." },
  { value: "plan", label: "Připravit plán", description: "Navázat konkrétními prioritami." },
] as const;

const emailError = {
  fieldId: "composition-email",
  message: "Doplňte platný e-mail.",
} as const;

export default function UIFormsCompositionLab() {
  const [tone, setTone] = useState<PreviewTone>("dark");
  const [selected, setSelected] = useState(true);
  const activeTone = previewTones.find((item) => item.id === tone) ?? previewTones[0];

  return (
    <section className={s.labLayer} data-lab-layer="composition">
      <header className={s.layerIntro}>
        <span>Composition Lab</span>
        <h3>Reálná obrazovka bez ztráty komponentových hranic</h3>
        <p>Akce, obsah, notice a formulář se skládají do poradenského scénáře. Surface přepínač nemění jejich DOM.</p>
      </header>

      <div className={s.compositionToolbar}>
        <div aria-label="Composition surface tone" className={s.segmentedControl} role="group">
          {previewTones.map((item) => (
            <button
              aria-controls="composition-preview-stage"
              aria-pressed={tone === item.id}
              data-active={tone === item.id || undefined}
              key={item.id}
              onClick={() => setTone(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
        <output aria-live="polite">{activeTone.label} · {activeTone.surface}</output>
      </div>

      <Surface
        as="div"
        className={s.compositionSurface}
        id="composition-preview-stage"
        surface={activeTone.surface}
        tone={activeTone.id}
      >
        <section className={s.compositionSection} data-preview-family="ui">
          <header>
            <span>UI composition</span>
            <h4>Akce, stav a čitelný obsah</h4>
          </header>

          <div className={s.actionRow}>
            <Button endIcon={<ArrowRight />}>Získat přehled</Button>
            <Button variant="secondary">Prohlédnout postup</Button>
            <Button variant="quiet">Zavřít</Button>
            <IconButton icon={<Phone />} label="Zavolat mi" />
            <IconButton icon={<MoreHorizontal />} label="Další možnosti" />
          </div>

          <div className={s.inlineRow}>
            <Link href="/jak-pracuji">Jak spolupráce probíhá</Link>
            <Badge tone="success">Ověřený podklad</Badge>
            <SelectionChip selected={selected} onSelectedChange={setSelected}>Investice</SelectionChip>
          </div>

          <Divider label="Kontext rozhodnutí" strength="default" />

          <div className={s.contentGrid}>
            <ResponsiveMedia
              alt="Finanční plán při osobní konzultaci"
              caption="Médium drží vlastní obsahový a geometrický kontrakt."
              height={675}
              kind="image"
              ratio="landscape"
              sizes="(max-width: 768px) 100vw, 42vw"
              src="/articles/investicni-plan-editorial.webp"
              width={1200}
            />
            <Prose as="article" measure="body">
              <h4>Rozhodnutí začíná souvislostmi</h4>
              <p>Nejdřív pojmenujeme cíle, rezervu a rizika. Teprve potom dává smysl vybírat konkrétní řešení.</p>
            </Prose>
          </div>

          <Notice title="Další krok je připravený" tone="success">
            Přehled dostanete v podobě, ke které se lze později vrátit.
          </Notice>
          <Disclosure summary="Co si připravit před schůzkou?">
            Stačí orientační přehled příjmů, výdajů, rezerv a současných smluv.
          </Disclosure>
        </section>

        <Divider strength="emphasis" />

        <section className={s.compositionSection} data-preview-family="forms">
          <header>
            <span>Form composition</span>
            <h4>Jednosloupcová poptávka s jedním error modelem</h4>
          </header>

          <form className={s.formSpecimen} noValidate onSubmit={(event) => event.preventDefault()}>
            <ErrorSummary errors={[emailError]} headingLevel="h4" />
            <TextField
              autoComplete="email"
              error={emailError.message}
              hint="Například david@example.cz."
              id={emailError.fieldId}
              label="E-mail"
              name="email"
              required
              type="email"
            />
            <SelectField autoComplete="off" defaultValue="overview" hint="Vyberte nejbližší téma." label="Hlavní téma" name="topic">
              <option value="overview">Celkový přehled</option>
              <option value="mortgage">Hypotéka</option>
              <option value="investing">Investice</option>
            </SelectField>
            <TextareaField autoComplete="off" hint="Stačí krátce popsat, co se má změnit." label="Co chcete vyřešit" name="goal" />
            <RadioGroup defaultValue="overview" legend="Preferovaný výsledek" name="outcome" options={radioOptions} />
            <Checkbox hint="Údaje použiji pouze pro odpověď na poptávku." name="consent" required>
              Souhlasím se zpracováním osobních údajů.
            </Checkbox>
            <Button startIcon={<CalendarCheck />} type="submit">Domluvit konzultaci</Button>
          </form>
        </section>
      </Surface>
    </section>
  );
}
