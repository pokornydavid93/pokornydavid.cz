"use client";

import s from "./trustBar.module.css";
import type { LucideIcon } from "lucide-react";
import { Home, Briefcase, Shield, LineChart } from "lucide-react";
import { useViewport } from "@/app/components/Providers/ViewportProvider";
// ⬇ starý Carousel pryč
import { TrustCarousel } from "../Carousel/TrustCarousel";
import { scrollToInstant } from "@/app/ui/scroll/scrollTo";

type Props = {
  activeSection: string;
};

type TrustItem = {
  id: string;
  label: string;
  targetId: string;
  type?: "link" | "video";
  icon?: LucideIcon;
};

const SECTION_CONFIG: Partial<Record<string, TrustItem[]>> = {
  hero: [
    {
      id: "hypoteka",
      label: "Hypotéka & bydlení",
      targetId: "#service-hypoteka", // id elementu v sekci Služby
      icon: Home,
    },
    {
      id: "prijem",
      label: "Zajištění příjmu",
      targetId: "#service-income",
      icon: Briefcase,
    },
    {
      id: "majetek",
      label: "Ochrana majetku",
      targetId: "#service-property",
      icon: Shield,
    },
    {
      id: "investice",
      label: "Investice & rezerva",
      targetId: "#service-invest",
      icon: LineChart,
    },
  ],
};
const TrustBar = ({ activeSection }: Props) => {
  const items = SECTION_CONFIG[activeSection] ?? [];
  const { device } = useViewport();

  const handleClick = (item: TrustItem) => {
    scrollToInstant(item.targetId);
  };

  const isMobile = device === "mobile";

  return (
    <div
        className={`${s.trustBar} ${
          
          items.length > 0 ? s.trustBarVisible : s.trustBarHidden
        }`}
      >
        {isMobile ? (
          // 📱 MOBILE → Embla TrustCarousel se scale efektem
          <TrustCarousel>
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  className={s.navButton}
                  onClick={() => handleClick(item)}
                >
                  {Icon && <Icon className={s.navIcon} />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </TrustCarousel>
        ) : (
          // 💻 DESKTOP/TABLET → statická řada tlačítek
          <div className={s.staticRow}>
            {items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  className={s.navButton}
                  onClick={() => handleClick(item)}
                >
                  {Icon && <Icon className={s.navIcon} />}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
  );
};

export default TrustBar;
