export const HERO_PORTRAIT_WEBGL_MEDIA_QUERY = "(min-width: 768px)";
export const HERO_SILK_WEBGL_MEDIA_QUERY = "(min-width: 1px)";

type HeroEffectPreloadOptions = {
  includePortrait?: boolean;
};

/**
 * Starts downloading/evaluating the relevant effect modules without
 * constructing a WebGLRenderer. Silk is shared by desktop and mobile; the
 * portrait enhancement remains reserved for tablet and desktop.
 */
export const loadHeroSilkRuntime = () => import(
  "../effects/ReactBitsSilk.client"
);

export const loadHeroPortraitWarpRuntime = () => import(
  "./HeroPortraitEdgeWarp.client"
);

export const preloadHeroEffectRuntimes = async ({
  includePortrait = false,
}: HeroEffectPreloadOptions = {}) => {
  const runtimes: Promise<unknown>[] = [loadHeroSilkRuntime()];
  if (includePortrait) runtimes.push(loadHeroPortraitWarpRuntime());
  const results = await Promise.allSettled(runtimes);
  return results.every((result) => result.status === "fulfilled");
};
