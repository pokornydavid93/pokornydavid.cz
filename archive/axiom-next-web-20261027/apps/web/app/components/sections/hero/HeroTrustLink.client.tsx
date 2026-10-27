"use client";

import {
  forwardRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type PropsWithChildren,
} from "react";

import { scrollToSmooth } from "@/app/ui/scroll/scrollTo";

type HeroTrustLinkProps = PropsWithChildren<
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    external?: boolean;
    href: string;
  }
>;

const scrollToInternalTarget = (href: string) => {
  const target = document.querySelector<HTMLElement>(href);
  if (!target) {
    scrollToSmooth(href);
    return;
  }

  const scrollMarginTop =
    Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;

  if (scrollMarginTop <= 0) {
    scrollToSmooth(href);
    return;
  }

  const top = window.scrollY + target.getBoundingClientRect().top - scrollMarginTop;
  scrollToSmooth(Math.max(0, top));
};

const HeroTrustLink = forwardRef<HTMLAnchorElement, HeroTrustLinkProps>(
  ({ external = false, href, onClick, rel, target, children, ...props }, ref) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);
      if (
        event.defaultPrevented ||
        external ||
        !href.startsWith("#") ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      window.history.pushState(null, "", href);
      scrollToInternalTarget(href);
    };

    return (
      <a
        ref={ref}
        href={href}
        target={external ? "_blank" : target}
        rel={external ? "noopener noreferrer" : rel}
        onClick={handleClick}
        {...props}
      >
        {children}
      </a>
    );
  },
);

HeroTrustLink.displayName = "HeroTrustLink";

export default HeroTrustLink;
