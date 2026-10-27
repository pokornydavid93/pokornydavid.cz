import type { Metadata } from "next";
import DesignLanguageApp from "../../../DesignLanguageApp.client";

export const metadata: Metadata = {
  title: "UI and Forms Lab / Components / Design Language",
  description: "Contract, composition, and form journey evidence across dark, light, and action surfaces.",
  robots: { index: false, follow: false },
};

export default function UIFormsLabPage() {
  return <DesignLanguageApp activeRouteId="components" componentsView="lab-ui-forms" />;
}
