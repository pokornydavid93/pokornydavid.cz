import type { Metadata } from "next";
import s from "./calendarProviderPreview.module.css";

export const metadata: Metadata = {
  title: "Calendar provider preview",
  robots: { index: false, follow: false },
};

export default function CalendarProviderPreviewPage() {
  return (
    <main className={s.page} data-calendar-provider-preview data-surface-tone="light">
      <h1>Dostupné termíny</h1>
      <p>Izolovaný provider dokument načtený až po explicitním povolení.</p>
      <div className={s.slots} aria-label="Ukázkové termíny">
        <span>Út 10:00</span><span>St 15:30</span><span>Pá 09:00</span>
      </div>
    </main>
  );
}
