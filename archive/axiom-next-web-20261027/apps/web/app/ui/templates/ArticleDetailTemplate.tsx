import type { ReactNode } from "react";
import PageTemplateFrame, { type TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type ArticleDetailTemplateProps = {
  header: ReactNode;
  article: ReactNode;
  related?: ReactNode;
  action?: ReactNode;
  footer: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export default function ArticleDetailTemplate({
  action,
  article,
  className,
  footer,
  header,
  mainId,
  related,
  surface = "paper",
}: ArticleDetailTemplateProps) {
  return (
    <PageTemplateFrame
      className={className}
      footer={footer}
      header={header}
      mainId={mainId}
      surface={surface}
      templateId="article-detail"
    >
      <div className={s.templateSlot} data-template-slot="article">{article}</div>
      {related ? <div className={s.templateSlot} data-template-slot="related">{related}</div> : null}
      {action ? <div className={s.templateSlot} data-template-slot="action">{action}</div> : null}
    </PageTemplateFrame>
  );
}
