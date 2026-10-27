import type { Metadata } from "next";
import DesignLanguageApp from "../../../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "Layout Lab / Components / Design Language",
  description: "Intrinsic layout primitive workbench across narrow, medium, and wide contexts.",
  robots: { index: false, follow: false },
};

export default function LayoutLabPage() {
  return <DesignLanguageApp activeRouteId="components" componentsView="lab-layout" />;
}
