import { forwardRef, type ReactNode } from "react";
import Field from "./Field";
import Select, { type SelectProps } from "./Select";

export type SelectFieldProps = Omit<SelectProps, "id" | "required"> & {
  label: ReactNode;
  id?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  optionalLabel?: ReactNode;
  fieldClassName?: string;
};

const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
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
      <Select {...controlProps} ref={ref} required={required} />
    </Field>
  );
});

export default SelectField;
