"use client";

import { ReactNode } from "react";

import Button from "@/app/ui/cta/Button";
import { useLeadFormModal } from "../../Providers/LeadFormModalProvider";

type HeroCTAClientProps = {
  label: string;
  iconRight?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const HeroCTAClient = ({
  label,
  iconRight,
  size = "md",
  className,
}: HeroCTAClientProps) => {
  const { openLeadForm } = useLeadFormModal();

  return (
    <Button
      variant="cta"
      label={label}
      onClick={() => openLeadForm()}
      iconRight={iconRight}
      size={size}
      className={className}
    />
  );
};

export default HeroCTAClient;
