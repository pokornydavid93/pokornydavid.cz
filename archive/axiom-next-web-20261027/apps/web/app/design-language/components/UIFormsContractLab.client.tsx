"use client";

import { MoreHorizontal, Phone } from "lucide-react";
import { useState, type ReactNode } from "react";
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
import SelectionChip from "../../ui/primitives/SelectionChip";
import UIFormsToneMatrix, { type PreviewTone } from "./UIFormsToneMatrix";
import s from "./uiFormsFoundationPreview.module.css";

type ContractId =
  | "button"
  | "link"
  | "icon-button"
  | "badge"
  | "selection-chip"
  | "divider"
  | "disclosure"
  | "notice"
  | "text-field"
  | "textarea-field"
  | "select-field"
  | "checkbox"
  | "radio-group"
  | "error-summary"
  | "field-system";

const contractGroups: ReadonlyArray<{
  label: string;
  contracts: ReadonlyArray<readonly [ContractId, string]>;
}> = [
  {
    label: "UI",
    contracts: [
      ["button", "Button"],
      ["link", "Link"],
      ["icon-button", "IconButton"],
      ["badge", "Badge"],
      ["selection-chip", "SelectionChip"],
      ["divider", "Divider"],
      ["disclosure", "Disclosure"],
      ["notice", "Notice"],
    ],
  },
  {
    label: "Forms",
    contracts: [
      ["text-field", "TextField"],
      ["textarea-field", "TextareaField"],
      ["select-field", "SelectField"],
      ["checkbox", "Checkbox"],
      ["radio-group", "RadioGroup"],
      ["error-summary", "ErrorSummary"],
    ],
  },
  {
    label: "Internal",
    contracts: [["field-system", "Field / FieldGroup"]],
  },
];

const contractDescriptions: Record<ContractId, string> = {
  button: "Akce, disabled a busy bez změny HTML významu.",
  link: "Navigace zůstává odkazem a podtržení je explicitní.",
  "icon-button": "Jeden symbol v jasném button containeru s povinným accessible name.",
  badge: "Statická informace bez focusu a bez ovládací affordance.",
  "selection-chip": "Persistentní volba s aria-pressed a nebarevným check indikátorem.",
  divider: "Strukturální oddělení bez stavového nebo interakčního významu.",
  disclosure: "Nativní button řídí pojmenovaný region a stav aria-expanded.",
  notice: "Info, success a error mají odlišný význam, ikonu i barevnou polaritu.",
  "text-field": "Label, hint, control a error vznikají z jednoho autor-facing kontraktu.",
  "textarea-field": "Víceřádkový control sdílí Field wiring, ne HTML implementaci.",
  "select-field": "Nativní výběr zůstává propojený se stejným Field kontraktem.",
  checkbox: "Celý řádek je hit target a popis i chyba jsou programově připojené.",
  "radio-group": "Skutečný fieldset a legend seskupují jednu vzájemně výlučnou volbu.",
  "error-summary": "Jeden error model napájí summary odkazy i lokální chyby.",
  "field-system": "Interní Field a FieldGroup vlastní ID, metadata a description chain.",
};

const radioOptions = [
  { value: "overview", label: "Získat přehled", description: "Srovnat současnou situaci." },
  { value: "plan", label: "Připravit plán", description: "Navázat konkrétními kroky." },
] as const;

function StateCell({
  children,
  label,
  state,
}: {
  children: ReactNode;
  label: string;
  state: string;
}) {
  return (
    <div className={s.stateCell} data-demo-state={state}>
      <span>{label}</span>
      <div>{children}</div>
    </div>
  );
}

