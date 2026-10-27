import { forwardRef, type ReactNode } from "react";
import Field from "./Field";
import TextInput, { type TextInputProps } from "./TextInput";

export type TextFieldProps = Omit<TextInputProps, "id" | "required"> & {
  label: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optionalLabel?: ReactNode;
  fieldClassName?: string;
};

const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
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
      <TextInput {...controlProps} ref={ref} required={required} />
    </Field>
  );
});

export default TextField;
