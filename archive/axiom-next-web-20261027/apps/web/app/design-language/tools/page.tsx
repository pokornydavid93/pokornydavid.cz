import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Tools / Design Language / PokornyDavid.cz",
  description:
    "Token explorer, contrast lab, and surface composer for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageToolsPage() {
  return <DesignLanguageApp activeRouteId="tools" />;
}
