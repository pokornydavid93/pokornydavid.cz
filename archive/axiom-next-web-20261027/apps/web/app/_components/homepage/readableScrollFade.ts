type GsapStatic = typeof import("gsap").gsap;

/** Keep the fade finite even when the spatial, scroll-linked reveal is paused. */
export function createReadableScrollFade(
  gsap: GsapStatic,
  targets: HTMLElement[],
  duration: number,
) {
  gsap.set(targets, { opacity: 0 });
  const tween = gsap.to(targets, {
    duration,
    ease: "power2.out",
    opacity: 1,
    paused: true,
  });
  let entered = false;

  return {
    update(progress: number) {
      const nextEntered = progress > 0;
      if (nextEntered === entered) return;
      entered = nextEntered;
      if (entered) tween.play();
      else tween.reverse();
    },
    refresh(progress: number) {
      entered = progress > 0;
      tween.progress(entered ? 1 : 0).pause();
    },
    finish() {
      entered = true;
      tween.progress(1).pause();
    },
    kill() {
      tween.kill();
    },
  };
}
