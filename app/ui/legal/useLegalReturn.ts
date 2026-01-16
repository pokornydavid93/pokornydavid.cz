"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

const LEGAL_ROUTES = [
  "/zasady-zpracovani-osobnich-udaju",
  "/pravni-informace",
  "/cookies-a-mereni",
];

const RETURN_TO_PATH_KEY = "legal:returnToPath";
const RETURN_TO_SCROLL_KEY = "legal:returnToScrollY";
const RESTORE_SCROLL_KEY = "legal:restoreScrollY";

const isLegalPath = (pathname: string) =>
  LEGAL_ROUTES.some((route) => route === pathname);

const getCurrentPathWithHash = () => {
  const { pathname, hash } = window.location;
  return `${pathname}${hash ?? ""}`;
};

const getScrollY = () => Math.round(window.scrollY || 0);

export const consumeScrollRestore = () => {
  if (typeof window === "undefined") return null;
  const stored = window.sessionStorage.getItem(RESTORE_SCROLL_KEY);
  if (!stored) return null;
  window.sessionStorage.removeItem(RESTORE_SCROLL_KEY);
  const value = Number(stored);
  return Number.isFinite(value) ? value : null;
};

export const useLegalReturn = () => {
  const router = useRouter();

  const saveReturnContext = useCallback(() => {
    if (typeof window === "undefined") return;
    if (isLegalPath(window.location.pathname)) return;
    window.sessionStorage.setItem(RETURN_TO_PATH_KEY, getCurrentPathWithHash());
    window.sessionStorage.setItem(RETURN_TO_SCROLL_KEY, String(getScrollY()));
  }, []);

  const goBackFromLegal = useCallback(() => {
    if (typeof window === "undefined") return;
    const returnToParam = new URLSearchParams(window.location.search).get(
      "returnTo"
    );
    const returnTo =
      returnToParam || window.sessionStorage.getItem(RETURN_TO_PATH_KEY) || "/";
    const scrollY = window.sessionStorage.getItem(RETURN_TO_SCROLL_KEY);
    if (scrollY) {
      window.sessionStorage.setItem(RESTORE_SCROLL_KEY, scrollY);
    }
    window.sessionStorage.removeItem(RETURN_TO_PATH_KEY);
    window.sessionStorage.removeItem(RETURN_TO_SCROLL_KEY);
    router.push(returnTo);
  }, [router]);

  return {
    saveReturnContext,
    goBackFromLegal,
  };
};
