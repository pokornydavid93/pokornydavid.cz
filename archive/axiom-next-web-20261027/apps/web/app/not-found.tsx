import { ArrowLeft } from "lucide-react";
import { PublicSiteFooter, PublicSiteHeader } from "@/app/_components/PublicSiteChrome";
import Link from "@/app/ui/primitives/Link";
import SystemTemplate from "@/app/ui/templates/SystemTemplate";

export default function NotFound() {
  return (
    <SystemTemplate
      actions={(
        <Link href="/" variant="primary-action">
          <ArrowLeft aria-hidden="true" />
          Zpět na hlavní stránku
        </Link>
      )}
      footer={<PublicSiteFooter />}
      header={(
        <PublicSiteHeader
          currentPath="/404/"
          initialTheme="light"
          scrollBehavior="static"
          showOverviewAction={false}
          themeBehavior="static"
        />
      )}
      heading="Tahle stránka tu není."
      message="Odkaz může být neaktuální nebo je v adrese překlep. Pokračujte na hlavní stránku, kde najdete moje služby i možnosti spolupráce."
      status="Chyba 404"
    />
  );
}
