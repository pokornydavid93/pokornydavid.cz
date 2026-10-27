import clsx from "clsx";
import { AlertCircle, AlertTriangle, BadgeCheck, Info } from "lucide-react";
import type { HTMLAttributes, ReactNode } from "react";
import s from "./primitives.module.css";

export type NoticeProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  title?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  live?: "polite" | "assertive";
};

const noticeIcons = {
  info: Info,
  success: BadgeCheck,
  warning: AlertTriangle,
  error: AlertCircle,
} as const;

export default function Notice({
  action,
  children,
  className,
  live,
  role,
  title,
  tone = "info",
  ...rest
}: NoticeProps) {
  const NoticeIcon = noticeIcons[tone];

  return (
    <aside
      {...rest}
      className={clsx(s.notice, s[`notice-${tone}`], className)}
      data-component="notice"
      data-tone={tone}
      role={role ?? (live === "assertive" ? "alert" : live === "polite" ? "status" : undefined)}
    >
      <NoticeIcon aria-hidden="true" />
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
      {action ? <div className={s.noticeAction}>{action}</div> : null}
    </aside>
  );
}
