import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Foundations / Design Language / PokornyDavid.cz",
  description:
    "Foundation color and token route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageFoundationsPage() {
  return <DesignLanguageApp activeRouteId="foundations" />;
}
