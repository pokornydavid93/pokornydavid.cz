"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { consumeScrollRestore } from "@/app/ui/legal/useLegalReturn";

const MAX_ATTEMPTS = 10;

const scrollToPosition = (target: number) => {
  const lenis = (
    window as unknown as {
      __lenis?: {
        scrollTo?: (
          position: number,
          options?: { immediate?: boolean; force?: boolean }
        ) => void;
      };
    }
  ).__lenis;
  if (lenis?.scrollTo) {
    lenis.scrollTo(target, { immediate: true, force: true });
    return;
  }

  window.scrollTo({ top: target, left: 0, behavior: "auto" });
};

const LegalScrollRestoreProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = consumeScrollRestore();
    if (target === null) return;

    let attempts = 0;

    const tryRestore = () => {
      attempts += 1;
      scrollToPosition(target);
      if (Math.abs(window.scrollY - target) <= 2) return;
      if (attempts < MAX_ATTEMPTS) {
        requestAnimationFrame(tryRestore);
      }
    };

    requestAnimationFrame(tryRestore);
  }, [pathname]);

  return <>{children}</>;
};

export default LegalScrollRestoreProvider;
