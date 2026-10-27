import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Components / Design Language / PokornyDavid.cz",
  description:
    "Component registry route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageComponentsPage() {
  return <DesignLanguageApp activeRouteId="components" />;
}
