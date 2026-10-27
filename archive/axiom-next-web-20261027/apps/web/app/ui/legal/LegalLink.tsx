"use client";

import Link, { type LinkProps } from "next/link";
import type { AnchorHTMLAttributes, PropsWithChildren, MouseEvent } from "react";
import { useLegalReturn } from "./useLegalReturn";

type LegalLinkProps = PropsWithChildren<
  LinkProps &
    AnchorHTMLAttributes<HTMLAnchorElement> & {
      onRequestClose?: () => void;
    }
>;

const LegalLink = ({
  onClick,
  target,
  onRequestClose,
  children,
  ...props
}: LegalLinkProps) => {
  const { saveReturnContext } = useLegalReturn();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      target === "_blank"
    ) {
      return;
    }
    saveReturnContext();
    onRequestClose?.();
  };

  return (
    <Link {...props} target={target} onClick={handleClick}>
      {children}
    </Link>
  );
};

export default LegalLink;
