import type { ReactNode } from "react";

export type NavigationItemData = {
  href: string;
  label: ReactNode;
  exact?: boolean;
};

export type FooterLinkGroup = {
  label: string;
  links: ReadonlyArray<{
    href: string;
    label: ReactNode;
    target?: "_blank";
    rel?: string;
  }>;
};
