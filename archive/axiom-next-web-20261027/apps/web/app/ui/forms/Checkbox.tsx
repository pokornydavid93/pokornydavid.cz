"use client";

import clsx from "clsx";
import { AlertCircle, Check, Minus } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import s from "./forms.module.css";

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "children" | "type"
> & {
  children: ReactNode;
  name: string;
  indeterminate?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: ReactNode;
};

export default function Checkbox({
  children,
  className,
  error,
  hint,
  id,
  indeterminate = false,
  name,
  optionalLabel = "Volitelné",
  ...rest
}: CheckboxProps) {
  const generatedId = useId().replaceAll(":", "");
  const controlId = id ?? `checkbox-${generatedId}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [rest["aria-describedby"], hintId, errorId]
    .filter(Boolean)
    .join(" ") || undefined;

  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <div
      className={clsx(s.checkField, className)}
      data-component="checkbox"
      data-field-invalid={error ? "true" : undefined}
    >
      <label className={s.checkOption} htmlFor={controlId}>
        <input
          {...rest}
          aria-describedby={describedBy}
          aria-invalid={error ? true : rest["aria-invalid"]}
          id={controlId}
          name={name}
          ref={inputRef}
          type="checkbox"
        />
        <span aria-hidden="true" className={s.checkboxIndicator}>
          {indeterminate ? <Minus /> : <Check />}
        </span>
        <span className={s.checkCopy}>
          <span className={s.choiceLabel}>
            <span>{children}</span>
            <small>{rest.required ? "Povinné" : optionalLabel}</small>
          </span>
          {hint ? <small className={s.fieldHint} id={hintId}>{hint}</small> : null}
        </span>
      </label>
      {error ? (
        <p className={s.fieldError} id={errorId}>
          <AlertCircle aria-hidden="true" />
          <span>Chyba: {error}</span>
        </p>
      ) : null}
    </div>
  );
}
