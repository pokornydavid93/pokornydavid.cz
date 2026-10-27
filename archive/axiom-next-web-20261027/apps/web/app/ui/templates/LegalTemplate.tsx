import type { ReactNode } from "react";
import PageTemplateFrame, { type TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type LegalTemplateProps = {
  header: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export default function LegalTemplate({
  children,
  className,
  footer,
  header,
  mainId,
  surface = "paper",
}: LegalTemplateProps) {
  return (
    <PageTemplateFrame
      className={className}
      footer={footer}
      header={header}
      mainId={mainId}
      surface={surface}
      templateId="legal"
    >
      <div className={s.legalContent} data-template-slot="content">{children}</div>
    </PageTemplateFrame>
  );
}
