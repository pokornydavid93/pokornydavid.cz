import clsx from "clsx";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

type ButtonVariant = "primary" | "secondary" | "quiet";

type ButtonBaseProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> & {
  loading?: boolean;
  loadingLabel?: string;
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};

type LabelButtonProps = ButtonBaseProps & {
  variant?: ButtonVariant;
  children: ReactNode;
};

export type ButtonProps = LabelButtonProps;

export default function Button({
  children,
  className,
  disabled,
  endIcon,
  loading = false,
  loadingLabel = "Načítání…",
  startIcon,
  type = "button",
  variant = "primary",
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      aria-busy={loading || rest["aria-busy"] || undefined}
      className={clsx(s.button, s[`button-${variant}`], className)}
      data-component="button"
      data-variant={variant}
      disabled={disabled || loading}
      type={type}
    >
      {loading ? (
        <>
          <span aria-hidden="true" className={s.loadingIndicator}>•••</span>
          <span className={s.visuallyHidden}>{loadingLabel}</span>
        </>
      ) : (
        <>
          {startIcon ? <span aria-hidden="true" className={s.controlIcon}>{startIcon}</span> : null}
          <span>{children}</span>
          {endIcon ? <span aria-hidden="true" className={s.controlIcon}>{endIcon}</span> : null}
        </>
      )}
    </button>
  );
}
