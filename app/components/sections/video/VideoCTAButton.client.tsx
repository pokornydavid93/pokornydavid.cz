"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type VideoCTAButtonProps = {
  children: ReactNode;
  className?: string;
};

const VideoCTAButton = ({ children, className }: VideoCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button variant="cta" className={className} onClick={() => openLeadForm()}>
      {children}
    </Button>
  );
};

export default VideoCTAButton;
