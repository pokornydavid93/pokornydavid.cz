"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";

import buttonStyles from "@/app/ui/cta/button.module.css";
import AnimatedNavLink from "./AnimatedNavLink";

type AnimatedButtonLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
  className?: string;
  href: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  label?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "ghost" | "cta";
};

export default function AnimatedButtonLink({
  children,
  className = "",
  href,
  iconLeft,
  iconRight,
  label,
  size = "md",
  variant = "primary",
  ...props
}: AnimatedButtonLinkProps) {
  const classNames = `
    ${buttonStyles.button}
    ${buttonStyles[variant]}
    ${buttonStyles[size]}
    ${className}
  `.trim();

  return (
    <AnimatedNavLink
      href={href}
      className={classNames}
      {...props}
      data-cursor-control="button"
    >
      {iconLeft ? <span className={buttonStyles.iconLeft}>{iconLeft}</span> : null}
      <span className={buttonStyles.label}>{label || children}</span>
      {iconRight ? (
        <span className={buttonStyles.iconRight}>{iconRight}</span>
      ) : null}
    </AnimatedNavLink>
  );
}
