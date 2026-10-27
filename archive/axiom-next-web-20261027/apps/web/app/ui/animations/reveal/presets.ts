import type { RevealPreset } from "./types";
import {
  DESIGN_PRIMITIVE_GSAP_EASES,
  DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS,
  DESIGN_PRIMITIVE_REVEAL_OFFSETS,
  DESIGN_PRIMITIVE_STAGGER_SECONDS,
} from "@/app/theme/design-primitives";

export const REVEAL_PRESETS: Record<string, RevealPreset> = {
  heroTitle: {
    animation: "bottom",
    duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.heroReveal,
    ease: DESIGN_PRIMITIVE_GSAP_EASES.out,
    offset: DESIGN_PRIMITIVE_REVEAL_OFFSETS.large,
    start: "top 80%",
  },
  card: {
    animation: "bottom",
    duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.reveal,
    ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
    offset: DESIGN_PRIMITIVE_REVEAL_OFFSETS.medium,
    start: "top 85%",
  },
  list: {
    animation: "left",
    duration: DESIGN_PRIMITIVE_MOTION_DURATIONS_SECONDS.cinematic,
    ease: DESIGN_PRIMITIVE_GSAP_EASES.standard,
    stagger: DESIGN_PRIMITIVE_STAGGER_SECONDS.standard,
    offset: DESIGN_PRIMITIVE_REVEAL_OFFSETS.medium,
    start: "top 90%",
  },
};

export type RevealPresetName = keyof typeof REVEAL_PRESETS;

export function resolvePreset(
  preset?: RevealPresetName | RevealPreset
): RevealPreset | undefined {
  if (!preset) return undefined;
  if (typeof preset === "string") {
    return REVEAL_PRESETS[preset];
  }
  return preset;
}
