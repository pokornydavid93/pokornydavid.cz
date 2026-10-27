"use client";

import HashLink from "@/app/ui/scroll/HashLink.client";
import { gaEvent } from "@/src/app/ui/privacy/lib/ga";

type FooterCtaLinkProps = {
  href: `#${string}`;
  label: string;
  className?: string;
};

const FooterCtaLink = ({ href, label, className }: FooterCtaLinkProps) => {
  const onClick = () => {
    gaEvent("cta_click", { location: "footer", label });
  };

  return (
    <HashLink href={href} className={className} onClick={onClick}>
      {label}
    </HashLink>
  );
};

export default FooterCtaLink;
