import clsx from "clsx";
import type { ReactNode } from "react";
import Surface, { type SurfaceRole } from "../primitives/Surface";
import s from "./templates.module.css";

export type TemplateSurface = Extract<
  SurfaceRole,
  "page" | "paper" | "action" | "action-dark"
>;

type PageTemplateFrameProps = {
  templateId: string;
  header: ReactNode;
  footer: ReactNode;
  children: ReactNode;
  surface: TemplateSurface;
  className?: string;
  mainId?: string;
};

const toneForSurface = (surface: TemplateSurface) => {
  if (surface === "paper") return "light" as const;
  if (surface === "action") return "action" as const;
  return "dark" as const;
};

export default function PageTemplateFrame({
  children,
  className,
  footer,
  header,
  mainId = "main-content",
  surface,
  templateId,
}: PageTemplateFrameProps) {
  return (
    <>
      {header}
      <Surface
        as="main"
        className={clsx(s.templateMain, className)}
        componentName={`template-${templateId}`}
        data-template={templateId}
        id={mainId}
        surface={surface}
        tone={toneForSurface(surface)}
      >
        {children}
      </Surface>
      {footer}
    </>
  );
}
