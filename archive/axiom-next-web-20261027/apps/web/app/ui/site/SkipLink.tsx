import clsx from "clsx";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import s from "./site.module.css";

export type SkipLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "href"
> & {
  children?: ReactNode;
  targetId?: string;
};

export default function SkipLink({
  children = "Přeskočit na obsah",
  className,
  targetId = "main-content",
  ...rest
}: SkipLinkProps) {
  return (
    <a
      {...rest}
      className={clsx(s.skipLink, className)}
      data-component="skip-link"
      href={`#${targetId}`}
    >
      {children}
    </a>
  );
}
