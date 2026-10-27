import type { ReactNode } from "react";
import PageTemplateFrame, { type TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type ContentDetailTemplateProps = {
  header: ReactNode;
  hero: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  footer: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export default function ContentDetailTemplate({
  action,
  children,
  className,
  footer,
  header,
  hero,
  mainId,
  surface = "page",
}: ContentDetailTemplateProps) {
  return (
    <PageTemplateFrame
      className={className}
      footer={footer}
      header={header}
      mainId={mainId}
      surface={surface}
      templateId="content-detail"
    >
      <div className={s.templateSlot} data-template-slot="hero">{hero}</div>
      <div className={s.templateFlow} data-template-slot="main">{children}</div>
      {action ? <div className={s.templateSlot} data-template-slot="action">{action}</div> : null}
    </PageTemplateFrame>
  );
}
