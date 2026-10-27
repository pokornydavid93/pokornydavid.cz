"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type AboutCTAButtonProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const AboutCTAButton = ({ label, children, className }: AboutCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  const onCtaClick = () => {
    gaEvent("cta_click", { location: "about", label });
    gaEvent("lead_modal_open", { location: "about" });
    openLeadForm();
  };

  return (
    <Button variant="cta" className={className} onClick={onCtaClick}>
      {children}
    </Button>
  );
};

export default AboutCTAButton;
