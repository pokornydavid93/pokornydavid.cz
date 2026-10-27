import HomepageIntroMotion from "./HomepageIntro.client";
import { HOMEPAGE_HERO_SILK_POSTER_SRC } from "./HomepageIntro.constants";

export default function HomepageIntro() {
  return (
    <>
      <link
        rel="preload"
        as="image"
        href={HOMEPAGE_HERO_SILK_POSTER_SRC}
        fetchPriority="high"
      />
      <HomepageIntroMotion />
      <noscript>
        <style>{"[data-home-intro]{display:none!important}"}</style>
      </noscript>
    </>
  );
}
