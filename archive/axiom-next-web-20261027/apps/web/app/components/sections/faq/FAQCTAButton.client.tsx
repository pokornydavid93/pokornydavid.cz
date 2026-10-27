"use client";

import { ReactNode } from "react";
import { Send } from "lucide-react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type FAQCTAButtonProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

const FAQCTAButton = ({ label, children, className }: FAQCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  const onCtaClick = () => {
    gaEvent("cta_click", { location: "faq", label });
    gaEvent("lead_modal_open", { location: "faq" });
    openLeadForm();
  };

  return (
    <Button
      variant="cta"
      className={className}
      onClick={onCtaClick}
      iconRight={<Send aria-hidden="true" size={18} strokeWidth={2} />}
    >
      {children}
    </Button>
  );
};

export default FAQCTAButton;
