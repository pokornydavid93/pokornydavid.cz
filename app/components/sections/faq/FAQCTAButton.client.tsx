"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type FAQCTAButtonProps = {
  children: ReactNode;
  className?: string;
};

const FAQCTAButton = ({ children, className }: FAQCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button variant="cta" className={className} onClick={() => openLeadForm()}>
      {children}
    </Button>
  );
};

export default FAQCTAButton;
