import type { ReactNode } from "react";
import PageTemplateFrame, { type TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type HomeTemplateProps = {
  header: ReactNode;
  hero: ReactNode;
  children: ReactNode;
  finalAction?: ReactNode;
  footer: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export type HomeTemplateActionSlotProps = {
  children: ReactNode;
};

export function HomeTemplateActionSlot({
  children,
}: HomeTemplateActionSlotProps) {
  return (
    <div className={s.templateSlot} data-template-slot="final-action">
      {children}
    </div>
  );
}

export default function HomeTemplate({
  children,
  className,
  finalAction,
  footer,
  header,
  hero,
  mainId,
  surface = "page",
}: HomeTemplateProps) {
  return (
    <PageTemplateFrame
      className={className}
      footer={footer}
      header={header}
      mainId={mainId}
      surface={surface}
      templateId="home"
    >
      <div className={s.templateSlot} data-template-slot="hero">{hero}</div>
      <div className={s.templateFlow} data-template-slot="main">{children}</div>
      {finalAction ? (
        <HomeTemplateActionSlot>{finalAction}</HomeTemplateActionSlot>
      ) : null}
    </PageTemplateFrame>
  );
}
