"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type ServicesCTAButtonProps = {
  serviceTitle: string;
  className?: string;
  children?: ReactNode;
};

const ServicesCTAButton = ({
  serviceTitle,
  className,
  children,
}: ServicesCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button
      variant="cta"
      className={className}
      onClick={() => openLeadForm(serviceTitle)}
    >
      {children}
    </Button>
  );
};

export default ServicesCTAButton;
