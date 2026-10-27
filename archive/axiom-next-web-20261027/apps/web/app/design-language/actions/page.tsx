import type { Metadata } from "next";
import DesignLanguageApp from "../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Actions / Design Language / PokornyDavid.cz",
  description:
    "Action states and CTA route for the PokornyDavid.cz design language dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignLanguageActionsPage() {
  return <DesignLanguageApp activeRouteId="actions" />;
}
