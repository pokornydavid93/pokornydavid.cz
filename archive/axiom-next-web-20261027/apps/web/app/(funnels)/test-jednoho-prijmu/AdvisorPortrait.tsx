import Image from "next/image";
import s from "./incomeTest.module.css";

export default function AdvisorPortrait({ compact = false }: { compact?: boolean }) {
  return (
    <div className={s.portrait} data-compact={compact}>
      <Image
        src="/david-profile-cutout.webp"
        alt="David Pokorný, finanční poradce"
        width={700}
        height={1096}
        sizes={compact ? "80px" : "(max-width: 720px) 96px, 144px"}
      />
    </div>
  );
}
