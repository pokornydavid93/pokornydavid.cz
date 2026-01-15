"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type FooterCTAButtonProps = {
  className?: string;
  iconRight?: ReactNode;
  children: ReactNode;
};

const FooterCTAButton = ({
  className,
  iconRight,
  children,
}: FooterCTAButtonProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button
      variant="cta"
      className={className}
      iconRight={iconRight}
      onClick={() => openLeadForm()}
    >
      {children}
    </Button>
  );
};

export default FooterCTAButton;
