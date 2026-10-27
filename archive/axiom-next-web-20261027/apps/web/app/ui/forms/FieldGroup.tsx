import clsx from "clsx";
import { AlertCircle } from "lucide-react";
import type { ReactNode } from "react";
import s from "./forms.module.css";

export type FieldGroupContract = {
  describedBy?: string;
  invalid: boolean;
  required: boolean;
};

type FieldGroupProps = {
  children: (contract: FieldGroupContract) => ReactNode;
  controlId: string;
  legend: ReactNode;
  className?: string;
  componentName?: string;
  disabled?: boolean;
  error?: ReactNode;
  hint?: ReactNode;
  optionalLabel?: ReactNode;
  required?: boolean;
};

export default function FieldGroup({
  children,
  className,
  componentName = "field-group",
  controlId,
  disabled = false,
  error,
  hint,
  legend,
  optionalLabel = "Volitelné",
  required = false,
}: FieldGroupProps) {
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <fieldset
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
      className={clsx(s.fieldGroup, className)}
      data-component={componentName}
      data-field-invalid={error ? "true" : undefined}
      disabled={disabled}
      id={`${controlId}-group`}
    >
      <legend className={s.fieldLabel}>
        <span>{legend}</span>
        <small>{required ? "Povinné" : optionalLabel}</small>
      </legend>
      {hint ? <p className={s.fieldHint} id={hintId}>{hint}</p> : null}
      <div className={s.fieldGroupOptions}>
        {children({ describedBy, invalid: Boolean(error), required })}
      </div>
      {error ? (
        <p className={s.fieldError} id={errorId}>
          <AlertCircle aria-hidden="true" />
          <span>Chyba: {error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}
