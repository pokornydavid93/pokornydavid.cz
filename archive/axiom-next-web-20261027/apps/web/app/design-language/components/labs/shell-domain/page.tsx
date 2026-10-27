import type { Metadata } from "next";
import DesignLanguageApp from "../../../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Shell and Domain Lab / Components / Design Language",
  description: "Navigation, domain anatomy, and integration boundary workbench.",
  robots: { index: false, follow: false },
};

export default function ShellDomainLabPage() {
  return <DesignLanguageApp activeRouteId="components" componentsView="lab-shell-domain" />;
}
