import { forwardRef, type ReactNode } from "react";
import Field from "./Field";
import Textarea, { type TextareaProps } from "./Textarea";

export type TextareaFieldProps = Omit<TextareaProps, "id" | "required"> & {
  label: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optionalLabel?: ReactNode;
  fieldClassName?: string;
};

const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(function TextareaField(
  {
    error,
    fieldClassName,
    hint,
    id,
    label,
    optionalLabel,
    required = false,
    ...controlProps
  },
  ref,
) {
  return (
    <Field
      className={fieldClassName}
      error={error}
      hint={hint}
      id={id}
      label={label}
      optionalLabel={optionalLabel}
      required={required}
    >
      <Textarea {...controlProps} ref={ref} required={required} />
    </Field>
  );
});

export default TextareaField;
