import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import Link from "../primitives/Link";
import Surface from "../primitives/Surface";
import s from "./domain.module.css";
import { toneForSurface, type DomainSurfaceRole } from "./surfaceTone";

export type ServiceCardProps = {
  title: ReactNode;
  problem: ReactNode;
  result: ReactNode;
  href: string;
  metadata?: readonly ReactNode[];
  linkLabel?: ReactNode;
  surface?: DomainSurfaceRole;
};

export default function ServiceCard({
  href,
  linkLabel = "Detail služby",
  metadata = [],
  problem,
  result,
  surface = "card-dark",
  title,
}: ServiceCardProps) {
  return (
    <Surface
      as="article"
      className={s.serviceCard}
      componentName="service-card"
      surface={surface}
      tone={toneForSurface(surface)}
    >
      <header>
        <span className={s.eyebrow}>Služba</span>
        <h3>{title}</h3>
      </header>
      <dl className={s.serviceOutcomes}>
        <div><dt>Výchozí situace</dt><dd>{problem}</dd></div>
        <div><dt>Výsledek</dt><dd>{result}</dd></div>
      </dl>
      {metadata.length > 0 ? (
        <ul className={s.metadataList} aria-label="Kontext služby">
          {metadata.map((item, index) => <li key={index}>{item}</li>)}
        </ul>
      ) : null}
      <Link className={s.cardAction} href={href} variant="text">
        <span>{linkLabel}</span><ArrowUpRight aria-hidden="true" />
      </Link>
    </Surface>
  );
}
