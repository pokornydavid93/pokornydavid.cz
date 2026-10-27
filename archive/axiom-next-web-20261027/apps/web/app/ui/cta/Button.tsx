import type {
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import s from "./button.module.css";

type BaseProps = {
  children?: ReactNode;
  label?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "cta";
  size?: "sm" | "md" | "lg";
  className?: string;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "href"> & {
    href?: undefined;
  };

type ButtonAsLink = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const Button = ({
  label,
  children,
  iconLeft,
  iconRight,
  loading,
  variant = "primary",
  size = "md",
  className = "",
  href,
  ...rest
}: ButtonProps) => {
  const content = (
    <>
      {loading && <span className={s.loader} />}
      {!loading && iconLeft && <span className={s.iconLeft}>{iconLeft}</span>}
      <span className={s.label}>{label || children}</span>
      {!loading && iconRight && <span className={s.iconRight}>{iconRight}</span>}
    </>
  );

  const classNames = `
    ${s.button}
    ${s[variant]}
    ${s[size]}
    ${loading ? s.loading : ""}
    ${className}
  `.trim();

  // If href exists → render <Link>
  if (href) {
    const linkProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    const isLinkDisabled =
      loading ||
      linkProps["aria-disabled"] === true ||
      linkProps["aria-disabled"] === "true";
    const handleClick: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] = (
      event
    ) => {
      if (isLinkDisabled) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      linkProps.onClick?.(event);
    };

    return (
      <Link
        href={href}
        className={classNames}
        {...linkProps}
        aria-busy={loading || linkProps["aria-busy"] || undefined}
        aria-disabled={isLinkDisabled || undefined}
        data-cursor-control="button"
        onClick={handleClick}
      >
        {content}
      </Link>
    );
  }

  // Otherwise → button
  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  const isDisabled = loading || buttonProps.disabled;

  return (
    <button
      className={classNames}
      {...buttonProps}
      disabled={isDisabled}
      aria-busy={loading || buttonProps["aria-busy"] || undefined}
      data-cursor-control="button"
    >
      {content}
    </button>
  );
};

export default Button;
