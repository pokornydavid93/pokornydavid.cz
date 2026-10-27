import clsx from "clsx";
import NextLink from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

export type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string;
  prefetch?: boolean | null;
  variant?: "text" | "primary-action" | "secondary-action";
  children: ReactNode;
};

export default function Link({
  children,
  className,
  href,
  variant = "text",
  ...rest
}: LinkProps) {
  return (
    <NextLink
      {...rest}
      className={clsx(s.link, s[`link-${variant}`], className)}
      data-component="link"
      data-cursor-control={variant === "text" ? undefined : "button"}
      data-variant={variant}
      href={href}
    >
      {children}
    </NextLink>
  );
}
