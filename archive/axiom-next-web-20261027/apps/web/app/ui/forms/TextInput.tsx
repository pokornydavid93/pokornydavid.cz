import clsx from "clsx";
import { forwardRef, type InputHTMLAttributes } from "react";
import s from "./forms.module.css";

export type TextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "type"
> & {
  name: string;
  autoComplete: string;
  type?: "text" | "email" | "tel" | "url" | "password";
};

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  {
    autoComplete,
    className,
    inputMode,
    name,
    spellCheck,
    type = "text",
    ...rest
  },
  ref,
) {
  const semanticInputMode =
    inputMode ??
    (type === "email" ? "email" : type === "tel" ? "tel" : type === "url" ? "url" : undefined);

  return (
    <input
      {...rest}
      autoComplete={autoComplete}
      className={clsx(s.control, className)}
      data-component="text-input"
      inputMode={semanticInputMode}
      name={name}
      ref={ref}
      spellCheck={spellCheck ?? (type === "email" || type === "url" ? false : undefined)}
      type={type}
    />
  );
});

export default TextInput;
