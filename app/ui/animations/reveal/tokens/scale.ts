import type { TokenHandler } from "../types";

export const scaleToken: TokenHandler = (token, state) => {
  if (!token.startsWith("scale-")) return false;

  const raw = Number(token.replace("scale-", ""));
  if (Number.isNaN(raw)) return false;

  state.from.scale = raw / 100;
  return true;
};
