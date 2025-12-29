import type { TokenHandler } from "../types";

export const fadeToken: TokenHandler = (token, state) => {
  if (token !== "fade") return false;

  state.meta.fade = true;
  return true;
};
