"use client";

import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Touch-only visitors never mount this enhancement, so they should not download
// or evaluate its GSAP, geometry tracking, and presentation code either.
const CustomCursor = dynamic(() => import("./CustomCursor"), { ssr: false });

const FINE_POINTER_QUERY = "(any-hover: hover) and (any-pointer: fine)";
const FORCED_COLORS_QUERY = "(forced-colors: active)";
const EXCLUDED_ROUTE_PREFIXES = [
  "/design-language",
  "/runtime",
  "/test-jednoho-prijmu",
];

export default function CursorProvider() {
  const pathname = usePathname();
  const [supportsCustomCursor, setSupportsCustomCursor] = useState(false);

  useEffect(() => {
    const finePointerQuery = window.matchMedia(FINE_POINTER_QUERY);
    const forcedColorsQuery = window.matchMedia(FORCED_COLORS_QUERY);
    const syncPointerCapability = () => {
      setSupportsCustomCursor(
        finePointerQuery.matches && !forcedColorsQuery.matches,
      );
    };
    const detectMousePointer = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && !forcedColorsQuery.matches) {
        setSupportsCustomCursor(true);
      }
    };

    syncPointerCapability();
    finePointerQuery.addEventListener("change", syncPointerCapability);
    forcedColorsQuery.addEventListener("change", syncPointerCapability);
    window.addEventListener("pointermove", detectMousePointer, { passive: true });

    return () => {
      finePointerQuery.removeEventListener("change", syncPointerCapability);
      forcedColorsQuery.removeEventListener("change", syncPointerCapability);
      window.removeEventListener("pointermove", detectMousePointer);
      document.documentElement.classList.remove("custom-cursor-ready");
    };
  }, []);

  const isExcludedRoute = EXCLUDED_ROUTE_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );

  if (!supportsCustomCursor || isExcludedRoute) return null;

  return <CustomCursor key={pathname} />;
}
