import clsx from "clsx";
import type { ReactNode } from "react";
import Link from "../primitives/Link";
import s from "./domain.module.css";

const verifiedDateFormatter = new Intl.DateTimeFormat("cs-CZ", {
  dateStyle: "medium",
  timeZone: "Europe/Prague",
});

export type ProofItemProps = {
  value: ReactNode;
  label: ReactNode;
  description: ReactNode;
  source: ReactNode;
  sourceUrl?: string;
  verifiedAt: string;
  icon?: ReactNode;
  kind?: "metric" | "credential" | "association" | "regulatory";
  className?: string;
};

export default function ProofItem({
  className,
  description,
  icon,
  kind = "credential",
  label,
  source,
  sourceUrl,
  value,
  verifiedAt,
}: ProofItemProps) {
  const verifiedDate = verifiedDateFormatter.format(new Date(`${verifiedAt}T12:00:00Z`));

  return (
    <div className={clsx(s.proofItem, className)} data-component="proof-item" data-kind={kind}>
      {icon ? <span aria-hidden="true" className={s.proofIcon}>{icon}</span> : null}
      <strong>{value}</strong>
      <span>{label}</span>
      <p className={s.proofDescription}>{description}</p>
      <div className={s.proofEvidence}>
        <span>
          Zdroj: {sourceUrl ? <Link href={sourceUrl}>{source}</Link> : source}
        </span>
        <time dateTime={verifiedAt}>Ověřeno {verifiedDate}</time>
      </div>
    </div>
  );
}
