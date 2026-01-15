"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type TestimonialsCTAButtonProps = {
  children: ReactNode;
  className?: string;
};

const TestimonialsCTAButton = ({
  children,
  className,
}: TestimonialsCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button variant="cta" className={className} onClick={() => openLeadForm()}>
      {children}
    </Button>
  );
};

export default TestimonialsCTAButton;
