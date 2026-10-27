import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Typography / Design Language / PokornyDavid.cz",
  description:
    "Typography route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageTypographyPage() {
  return <DesignLanguageApp activeRouteId="typography" />;
}
