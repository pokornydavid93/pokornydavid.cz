import type { Metadata } from "next";
import DesignLanguageApp from "./DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Design Language / PokornyDavid.cz",
  description:
    "Internal visual system dashboard for the PokornyDavid.cz design language.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguagePage() {
  return <DesignLanguageApp activeRouteId="overview" />;
}
