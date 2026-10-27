"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type MouseEvent,
} from "react";
import primitiveStyles from "@/app/ui/primitives/primitives.module.css";

type LinkVariant = "text" | "primary-action" | "secondary-action";

type ArticleNavigationLinkProps = Omit<
  ComponentPropsWithoutRef<typeof Link>,
  "href"
> & {
  href: string;
  variant?: LinkVariant;
};

const ROUTE_COMMIT_TIMEOUT_MS = 4_000;
const INPUT_MOMENTUM_SETTLE_MS = 180;
const INPUT_MOMENTUM_IDLE_TIMEOUT_MS = 1_000;

let cancelActiveArticleNavigation: (() => void) | undefined;

function isSameTabNavigation(
  event: MouseEvent<HTMLAnchorElement>,
  target: ArticleNavigationLinkProps["target"],
  download: ArticleNavigationLinkProps["download"],
) {
  return (
    !event.defaultPrevented &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey &&
    (!target || target === "_self") &&
    !download
  );
}

function beginArticleNavigation(href: ArticleNavigationLinkProps["href"]) {
  const targetUrl = new URL(String(href), window.location.href);

  if (
    targetUrl.origin !== window.location.origin ||
    targetUrl.hash ||
    (targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search)
  ) {
    return;
  }

  cancelActiveArticleNavigation?.();

  const sourceMain = document.getElementById("main-content");
  const sourceLenis = window.__lenis;
  const shouldResumeLenis = Boolean(sourceLenis && !sourceLenis.isStopped);
  let animationFrame = 0;
  let idleCallback = 0;
  let settleTimer = 0;
  let timeoutTimer = 0;
  let released = false;
  let routeCommitted = false;

  const preventMomentum = (event: Event) => {
    event.preventDefault();

    if (routeCommitted) scheduleReleaseAfterInputSettles();
  };

  const syncToDocumentStart = () => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    window.__lenis?.scrollTo(0, { force: true, immediate: true });
  };

  const release = () => {
    if (released) return;
    released = true;

    window.cancelAnimationFrame(animationFrame);
    if (idleCallback) window.cancelIdleCallback?.(idleCallback);
    window.clearTimeout(settleTimer);
    window.clearTimeout(timeoutTimer);
    window.removeEventListener("wheel", preventMomentum, true);
    window.removeEventListener("touchmove", preventMomentum, true);
    delete document.documentElement.dataset.articleNavigationLock;

    if (
      shouldResumeLenis &&
      !document.body.hasAttribute("data-modal-open")
    ) {
      window.__lenis?.start();
    }

    if (cancelActiveArticleNavigation === release) {
      cancelActiveArticleNavigation = undefined;
    }
  };

  const scheduleReleaseAfterInputSettles = () => {
    if (idleCallback) {
      window.cancelIdleCallback?.(idleCallback);
      idleCallback = 0;
    }
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => {
      const finish = () => {
        if (released) return;
        syncToDocumentStart();
        release();
      };

      if (typeof window.requestIdleCallback === "function") {
        idleCallback = window.requestIdleCallback(
          () => {
            animationFrame = window.requestAnimationFrame(finish);
          },
          { timeout: INPUT_MOMENTUM_IDLE_TIMEOUT_MS },
        );
        return;
      }

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = window.requestAnimationFrame(finish);
      });
    }, INPUT_MOMENTUM_SETTLE_MS);
  };

  const settleAtDocumentStart = () => {
    routeCommitted = true;
    syncToDocumentStart();
    document.getElementById("main-content")?.focus({ preventScroll: true });
    scheduleReleaseAfterInputSettles();
  };

  const waitForRouteCommit = () => {
    const routeMatches =
      window.location.pathname === targetUrl.pathname &&
      window.location.search === targetUrl.search;
    const targetMain = document.getElementById("main-content");
    const contentCommitted = !sourceMain || targetMain !== sourceMain;

    if (routeMatches && contentCommitted) {
      settleAtDocumentStart();
      return;
    }

    animationFrame = window.requestAnimationFrame(waitForRouteCommit);
  };

  document.documentElement.dataset.articleNavigationLock = "true";
  window.addEventListener("wheel", preventMomentum, {
    capture: true,
    passive: false,
  });
  window.addEventListener("touchmove", preventMomentum, {
    capture: true,
    passive: false,
  });

  sourceLenis?.scrollTo(window.scrollY, { force: true, immediate: true });
  if (shouldResumeLenis) sourceLenis?.stop();

  cancelActiveArticleNavigation = release;
  timeoutTimer = window.setTimeout(release, ROUTE_COMMIT_TIMEOUT_MS);
  animationFrame = window.requestAnimationFrame(waitForRouteCommit);
}

/**
 * Keep old smooth-scroll and trackpad momentum from leaking into the next
 * article. The target route is committed first, then Lenis and native scroll
 * are synchronized at the document start before input is released.
 */
const ArticleNavigationLink = forwardRef<
  HTMLAnchorElement,
  ArticleNavigationLinkProps
>(
  (
    {
      children,
      className,
      download,
      onClick,
      scroll = true,
      target,
      variant,
      ...props
    },
    ref,
  ) => {
    const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
      onClick?.(event);

      if (!isSameTabNavigation(event, target, download)) return;

      beginArticleNavigation(props.href);
    };

    return (
      <Link
        {...props}
        ref={ref}
        className={clsx(
          variant && primitiveStyles.link,
          variant && primitiveStyles[`link-${variant}`],
          className,
        )}
        {...(variant
          ? { "data-component": "link", "data-variant": variant }
          : {})}
        data-article-navigation
        download={download}
        scroll={scroll}
        target={target}
        onClick={handleClick}
      >
        {children}
      </Link>
    );
  },
);

ArticleNavigationLink.displayName = "ArticleNavigationLink";

export default ArticleNavigationLink;
