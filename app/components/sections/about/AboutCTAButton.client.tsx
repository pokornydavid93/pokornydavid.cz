"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type AboutCTAButtonProps = {
  children: ReactNode;
  className?: string;
};

const AboutCTAButton = ({ children, className }: AboutCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button variant="cta" className={className} onClick={() => openLeadForm()}>
      {children}
    </Button>
  );
};

export default AboutCTAButton;
