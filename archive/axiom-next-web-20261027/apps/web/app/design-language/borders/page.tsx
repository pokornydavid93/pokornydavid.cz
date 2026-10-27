import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Borders / Design Language / PokornyDavid.cz",
  description:
    "Border and separation route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageBordersPage() {
  return <DesignLanguageApp activeRouteId="borders" />;
}
