"use client";

import dynamic from "next/dynamic";
import s from "./overviewFunnel.module.css";

const Silk = dynamic(() => import("../_components/effects/ReactBitsSilk.client"), {
  ssr: false,
});

export default function OverviewBackdrop() {
  return (
    <div aria-hidden="true" className={s.sceneBackdrop} data-overview-backdrop>
      <div className={s.sceneMaterial}>
        <Silk
          className={s.silk}
          color="#224f10"
          maxDpr={1}
          maxFps={30}
          noiseIntensity={0.25}
          scale={1}
          speed={4}
        />
      </div>
      <div className={s.sceneShade} />
    </div>
  );
}