function ContractSpecimen({ contract, tone }: { contract: ContractId; tone: PreviewTone }) {
  const fieldName = `contract-${contract}`;

  if (contract === "button") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><Button>Pokračovat</Button></StateCell>
      <StateCell label="Hover" state="hover"><Button>Pokračovat</Button></StateCell>
      <StateCell label="Focus-visible" state="focus"><Button>Pokračovat</Button></StateCell>
      <StateCell label="Disabled" state="disabled"><Button disabled>Pokračovat</Button></StateCell>
      <StateCell label="Busy" state="busy"><Button loading loadingLabel="Odesílám formulář">Odesílám</Button></StateCell>
    </div>;
  }

  if (contract === "link") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><Link href="/jak-pracuji">Jak spolupráce probíhá</Link></StateCell>
      <StateCell label="Hover" state="hover"><Link href="/jak-pracuji">Jak spolupráce probíhá</Link></StateCell>
      <StateCell label="Focus-visible" state="focus"><Link href="/jak-pracuji">Jak spolupráce probíhá</Link></StateCell>
    </div>;
  }

  if (contract === "icon-button") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><IconButton icon={<Phone />} label="Zavolat mi" /></StateCell>
      <StateCell label="Hover" state="hover"><IconButton icon={<MoreHorizontal />} label="Další možnosti" /></StateCell>
      <StateCell label="Focus-visible" state="focus"><IconButton icon={<Phone />} label="Zavolat mi" /></StateCell>
      <StateCell label="Disabled" state="disabled"><IconButton disabled icon={<Phone />} label="Volání není dostupné" /></StateCell>
    </div>;
  }

  if (contract === "badge") {
    return <div className={s.stateGrid}>
      <StateCell label="Neutral" state="rest"><Badge>Novinka</Badge></StateCell>
      <StateCell label="Accent" state="rest"><Badge tone="accent">Priorita</Badge></StateCell>
      <StateCell label="Success" state="rest"><Badge tone="success">Ověřeno</Badge></StateCell>
    </div>;
  }

  if (contract === "selection-chip") {
    return <div className={s.stateGrid}>
      <StateCell label="Unselected" state="rest"><SelectionChip selected={false}>Investice</SelectionChip></StateCell>
      <StateCell label="Hover" state="hover"><SelectionChip selected={false}>Investice</SelectionChip></StateCell>
      <StateCell label="Selected" state="selected"><SelectionChip selected>Investice</SelectionChip></StateCell>
      <StateCell label="Focus-visible" state="focus"><SelectionChip selected>Investice</SelectionChip></StateCell>
      <StateCell label="Disabled" state="disabled"><SelectionChip disabled selected={false}>Investice</SelectionChip></StateCell>
    </div>;
  }

  if (contract === "divider") {
    return <div className={s.stateGrid}>
      <StateCell label="Subtle" state="rest"><Divider label="Kontext" strength="subtle" /></StateCell>
      <StateCell label="Default" state="rest"><Divider label="Kontext" strength="default" /></StateCell>
      <StateCell label="Emphasis" state="rest"><Divider label="Kontext" strength="emphasis" /></StateCell>
    </div>;
  }

  if (contract === "disclosure") {
    return <div className={s.stateGrid}>
      <StateCell label="Collapsed" state="rest"><Disclosure summary="Co si připravit?">Přehled příjmů a rezerv.</Disclosure></StateCell>
      <StateCell label="Expanded" state="expanded"><Disclosure defaultExpanded summary="Co si připravit?">Přehled příjmů a rezerv.</Disclosure></StateCell>
      <StateCell label="Focus-visible" state="focus"><Disclosure summary="Co si připravit?">Přehled příjmů a rezerv.</Disclosure></StateCell>
    </div>;
  }

  if (contract === "notice") {
    return <div className={s.stateGrid}>
      <StateCell label="Info" state="rest"><Notice title="Kontext" tone="info">Doplňující informace k dalšímu kroku.</Notice></StateCell>
      <StateCell label="Success · status" state="rest"><Notice live="polite" title="Uloženo" tone="success">Změna byla bezpečně uložena.</Notice></StateCell>
      <StateCell label="Error · alert" state="rest"><Notice live="assertive" title="Chyba odeslání" tone="error">Zkuste formulář odeslat znovu.</Notice></StateCell>
    </div>;
  }

  if (contract === "text-field") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><TextField autoComplete="email" hint="Například david@example.cz." label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Hover" state="hover"><TextField autoComplete="email" hint="Například david@example.cz." label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Focus-visible" state="focus"><TextField autoComplete="email" hint="Například david@example.cz." label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Filled" state="filled"><TextField autoComplete="email" defaultValue="david@example.cz" label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Invalid" state="invalid"><TextField autoComplete="email" error="Doplňte platný e-mail." label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Invalid + focus" state="invalid-focus"><TextField autoComplete="email" error="Doplňte platný e-mail." label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Disabled" state="disabled"><TextField autoComplete="email" disabled label="E-mail" name={fieldName} type="email" /></StateCell>
      <StateCell label="Readonly" state="readonly"><TextField autoComplete="email" defaultValue="david@example.cz" label="E-mail" name={fieldName} readOnly type="email" /></StateCell>
      <StateCell label="Autofill" state="autofill"><TextField autoComplete="email" defaultValue="david@example.cz" label="E-mail" name={fieldName} type="email" /></StateCell>
    </div>;
  }

  if (contract === "textarea-field") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><TextareaField autoComplete="off" hint="Stačí dvě až tři věty." label="Co chcete vyřešit" name={fieldName} /></StateCell>
      <StateCell label="Focus-visible" state="focus"><TextareaField autoComplete="off" label="Co chcete vyřešit" name={fieldName} /></StateCell>
      <StateCell label="Filled" state="filled"><TextareaField autoComplete="off" defaultValue="Chci srovnat rezervu a dlouhodobý plán." label="Co chcete vyřešit" name={fieldName} /></StateCell>
      <StateCell label="Invalid + focus" state="invalid-focus"><TextareaField autoComplete="off" error="Napište stručně, co chcete řešit." label="Co chcete vyřešit" name={fieldName} /></StateCell>
      <StateCell label="Readonly" state="readonly"><TextareaField autoComplete="off" defaultValue="Potvrzené zadání." label="Co chcete vyřešit" name={fieldName} readOnly /></StateCell>
      <StateCell label="Disabled" state="disabled"><TextareaField autoComplete="off" disabled label="Co chcete vyřešit" name={fieldName} /></StateCell>
    </div>;
  }

  if (contract === "select-field") {
    const select = (props: { disabled?: boolean; invalid?: boolean }) => (
      <SelectField autoComplete="off" disabled={props.disabled} error={props.invalid ? "Vyberte téma." : undefined} label="Téma" name={fieldName}>
        <option value="">Vyberte možnost</option>
        <option value="overview">Celkový přehled</option>
        <option value="mortgage">Hypotéka</option>
      </SelectField>
    );
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest">{select({})}</StateCell>
      <StateCell label="Hover" state="hover">{select({})}</StateCell>
      <StateCell label="Focus-visible" state="focus">{select({})}</StateCell>
      <StateCell label="Invalid + focus" state="invalid-focus">{select({ invalid: true })}</StateCell>
      <StateCell label="Disabled" state="disabled">{select({ disabled: true })}</StateCell>
    </div>;
  }

  if (contract === "checkbox") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><Checkbox name={fieldName}>Souhlasím s podmínkami</Checkbox></StateCell>
      <StateCell label="Selected" state="selected"><Checkbox defaultChecked name={fieldName}>Souhlasím s podmínkami</Checkbox></StateCell>
      <StateCell label="Focus-visible" state="focus"><Checkbox name={fieldName}>Souhlasím s podmínkami</Checkbox></StateCell>
      <StateCell label="Invalid + focus" state="invalid-focus"><Checkbox error="Potvrďte souhlas." name={fieldName}>Souhlasím s podmínkami</Checkbox></StateCell>
      <StateCell label="Disabled" state="disabled"><Checkbox disabled name={fieldName}>Souhlasím s podmínkami</Checkbox></StateCell>
    </div>;
  }

  if (contract === "radio-group") {
    return <div className={s.stateGrid}>
      <StateCell label="Rest" state="rest"><RadioGroup legend="Preferovaný výsledek" name={fieldName} options={radioOptions} /></StateCell>
      <StateCell label="Selected" state="selected"><RadioGroup defaultValue="overview" legend="Preferovaný výsledek" name={fieldName} options={radioOptions} /></StateCell>
      <StateCell label="Focus-visible" state="focus"><RadioGroup defaultValue="overview" legend="Preferovaný výsledek" name={fieldName} options={radioOptions} /></StateCell>
      <StateCell label="Invalid + focus" state="invalid-focus"><RadioGroup error="Vyberte preferovaný výsledek." legend="Preferovaný výsledek" name={fieldName} options={radioOptions} /></StateCell>
      <StateCell label="Disabled" state="disabled"><RadioGroup disabled legend="Preferovaný výsledek" name={fieldName} options={radioOptions} /></StateCell>
    </div>;
  }

  if (contract === "error-summary") {
    const fieldId = `contract-summary-${tone}`;
    const error = { fieldId, message: "Doplňte platný e-mail." };
    return <div className={s.summaryContract}>
      <ErrorSummary errors={[error]} headingLevel="h4" />
      <TextField autoComplete="email" error={error.message} id={fieldId} label="E-mail" name={fieldName} type="email" />
    </div>;
  }

  return <div className={s.fieldAnatomy}>
    <TextField autoComplete="email" error="Doplňte platný e-mail." hint="Například david@example.cz." label="E-mail" name={fieldName} required type="email" />
    <RadioGroup hint="Vyberte jednu možnost." legend="Preferovaný výsledek" name={`${fieldName}-group`} options={radioOptions} required />
    <dl>
      <div><dt>Field</dt><dd>Label → Hint → Control → Error</dd></div>
      <div><dt>FieldGroup</dt><dd>Legend → Hint → Controls → Error</dd></div>
      <div><dt>Wiring</dt><dd>id · for · describedby · invalid</dd></div>
    </dl>
  </div>;
}

