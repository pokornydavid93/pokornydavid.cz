import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Surfaces / Design Language / PokornyDavid.cz",
  description:
    "Surface hierarchy route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageSurfacesPage() {
  return <DesignLanguageApp activeRouteId="surfaces" />;
}
