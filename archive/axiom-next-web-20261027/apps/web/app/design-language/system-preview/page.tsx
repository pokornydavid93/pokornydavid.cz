import type { Metadata } from "next";
import SystemPreview from "./SystemPreview.client";

export const metadata: Metadata = {
  title: "System Preview / Design Language / PokornyDavid.cz",
  description:
    "Internal full-page composition for validating the PokornyDavid.cz design language.",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function SystemPreviewPage() {
  return <SystemPreview />;
}
