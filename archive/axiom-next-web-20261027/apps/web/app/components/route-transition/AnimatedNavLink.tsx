"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type MouseEvent,
  type ReactNode,
} from "react";

import { useRouteTransition } from "./RouteTransitionProvider";
import {
  getRouteTarget,
  shouldUseNativeNavigation,
} from "./routeTransition.utils";

type AnimatedNavLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  children: ReactNode;
  href: string;
};

const AnimatedNavLink = forwardRef<HTMLAnchorElement, AnimatedNavLinkProps>(
  (
    {
      children,
      href,
      onClick,
      onFocus,
      onPointerEnter,
      target,
      ...props
    },
    ref,
  ) => {
    const router = useRouter();
    const { isTransitioning, transitionTo } = useRouteTransition();

    const prefetch = () => {
      const targetRoute = getRouteTarget(href);
      if (!targetRoute.isInternal) return;

      router.prefetch(targetRoute.href);
    };

    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        (target && target !== "_self") ||
        props.download ||
        shouldUseNativeNavigation(event)
      ) {
        return;
      }

      event.preventDefault();

      if (isTransitioning) return;

      onClick?.(event);
      void transitionTo(href, event.currentTarget);
    };

    return (
      <Link
        {...props}
        ref={ref}
        href={href}
        target={target}
        onClick={handleClick}
        onFocus={(event) => {
          prefetch();
          onFocus?.(event);
        }}
        onPointerEnter={(event) => {
          prefetch();
          onPointerEnter?.(event);
        }}
      >
        {children}
      </Link>
    );
  },
);

AnimatedNavLink.displayName = "AnimatedNavLink";

export default AnimatedNavLink;
