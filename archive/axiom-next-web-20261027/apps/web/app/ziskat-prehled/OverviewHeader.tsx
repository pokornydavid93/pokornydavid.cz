import { ArrowLeft } from "lucide-react";
import LogoMark from "../svgr/LogoMark";
import Link from "../ui/primitives/Link";
import SiteHeader from "../ui/site/SiteHeader";
import { knownMainSiteHref } from "@/lib/site-mode-routes";
import s from "./overview.module.css";

export default function OverviewHeader({
  compactBackLabel = false,
  showBackLink = true,
}: {
  compactBackLabel?: boolean;
  showBackLink?: boolean;
}) {
  const websiteHref = knownMainSiteHref("/", process.env.NEXT_PUBLIC_SITE_MODE, process.env.NEXT_PUBLIC_MAIN_SITE_ORIGIN);
  return (
    <SiteHeader
      action={websiteHref && showBackLink ? (
        <div className={s.utilityHeaderActions}>
          <Link
            className={s.backToWebsite}
            href={websiteHref}
            variant="text"
          >
            <ArrowLeft aria-hidden="true" />
            <span className={s.backDesktop}>{compactBackLabel ? "Zpět" : "Zpět na web"}</span>
            <span className={s.backMobile}>Zpět</span>
          </Link>
        </div>
      ) : undefined}
      brand={(
        <span className={s.utilityBrand}>
          <LogoMark
            aria-hidden="true"
            focusable="false"
            style={{ color: "var(--nav-brand-mark)", width: "2rem" }}
          />
          <span>
            <strong>David Pokorný</strong>
            <small>Finanční poradenství</small>
          </span>
        </span>
      )}
      brandLabel={websiteHref ? "David Pokorný – hlavní web" : "David Pokorný – finanční poradce"}
      brandHref={websiteHref ?? "/ziskat-prehled/"}
      className={s.overviewHeader}
      currentPath="/ziskat-prehled/"
      initialMaterial="hero-glass"
      initialTheme="dark"
      items={[]}
    />
  );
}
