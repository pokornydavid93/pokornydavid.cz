import clsx from "clsx";
import type { ReactNode } from "react";
import Container from "../layout/Container";
import Surface from "../primitives/Surface";
import type { TemplateSurface } from "./PageTemplateFrame";
import s from "./templates.module.css";

export type SystemTemplateProps = {
  status: ReactNode;
  heading: ReactNode;
  message: ReactNode;
  actions: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  surface?: TemplateSurface;
  className?: string;
  mainId?: string;
};

export default function SystemTemplate({
  actions,
  className,
  footer,
  header,
  heading,
  mainId = "main-content",
  message,
  status,
  surface = "paper",
}: SystemTemplateProps) {
  return (
    <>
      <Surface
        surface={surface}
        tone={surface === "paper" ? "light" : surface === "action" ? "action" : "dark"}
      >
        {header}
        <main
          className={clsx(s.systemTemplate, className)}
          data-component="template-system"
          data-template="system"
          id={mainId}
          tabIndex={-1}
        >
          <Container className={s.systemContent} size="wide">
            <div className={s.systemHeading}>
              <p className={s.systemStatus}>{status}</p>
              <h1>{heading}</h1>
            </div>
            <div className={s.systemRecovery}>
              <p className={s.systemMessage}>{message}</p>
              <div className={s.systemActions}>{actions}</div>
            </div>
          </Container>
        </main>
      </Surface>
      {footer}
    </>
  );
}
