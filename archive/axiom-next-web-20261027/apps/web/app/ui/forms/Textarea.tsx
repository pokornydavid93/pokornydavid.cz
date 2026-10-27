import clsx from "clsx";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import s from "./forms.module.css";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  name: string;
  autoComplete: string;
  resize?: "none" | "vertical";
};

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    autoComplete,
    className,
    name,
    resize = "vertical",
    rows = 4,
    ...rest
  },
  ref,
) {
  return (
    <textarea
      {...rest}
      autoComplete={autoComplete}
      className={clsx(s.control, s.textarea, className)}
      data-component="textarea"
      data-resize={resize}
      name={name}
      ref={ref}
      rows={rows}
    />
  );
});

export default Textarea;
