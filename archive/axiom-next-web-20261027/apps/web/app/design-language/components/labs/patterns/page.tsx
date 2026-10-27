import type { Metadata } from "next";
import DesignLanguageApp from "../../../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Patterns and Templates Lab / Components / Design Language",
  description: "Canonical composition recipe and page template workbench.",
  robots: { index: false, follow: false },
};

export default function PatternsLabPage() {
  return <DesignLanguageApp activeRouteId="components" componentsView="lab-patterns" />;
}
