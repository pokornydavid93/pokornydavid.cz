import clsx from "clsx";
import { forwardRef, type SelectHTMLAttributes } from "react";
import s from "./forms.module.css";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string;
  autoComplete: string;
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { autoComplete, children, className, name, ...rest },
  ref,
) {
  return (
    <select
      {...rest}
      autoComplete={autoComplete}
      className={clsx(s.control, s.select, className)}
      data-component="select"
      name={name}
      ref={ref}
    >
      {children}
    </select>
  );
});

export default Select;
