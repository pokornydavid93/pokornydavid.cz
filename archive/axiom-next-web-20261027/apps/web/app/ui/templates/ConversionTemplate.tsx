import type { ReactNode } from "react";
import PageTemplateFrame, { type TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type ConversionTemplateProps = {
  header: ReactNode;
  entry: ReactNode;
  form: ReactNode;
  footer: ReactNode;
  trust?: ReactNode;
  faq?: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export default function ConversionTemplate({
  className,
  entry,
  faq,
  footer,
  form,
  header,
  mainId,
  surface = "page",
  trust,
}: ConversionTemplateProps) {
  return (
    <PageTemplateFrame
      className={className}
      footer={footer}
      header={header}
      mainId={mainId}
      surface={surface}
      templateId="conversion"
    >
      <div className={s.templateSlot} data-template-slot="entry">{entry}</div>
      {trust ? <div className={s.templateSlot} data-template-slot="trust">{trust}</div> : null}
      <div className={s.templateSlot} data-template-slot="form">{form}</div>
      {faq ? <div className={s.templateSlot} data-template-slot="faq">{faq}</div> : null}
    </PageTemplateFrame>
  );
}
