import type { HTMLAttributes, PropsWithChildren, ReactNode } from "react";
import s from "./primitiveField.module.css";

type PrimitiveFieldProps = PropsWithChildren<HTMLAttributes<HTMLLabelElement>> & {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  optionalLabel?: ReactNode;
};

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PrimitiveField({
  children,
  className,
  description,
  error,
  label,
  optionalLabel,
  ...rest
}: PrimitiveFieldProps) {
  const hasError = Boolean(error);

  return (
    <label
      className={joinClasses(s.field, hasError && s.invalid, className)}
      data-field-invalid={hasError ? "true" : undefined}
      {...rest}
    >
      <span className={s.header}>
        <span className={s.label}>{label}</span>
        {optionalLabel ? <span className={s.optional}>{optionalLabel}</span> : null}
      </span>
      {description ? <span className={s.description}>{description}</span> : null}
      {children}
      {error ? <span className={s.error}>{error}</span> : null}
    </label>
  );
}
