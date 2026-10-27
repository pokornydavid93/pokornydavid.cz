"use client";

import clsx from "clsx";
import { AlertCircle } from "lucide-react";
import {
  cloneElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import s from "./forms.module.css";

type FieldControlProps = {
  id?: string;
  required?: boolean;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

export type FieldProps = {
  children: ReactElement<FieldControlProps>;
  label: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optionalLabel?: ReactNode;
  className?: string;
};

export default function Field({
  children,
  className,
  error,
  hint,
  id,
  label,
  optionalLabel = "Volitelné",
  required = false,
}: FieldProps) {
  const generatedId = useId().replaceAll(":", "");
  const controlId = id ?? children.props.id ?? `field-${generatedId}`;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [
    children.props["aria-describedby"],
    hintId,
    errorId,
  ]
    .filter(Boolean)
    .join(" ") || undefined;

  const control = cloneElement(children, {
    id: controlId,
    required: children.props.required ?? required,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : children.props["aria-invalid"],
  });

  return (
    <div
      className={clsx(s.field, className)}
      data-component="field"
      data-field-invalid={error ? "true" : undefined}
    >
      <label className={s.fieldLabel} htmlFor={controlId}>
        <span>{label}</span>
        <small>{required ? "Povinné" : optionalLabel}</small>
      </label>
      {hint ? <p className={s.fieldHint} id={hintId}>{hint}</p> : null}
      {control}
      {error ? (
        <p className={s.fieldError} id={errorId}>
          <AlertCircle aria-hidden="true" />
          <span>Chyba: {error}</span>
        </p>
      ) : null}
    </div>
  );
}
