import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  ExternalLink,
  FileCheck2,
  FileText,
  Landmark,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { MarketingPageShell } from "@/app/components/multipage/MarketingPage";
import { cnbRegistryUrl, sabDocumentationUrl } from "@/app/content/multipage";
import { createPageMetadata } from "@/lib/seo";
import s from "./certificatesPage.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "Osvědčení a certifikace",
  description:
    "Na jednom místě najdete mé registrace, dokumenty a odborná osvědčení.",
  path: "/osvedceni-a-certifikace/",
});

type VerificationDocument = {
  title: string;
  description: string;
  category: "cnb" | "service" | "certificate" | "regulatory";
  href?: string;
  fileUrl?: string;
  status: "available" | "todo";
};

type VerificationCard = VerificationDocument & {
  icon: LucideIcon;
  ctaLabel: string;
  external?: boolean;
};

const verificationCards: VerificationCard[] = [
  {
    title: "ČNB registrace",
    description: "Moje ověřitelná registrace finančního zprostředkovatele.",
    category: "cnb",
    href: cnbRegistryUrl,
    status: "available",
    ctaLabel: "Ověřit v registru ČNB",
    external: true,
    icon: Landmark,
  },
  {
    title: "Servisní zázemí",
    description: "Zázemí pro sjednání, správu smluv a následný servis vašich smluv.",
    category: "service",
    href: sabDocumentationUrl,
    status: "available",
    ctaLabel: "Zobrazit informace",
    external: true,
    icon: Building2,
  },
  {
    title: "Odborná osvědčení",
    description:
      "Dokumenty a osvědčení související s odborností a oprávněním k činnosti.",
    category: "certificate",
    href: "#odborna-osvedceni",
    status: "available",
    ctaLabel: "Zobrazit dokumenty",
    icon: FileCheck2,
  },
  {
    title: "Regulatorní informace",
    description:
      "Základní informace k poskytování finančního poradenství a zprostředkování.",
    category: "regulatory",
    href: "/pravni-informace/",
    status: "available",
    ctaLabel: "Přejít na informace",
    icon: Scale,
  },
];

const certificateDocuments: VerificationDocument[] = [
  {
    title: "Pojištění (životní a neživotní)",
    description: "Osvědčení pro oblast pojištění.",
    category: "certificate",
    fileUrl: "/pojisteni-cert.pdf",
    status: "available",
  },
  {
    title: "Doplňkové penzijní spoření",
    description: "Osvědčení pro oblast doplňkového penzijního spoření.",
    category: "certificate",
    fileUrl: "/penzijko-cert.pdf",
    status: "available",
  },
  {
    title: "Investice",
    description: "Osvědčení pro oblast investic.",
    category: "certificate",
    fileUrl: "/investice-cert.pdf",
    status: "available",
  },
  {
    title: "Úvěry",
    description: "Osvědčení pro oblast úvěrů.",
    category: "certificate",
    fileUrl: "/uvery-cert.pdf",
    status: "available",
  },
];

function CardAction({ card }: { card: VerificationCard }) {
  if (card.status === "todo" || !card.href) {
    return <span className={s.todoState}>TODO: odkaz bude doplněn</span>;
  }

  const content = (
    <>
      <span data-route-reveal-item="control">{card.ctaLabel}</span>
      {card.external ? <ExternalLink aria-hidden="true" /> : <ArrowUpRight aria-hidden="true" />}
    </>
  );

  if (card.external || card.href.startsWith("#")) {
    return (
      <a
        className={s.cardLink}
        data-cursor-no-magnetic
        data-cursor={card.category === "cnb" ? "external" : undefined}
        data-cursor-icon={card.category === "cnb" ? "external" : undefined}
        data-cursor-label={card.category === "cnb"
          ? "VEŘEJNÝ REGISTR • OVĚŘIT ZÁZNAM •"
          : undefined}
        href={card.href}
        target={card.external ? "_blank" : undefined}
        rel={card.external ? "noopener noreferrer" : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link className={s.cardLink} data-cursor-no-magnetic href={card.href}>
      {content}
    </Link>
  );
}

export default function CertificatesPage() {
  const availableCertificates = certificateDocuments.filter(
    (document) => document.status === "available" && document.fileUrl,
  );

  return (
    <MarketingPageShell currentPath="/osvedceni-a-certifikace/">
      <section
        className={s.page}
        aria-labelledby="certificates-title"
        data-surface-tone="dark"
        data-route-reveal-root
        data-route-reveal-profile="staged"
      >
        <div className={s.ambient} aria-hidden="true" />
        <section className={s.shell}>
          <div className={s.hero}>
            <p className={s.eyebrow}>Ověření a dokumenty</p>
            <h1 id="certificates-title">
              Osvědčení, registrace a dokumenty na jednom místě.
            </h1>
            <p>
              Přehled věcí, které si můžete projít před spoluprací — od registrace
              až po odborné a servisní zázemí.
            </p>
          </div>

          <div className={s.cardGrid} aria-label="Přehled ověřovacích oblastí">
            {verificationCards.map((card) => {
              const Icon = card.icon;

              return (
                <article className={s.verificationCard} data-route-reveal-group="row" key={card.title}>
                  <span className={s.iconTile} data-route-reveal-item="meta" aria-hidden="true">
                    <Icon />
                  </span>
                  <span className={s.statusBadge} data-route-reveal-item="meta">
                    {card.status === "available" ? "Dostupné" : "Bude doplněno"}
                  </span>
                  <h2 data-route-reveal-item="title">{card.title}</h2>
                  <p data-route-reveal-item="body">{card.description}</p>
                  <CardAction card={card} />
                </article>
              );
            })}
          </div>

          <section
            className={s.documentsPanel}
            id="odborna-osvedceni"
            aria-labelledby="documents-title"
          >
            <div className={s.panelHeader} data-route-reveal-group>
              <div>
                <p className={s.eyebrow} data-route-reveal-item="meta">Odborná osvědčení</p>
                <h2 id="documents-title" data-route-reveal-item="title">Dostupné dokumenty</h2>
              </div>
              <p data-route-reveal-item="body">
                Soubory níže jsou připojené dokumenty v projektu. Nejsou zde
                uváděná žádná registrační čísla ani tvrzení navíc.
              </p>
            </div>

            {availableCertificates.length > 0 ? (
              <ul className={s.documentList}>
                {availableCertificates.map((document) => (
                  <li key={document.fileUrl} data-route-reveal-group="row">
                    <a
                      className={s.documentLink}
                      data-cursor-no-magnetic
                      href={document.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <span className={s.documentIcon} data-route-reveal-item="meta" aria-hidden="true">
                        <FileText />
                      </span>
                      <span>
                        <strong data-route-reveal-item="title">{document.title}</strong>
                        <small data-route-reveal-item="body">{document.description}</small>
                      </span>
                      <span className={s.pdfBadge} data-route-reveal-item="meta">PDF</span>
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={s.emptyState} data-route-reveal-group="row">
                <BadgeCheck aria-hidden="true" />
                <p data-route-reveal-item="body">Dokumenty budou doplněny.</p>
              </div>
            )}
          </section>
        </section>
      </section>
    </MarketingPageShell>
  );
}
