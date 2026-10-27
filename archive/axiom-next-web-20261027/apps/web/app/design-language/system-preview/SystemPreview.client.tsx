"use client";

import { useState } from "react";
import DevControlPanel, {
  type PreviewControlKey,
  type PreviewControls,
} from "./components/DevControlPanel";
import PreviewActionSurfaces from "./components/PreviewActionSurfaces";
import PreviewDarkCards from "./components/PreviewDarkCards";
import PreviewEditorial from "./components/PreviewEditorial";
import PreviewFinalCta from "./components/PreviewFinalCta";
import PreviewFooter from "./components/PreviewFooter";
import PreviewForm from "./components/PreviewForm";
import PreviewHeader from "./components/PreviewHeader";
import PreviewHero from "./components/PreviewHero";
import PreviewProcess from "./components/PreviewProcess";
import PreviewTrustStrip from "./components/PreviewTrustStrip";
import s from "./SystemPreview.module.css";

const initialControls: PreviewControls = {
  panelOpen: true,
  showLabels: false,
  showTokens: false,
  showBoundaries: false,
  reduceMotion: false,
};

export default function SystemPreview() {
  const [controls, setControls] = useState<PreviewControls>(initialControls);

  const toggleControl = (key: PreviewControlKey) => {
    setControls((current) => ({
      ...current,
      [key]: !current[key],
    }));
  };

  return (
    <main
      id="main-content"
      className={s.page}
      data-show-labels={controls.showLabels ? "true" : "false"}
      data-show-tokens={controls.showTokens ? "true" : "false"}
      data-show-boundaries={controls.showBoundaries ? "true" : "false"}
      data-reduce-motion={controls.reduceMotion ? "true" : "false"}
    >
      <DevControlPanel
        controls={controls}
        onClose={() =>
          setControls((current) => ({ ...current, panelOpen: false }))
        }
        onOpen={() =>
          setControls((current) => ({ ...current, panelOpen: true }))
        }
        onToggle={toggleControl}
      />
      <PreviewHeader />
      <PreviewHero />
      <PreviewTrustStrip />
      <PreviewDarkCards />
      <PreviewEditorial />
      <PreviewProcess />
      <PreviewActionSurfaces />
      <PreviewForm />
      <PreviewFinalCta />
      <PreviewFooter />
    </main>
  );
}