export default function UIFormsContractLab() {
  const [contract, setContract] = useState<ContractId>("text-field");
  const label = contractGroups.flatMap((group) => group.contracts)
    .find(([id]) => id === contract)?.[1] ?? contract;

  return (
    <section className={s.labLayer} data-lab-layer="contract">
      <header className={s.layerIntro}>
        <span>Contract Lab · 15 contracts</span>
        <h3>Jeden kontrakt, tři surface kontexty.</h3>
        <p>Vybraný komponent používá v každém sloupci stejné DOM a props. Mění se pouze lokální surface tokeny.</p>
      </header>

      <div className={s.contractLayout}>
        <nav aria-label="UI and Forms contracts" className={s.contractIndex}>
          {contractGroups.map((group) => (
            <div key={group.label}>
              <span>{group.label}</span>
              {group.contracts.map(([id, name]) => (
                <button
                  aria-pressed={contract === id}
                  data-active={contract === id || undefined}
                  key={id}
                  onClick={() => setContract(id)}
                  type="button"
                >
                  {name}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className={s.contractStage} data-contract-id={contract}>
          <header>
            <span>Selected contract</span>
            <h4>{label}</h4>
            <p>{contractDescriptions[contract]}</p>
          </header>
          <UIFormsToneMatrix>
            {(tone) => <ContractSpecimen contract={contract} tone={tone} />}
          </UIFormsToneMatrix>
        </div>
      </div>
    </section>
  );
}
