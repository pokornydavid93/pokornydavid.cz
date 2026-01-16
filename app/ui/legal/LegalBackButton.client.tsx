"use client";

import type { ButtonHTMLAttributes, MouseEvent } from "react";
import { useLegalReturn } from "./useLegalReturn";

type LegalBackButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label?: string;
};

const LegalBackButton = ({
  label = "← Zpět",
  onClick,
  ...props
}: LegalBackButtonProps) => {
  const { goBackFromLegal } = useLegalReturn();

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    goBackFromLegal();
  };

  return (
    <button type="button" {...props} onClick={handleClick}>
      {label}
    </button>
  );
};

export default LegalBackButton;
