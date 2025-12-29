import type { RevealPreset } from "./types";

export const REVEAL_PRESETS: Record<string, RevealPreset> = {
  heroTitle: {
    animation: "bottom",
    duration: 1.05,
    ease: "power3.out",
    offset: 160,
    start: "top 80%",
  },
  card: {
    animation: "bottom",
    duration: 0.9,
    ease: "power2.out",
    offset: 120,
    start: "top 85%",
  },
  list: {
    animation: "left",
    duration: 0.7,
    ease: "power2.out",
    stagger: 0.08,
    offset: 100,
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
