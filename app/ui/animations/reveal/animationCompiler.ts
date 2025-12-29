import { defaultTokens } from "./tokens";
import type { CompiledAnimation, TokenHandler, TokenContext } from "./types";

type CompileOptions = {
  offset?: number;
  tokens?: TokenHandler[];
  debug?: boolean;
  density?: number;
  viewport?: DOMRect;
};

export function compileAnimation(
  input: string,
  {
    offset = 120,
    tokens = defaultTokens,
    debug = false,
    density,
    viewport,
  }: CompileOptions = {}
): CompiledAnimation {
  const isProd =
    typeof process !== "undefined" && process.env?.NODE_ENV === "production";

  const parsedTokens = input
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const state: CompiledAnimation = {
    from: {},
    to: { opacity: 1 },
    meta: {
      fade: false,
      usesTransform: false,
      mode: "opacity",
    },
  };

  const tokenContext: TokenContext = {
    offset,
    density:
      density ??
      (typeof window !== "undefined" ? window.devicePixelRatio : undefined),
    viewport:
      viewport ??
      (typeof window !== "undefined" && typeof DOMRect !== "undefined"
        ? new DOMRect(0, 0, window.innerWidth, window.innerHeight)
        : undefined),
  };

  for (const token of parsedTokens) {
    let handled = false;
    for (const handler of tokens) {
      if (handler(token, state, tokenContext)) {
        handled = true;
        break;
      }
    }

    if (!handled && !isProd) {
      console.warn(`[Reveal] Unknown token: "${token}" in "${input}"`);
    }
  }

  if ("x" in state.from) {
    state.to.x ??= 0;
    state.meta.usesTransform = true;
  }

  if ("y" in state.from) {
    state.to.y ??= 0;
    state.meta.usesTransform = true;
  }

  if ("scale" in state.from) {
    state.to.scale ??= 1;
    state.meta.usesTransform = true;
  }

  state.from.opacity ??= 0;
  state.to.opacity ??= 1;

  const hasTransform = state.meta.usesTransform;
  const hasFade = state.meta.fade;

  if (hasTransform && hasFade) {
    state.meta.mode = "both";
  } else if (hasTransform) {
    state.meta.mode = "transform";
  } else {
    state.meta.mode = "opacity";
  }

  if (debug && !isProd) {
    console.log("[Reveal] compileAnimation", {
      input,
      tokens: parsedTokens,
      from: state.from,
      to: state.to,
      meta: state.meta,
    });
  }

  return state;
}
