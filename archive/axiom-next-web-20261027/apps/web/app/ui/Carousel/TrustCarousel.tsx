"use client";

import { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type {
  EmblaCarouselType,
  EmblaEventType,
  EmblaOptionsType,
} from "embla-carousel";
import s from "./trustCarousel.module.css";
import { ChevronRight, ChevronLeft } from "lucide-react";

type TrustCarouselProps = {
  children: React.ReactNode[];
};

const OPTIONS: EmblaOptionsType = {
  loop: true,
  align: "center",
  skipSnaps: false,
};

const TWEEN_FACTOR_BASE = 0.52;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function TrustCarousel({ children }: TrustCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel(OPTIONS);

  const tweenFactor = useRef(0);
  const tweenNodes = useRef<HTMLElement[]>([]);

  // najdeme v každém slide vnitřní element, který chceme škálovat
  const setTweenNodes = useCallback((api: EmblaCarouselType) => {
    tweenNodes.current = api.slideNodes().map((slideNode) => {
      // očekávám <div className={s.slide}><div className={s.slideInner} data-tween>...</div></div>
      const target =
        (slideNode.querySelector("[data-tween]") as HTMLElement) ??
        (slideNode as HTMLElement);
      return target;
    });
  }, []);

  const setTweenFactor = useCallback((api: EmblaCarouselType) => {
    tweenFactor.current = TWEEN_FACTOR_BASE * api.scrollSnapList().length;
  }, []);

  const tweenScale = useCallback(
    (api: EmblaCarouselType, eventName?: EmblaEventType) => {
      const engine = api.internalEngine();
      const scrollProgress = api.scrollProgress();
      const slidesInView = api.slidesInView();
      const isScrollEvent = eventName === "scroll";

      api.scrollSnapList().forEach((scrollSnap, snapIndex) => {
        let diffToTarget = scrollSnap - scrollProgress;
        const slidesInSnap = engine.slideRegistry[snapIndex];

        slidesInSnap.forEach((slideIndex) => {
          if (isScrollEvent && !slidesInView.includes(slideIndex)) return;

          if (engine.options.loop) {
            engine.slideLooper.loopPoints.forEach((loopItem) => {
              const target = loopItem.target();
              if (slideIndex === loopItem.index && target !== 0) {
                const sign = Math.sign(target);
                if (sign === -1) {
                  diffToTarget = scrollSnap - (1 + scrollProgress);
                }
                if (sign === 1) {
                  diffToTarget = scrollSnap + (1 - scrollProgress);
                }
              }
            });
          }

          const tweenValue = 1 - Math.abs(diffToTarget * tweenFactor.current);
          // jemnější rozsah pro trust buttony
          const scale = clamp(tweenValue, 0.8, 1);
          const opacity = clamp(tweenValue, 0.5, 1);

          const node = tweenNodes.current[slideIndex];
          if (!node) return;

          node.style.transform = `scale(${scale})`;
          node.style.opacity = `${opacity}`;
        });
      });
    },
    []
  );

  useEffect(() => {
    if (!emblaApi) return;

    setTweenNodes(emblaApi);
    setTweenFactor(emblaApi);
    tweenScale(emblaApi);

    emblaApi
      .on("reInit", setTweenNodes)
      .on("reInit", setTweenFactor)
      .on("reInit", tweenScale)
      .on("scroll", tweenScale)
      .on("slideFocus", tweenScale);
  }, [emblaApi, setTweenNodes, setTweenFactor, tweenScale]);

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();

return (
  <div className={s.root}>
    <button
      type="button"
      className={`${s.arrow} ${s.arrowLeft}`}
      onClick={scrollPrev}
      aria-label="Předchozí"
    >
      <ChevronLeft size={18} />
    </button>

    <div className={s.viewport} ref={emblaRef}>
      <div className={s.container}>
        {children.map((child, index) => (
          <div key={index} className={s.slide}>
            <div className={s.slideInner} data-tween>
              {child}
            </div>
          </div>
        ))}
      </div>
    </div>

    <button
      type="button"
      className={`${s.arrow} ${s.arrowRight}`}
      onClick={scrollNext}
      aria-label="Další"
    >
      <ChevronRight size={18} />
    </button>
  </div>
);

}
