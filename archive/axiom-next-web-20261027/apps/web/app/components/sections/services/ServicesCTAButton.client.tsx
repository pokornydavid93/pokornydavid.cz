"use client";

import { ReactNode } from "react";
import type { LeadTopic } from "@/lib/api";
import { dispatchLeadFormPrefillEvent } from "../leadForm/leadFormPrefillEvent";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

const LEAD_FORM_TARGET = "#lead-form";

type ServicesCTAButtonProps = {
  topic: LeadTopic;
  label: string;
  className?: string;
  children?: ReactNode;
  "aria-label"?: string;
};

const ServicesCTAButton = ({
  topic,
  label,
  className,
  children,
  "aria-label": ariaLabel,
}: ServicesCTAButtonProps) => {
  const onCtaClick = () => {
    gaEvent("cta_click", { location: "services", label, topic });
    dispatchLeadFormPrefillEvent({ topic, focus: true });

    const target = document.querySelector<HTMLElement>(LEAD_FORM_TARGET);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <button
      type="button"
      className={className}
      onClick={onCtaClick}
      aria-label={ariaLabel}
    >
      {children}
    </button>
  );
};

export default ServicesCTAButton;
