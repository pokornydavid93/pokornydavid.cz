import type { Metadata } from "next";
import DesignLanguageApp from "../../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Component Registry / Design Language / PokornyDavid.cz",
  description: "Searchable runtime component registry for the PokornyDavid.cz design language.",
  robots: { index: false, follow: false },
};

export default function ComponentRegistryPage() {
  return <DesignLanguageApp activeRouteId="components" componentsView="registry" />;
}
