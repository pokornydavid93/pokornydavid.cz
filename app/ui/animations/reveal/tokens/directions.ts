import type { TokenHandler } from "../types";

export const directionToken: TokenHandler = (token, state, context) => {
  switch (token) {
    case "bottom":
      state.from.y =
        ((state.from.y as number | undefined) ?? 0) + context.offset;
      return true;
    case "top":
      state.from.y =
        ((state.from.y as number | undefined) ?? 0) - context.offset;
      return true;
    case "left":
      state.from.x =
        ((state.from.x as number | undefined) ?? 0) - context.offset;
      return true;
    case "right":
      state.from.x =
        ((state.from.x as number | undefined) ?? 0) + context.offset;
      return true;
    default:
      return false;
  }
};
