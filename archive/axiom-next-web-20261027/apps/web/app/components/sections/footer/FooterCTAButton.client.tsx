"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type FooterCTAButtonProps = {
  className?: string;
  iconRight?: ReactNode;
  label: string;
  children: ReactNode;
};

const FooterCTAButton = ({
  className,
  iconRight,
  label,
  children,
}: FooterCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  const onCtaClick = () => {
    gaEvent("cta_click", { location: "footer", label });
    gaEvent("lead_modal_open", { location: "footer" });
    openLeadForm();
  };

  return (
    <Button
      variant="cta"
      className={className}
      iconRight={iconRight}
      onClick={onCtaClick}
    >
      {children}
    </Button>
  );
};

export default FooterCTAButton;
