import clsx from "clsx";
import type {
  ComponentPropsWithoutRef,
  ElementType,
  ReactNode,
} from "react";
import Container from "../layout/Container";
import Surface from "../primitives/Surface";
import s from "./patterns.module.css";

export type ActionBandProps = Omit<
  ComponentPropsWithoutRef<"section">,
  "children"
> & {
  heading: ReactNode;
  actions: ReactNode;
  eyebrow?: ReactNode;
  lead?: ReactNode;
  headingLevel?: "h2" | "h3";
  headingId?: string;
  revealContent?: boolean;
  surface?: "action" | "action-dark";
};

export default function ActionBand({
  actions,
  className,
  eyebrow,
  heading,
  headingId,
  headingLevel = "h2",
  id,
  lead,
  revealContent = false,
  surface = "action",
  ...rest
}: ActionBandProps) {
  const Heading: ElementType = headingLevel;

  return (
    <Surface
      {...rest}
      as="section"
      aria-labelledby={headingId}
      className={clsx(s.actionBand, className)}
      componentName="pattern-action-band"
      data-pattern="action-band"
      id={id}
      surface={surface}
      tone={surface === "action" ? "action" : "dark"}
    >
      <Container size="wide">
        <div className={s.actionLayout} data-action-band-stage>
          <div className={s.actionCopy} data-action-band-copy>
            {eyebrow ? (
              <span
                className={s.eyebrow}
                data-action-band-part="eyebrow"
                data-route-reveal-item={revealContent || undefined}
              >
                {eyebrow}
              </span>
            ) : null}
            <Heading
              data-action-band-part="heading"
              data-route-reveal-item={revealContent || undefined}
              id={headingId}
            >
              {heading}
            </Heading>
          </div>
          <div className={s.actionAside} data-action-band-aside>
            {lead ? (
              <p
                className={s.actionLead}
                data-action-band-part="lead"
                data-route-reveal-item={revealContent || undefined}
              >
                {lead}
              </p>
            ) : null}
            <div
              className={s.actionControls}
              data-action-band-part="actions"
              data-route-reveal-item={revealContent || undefined}
            >
              {actions}
            </div>
          </div>
        </div>
      </Container>
    </Surface>
  );
}
