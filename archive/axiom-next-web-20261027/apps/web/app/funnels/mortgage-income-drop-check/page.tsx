import type { Metadata } from "next";
import MortgageIncomeDropSurfaceClient from "./SurfaceClient";
import { createPageMetadata } from "@/lib/seo";

const PAGE_TITLE = "Hypoteční stres-test pro páry";
const PAGE_DESCRIPTION =
  "60sekundová kontrola, jestli by společný rozpočet zvládl hypotéku při dlouhodobém výpadku jednoho příjmu.";

export const metadata: Metadata = createPageMetadata({
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  path: "/funnels/mortgage-income-drop-check/",
  robots: {
    index: false,
    follow: false,
  },
});

export default function MortgageIncomeDropCheckPage() {
  return <MortgageIncomeDropSurfaceClient />;
}
