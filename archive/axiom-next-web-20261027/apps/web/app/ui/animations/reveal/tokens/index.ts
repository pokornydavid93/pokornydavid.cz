import { directionToken } from "./directions";
import { fadeToken } from "./fade";
import { scaleToken } from "./scale";
import type { TokenHandler } from "../types";

export const defaultTokens: TokenHandler[] = [directionToken, scaleToken, fadeToken];
