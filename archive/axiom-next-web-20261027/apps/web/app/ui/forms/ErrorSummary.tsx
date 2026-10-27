"use client";

import clsx from "clsx";
import { AlertCircle } from "lucide-react";
import { useEffect, useId, useRef, type ElementType, type ReactNode } from "react";
import s from "./forms.module.css";

export type FieldError = {
  fieldId: string;
  message: ReactNode;
};

export type ErrorSummaryProps = {
  errors: readonly FieldError[];
  title?: ReactNode;
  headingLevel?: "h2" | "h3" | "h4";
  focusOnMount?: boolean;
  focusKey?: number;
  announce?: "off" | "assertive";
  className?: string;
};

export default function ErrorSummary({
  announce = "off",
  className,
  errors,
  focusKey = 0,
  focusOnMount = false,
  headingLevel = "h2",
  title = "Chyba: zkontrolujte formulář",
}: ErrorSummaryProps) {
  const titleId = useId();
  const summaryRef = useRef<HTMLElement>(null);
  const Heading: ElementType = headingLevel;
  const shouldFocus = focusOnMount && errors.length > 0;

  useEffect(() => {
    if (shouldFocus) summaryRef.current?.focus();
  }, [focusKey, shouldFocus]);

  if (errors.length === 0) return null;

  return (
    <section
      aria-labelledby={titleId}
      className={clsx(s.errorSummary, className)}
      data-component="error-summary"
      ref={summaryRef}
      role={announce === "assertive" ? "alert" : undefined}
      tabIndex={-1}
    >
      <AlertCircle aria-hidden="true" />
      <div>
        <Heading id={titleId}>{title}</Heading>
        <ul>
          {errors.map((error) => (
            <li key={error.fieldId}>
              <a
                href={`#${error.fieldId}`}
                onClick={() => {
                  document.getElementById(error.fieldId)?.focus();
                }}
              >
                {error.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
