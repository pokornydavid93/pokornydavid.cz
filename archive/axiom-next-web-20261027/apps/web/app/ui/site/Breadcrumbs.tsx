import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import Link from "../primitives/Link";
import s from "./site.module.css";

export type BreadcrumbItem = {
  label: ReactNode;
  href?: string;
};

export type BreadcrumbsProps = {
  items: readonly BreadcrumbItem[];
  ariaLabel?: string;
};

export default function Breadcrumbs({
  ariaLabel = "Drobečková navigace",
  items,
}: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={ariaLabel} className={s.breadcrumbs} data-component="breadcrumbs">
      <ol>
        {items.map((item, index) => {
          const current = index === items.length - 1;

          return (
            <li key={`${index}-${String(item.label)}`}>
              {current || !item.href ? (
                <span aria-current={current ? "page" : undefined}>{item.label}</span>
              ) : (
                <Link href={item.href} variant="text">{item.label}</Link>
              )}
              {!current ? <ChevronRight aria-hidden="true" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
