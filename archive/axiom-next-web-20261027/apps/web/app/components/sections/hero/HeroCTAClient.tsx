"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type HeroCTAClientProps = {
  label: string;
  iconRight?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
  location?: string;
};

const HeroCTAClient = ({
  label,
  iconRight,
  size = "md",
  className,
  location = "hero",
}: HeroCTAClientProps) => {
  const { openLeadForm } = useLeadFormModal();

  const onCtaClick = () => {
    gaEvent("cta_click", { location, label });
    gaEvent("lead_modal_open", { location });
    openLeadForm();
  };

  return (
    <Button
      data-cursor="action"
      data-cursor-icon="send"
      variant="cta"
      label={label}
      onClick={onCtaClick}
      iconRight={iconRight}
      size={size}
      className={className}
    />
  );
};

export default HeroCTAClient;
