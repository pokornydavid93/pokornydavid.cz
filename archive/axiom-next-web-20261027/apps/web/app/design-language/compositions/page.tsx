import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Compositions / Design Language / PokornyDavid.cz",
  description:
    "Composition contract route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageCompositionsPage() {
  return <DesignLanguageApp activeRouteId="compositions" />;
}
