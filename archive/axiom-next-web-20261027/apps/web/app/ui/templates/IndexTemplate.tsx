import type { ReactNode } from "react";
import PageTemplateFrame, { type TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type IndexTemplateProps = {
  header: ReactNode;
  entry: ReactNode;
  collection: ReactNode;
  action?: ReactNode;
  footer: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export default function IndexTemplate({
  action,
  className,
  collection,
  entry,
  footer,
  header,
  mainId,
  surface = "page",
}: IndexTemplateProps) {
  return (
    <PageTemplateFrame
      className={className}
      footer={footer}
      header={header}
      mainId={mainId}
      surface={surface}
      templateId="index"
    >
      <div className={s.templateSlot} data-template-slot="entry">{entry}</div>
      <div className={s.templateSlot} data-template-slot="collection">{collection}</div>
      {action ? <div className={s.templateSlot} data-template-slot="action">{action}</div> : null}
    </PageTemplateFrame>
  );
}
