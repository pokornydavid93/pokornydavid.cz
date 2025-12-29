import type { TweenVars } from "gsap";

export type RevealMode = "once" | "toggle" | "play";

export type CompiledAnimation = {
  from: TweenVars;
  to: TweenVars;
  meta: {
    fade: boolean;
    usesTransform: boolean;
    mode: "transform" | "opacity" | "both";
  };
};

export type CompilationState = CompiledAnimation;

export type TokenContext = {
  offset: number;
  density?: number;
  viewport?: DOMRect;
};

export type TokenHandler = (
  token: string,
  state: CompilationState,
  context: TokenContext
) => boolean;

export type RevealPreset = Partial<{
  animation: string;
  duration: number;
  ease: TweenVars["ease"];
  delay: number;
  start: string;
  offset: number;
  stagger: number;
  index: number;
  mode: RevealMode;
  scope: string;
  disabled: boolean;
  debug: boolean;
}>;
