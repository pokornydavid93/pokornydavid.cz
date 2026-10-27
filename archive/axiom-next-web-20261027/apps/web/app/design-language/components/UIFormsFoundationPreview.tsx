"use client";

import { useState, useSyncExternalStore, type KeyboardEvent } from "react";
import UIFormsCompositionLab from "./UIFormsCompositionLab.client";
import UIFormsContractLab from "./UIFormsContractLab.client";
import UIFormsJourney from "./UIFormsJourney.client";
import s from "./uiFormsFoundationPreview.module.css";

type LabLayer = "contract" | "composition" | "journey";

const layers = [
  { id: "contract", label: "Contract Lab" },
  { id: "composition", label: "Composition Lab" },
  { id: "journey", label: "Form Journey" },
] as const satisfies ReadonlyArray<{ id: LabLayer; label: string }>;

const subscribeToHydration = () => () => undefined;
const getClientHydrationSnapshot = () => true;
const getServerHydrationSnapshot = () => false;

export default function UIFormsFoundationPreview() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [layer, setLayer] = useState<LabLayer>("contract");

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === "ArrowRight") nextIndex = (index + 1) % layers.length;
    if (event.key === "ArrowLeft") nextIndex = (index - 1 + layers.length) % layers.length;
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = layers.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    setLayer(layers[nextIndex].id);
    const tabs = event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
      '[role="tab"]',
    );
    tabs?.[nextIndex]?.focus();
  };

  return (
    <div
      className={s.workbench}
      data-hydrated={hydrated ? "true" : "false"}
      data-ui-form-foundation
    >
      <div aria-label="UI and Forms lab layers" className={s.layerTabs} role="tablist">
        {layers.map((item, index) => (
          <button
            aria-controls={`ui-forms-${item.id}-panel`}
            aria-selected={layer === item.id}
            data-active={layer === item.id || undefined}
            id={`ui-forms-${item.id}-tab`}
            key={item.id}
            onClick={() => setLayer(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            role="tab"
            tabIndex={layer === item.id ? 0 : -1}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>

      <div
        aria-labelledby={`ui-forms-${layer}-tab`}
        id={`ui-forms-${layer}-panel`}
        role="tabpanel"
        tabIndex={0}
      >
        {layer === "contract" ? <UIFormsContractLab /> : null}
        {layer === "composition" ? <UIFormsCompositionLab /> : null}
        {layer === "journey" ? <UIFormsJourney /> : null}
      </div>
    </div>
  );
}
