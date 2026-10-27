"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import s from "./primitives.module.css";

export type DisclosureProps = {
  summary: ReactNode;
  children: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
};

export default function Disclosure({
  children,
  className,
  defaultExpanded = false,
  expanded,
  onExpandedChange,
  summary,
}: DisclosureProps) {
  const panelId = useId();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = expanded ?? internalExpanded;

  const setExpanded = (nextExpanded: boolean) => {
    if (expanded === undefined) setInternalExpanded(nextExpanded);
    onExpandedChange?.(nextExpanded);
  };

  return (
    <div className={clsx(s.disclosure, className)} data-component="disclosure">
      <button
        aria-controls={panelId}
        aria-expanded={isExpanded}
        onClick={() => setExpanded(!isExpanded)}
        type="button"
      >
        <span>{summary}</span>
        <ChevronDown aria-hidden="true" />
      </button>
      <div hidden={!isExpanded} id={panelId} role="region">
        {children}
      </div>
    </div>
  );
}
