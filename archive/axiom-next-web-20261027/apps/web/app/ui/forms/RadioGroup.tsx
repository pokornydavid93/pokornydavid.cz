"use client";

import clsx from "clsx";
import { useId, type ReactNode } from "react";
import FieldGroup from "./FieldGroup";
import s from "./forms.module.css";

export type RadioOption = {
  value: string;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
};

export type RadioGroupProps = {
  legend: ReactNode;
  name: string;
  options: readonly RadioOption[];
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  optionalLabel?: ReactNode;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  "aria-describedby"?: string;
};

export default function RadioGroup({
  className,
  defaultValue,
  disabled = false,
  error,
  hint,
  id,
  legend,
  name,
  onValueChange,
  optionalLabel,
  options,
  required = false,
  value,
  ...rest
}: RadioGroupProps) {
  const generatedId = useId().replaceAll(":", "");
  const controlId = id ?? `radio-${generatedId}`;
  const externalDescription = rest["aria-describedby"];

  return (
    <FieldGroup
      className={clsx(s.radioGroup, className)}
      componentName="radio-group"
      controlId={controlId}
      disabled={disabled}
      error={error}
      hint={hint}
      legend={legend}
      optionalLabel={optionalLabel}
      required={required}
    >
      {({ describedBy }) => (
        <>
          {options.map((option, index) => {
            const optionId = index === 0 ? controlId : `${controlId}-${option.value}`;
            const optionDescription = [externalDescription, describedBy]
              .filter(Boolean)
              .join(" ") || undefined;

            return (
              <label className={s.radioOption} htmlFor={optionId} key={option.value}>
                <input
                  aria-describedby={optionDescription}
                  checked={value === undefined ? undefined : value === option.value}
                  defaultChecked={value === undefined && defaultValue === option.value}
                  disabled={option.disabled}
                  id={optionId}
                  name={name}
                  onChange={(event) => {
                    if (event.currentTarget.checked) onValueChange?.(option.value);
                  }}
                  required={required}
                  type="radio"
                  value={option.value}
                />
                <span aria-hidden="true" className={s.radioIndicator} />
                <span>
                  <strong>{option.label}</strong>
                  {option.description ? <small>{option.description}</small> : null}
                </span>
              </label>
            );
          })}
        </>
      )}
    </FieldGroup>
  );
}
