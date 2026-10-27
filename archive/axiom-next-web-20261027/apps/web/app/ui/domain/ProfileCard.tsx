import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import Link from "../primitives/Link";
import ResponsiveMedia, { type ResponsiveMediaProps } from "../primitives/ResponsiveMedia";
import Surface from "../primitives/Surface";
import s from "./domain.module.css";
import { toneForSurface, type DomainSurfaceRole } from "./surfaceTone";

export type ProfileCardProps = {
  name: ReactNode;
  role: ReactNode;
  bio: ReactNode;
  portrait: ResponsiveMediaProps;
  href?: string;
  actionLabel?: ReactNode;
  surface?: DomainSurfaceRole;
};

export default function ProfileCard({
  actionLabel = "Poznat mě",
  bio,
  href,
  name,
  portrait,
  role,
  surface = "card-dark",
}: ProfileCardProps) {
  return (
    <Surface
      as="article"
      className={s.profileCard}
      componentName="profile-card"
      surface={surface}
      tone={toneForSurface(surface)}
    >
      <ResponsiveMedia {...portrait} />
      <div className={s.cardBody}>
        <span className={s.eyebrow}>{role}</span>
        <h3>{name}</h3>
        <p>{bio}</p>
        {href ? (
          <Link className={s.cardAction} href={href} variant="text">
            <span>{actionLabel}</span><ArrowUpRight aria-hidden="true" />
          </Link>
        ) : null}
      </div>
    </Surface>
  );
}
