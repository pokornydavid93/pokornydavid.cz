import type { ReactNode } from "react";
import Surface, { type SurfaceRole } from "../../ui/primitives/Surface";
import s from "./uiFormsFoundationPreview.module.css";

export type PreviewTone = "dark" | "light" | "action";

export const previewTones = [
  { id: "dark", label: "Dark", surface: "card-dark" },
  { id: "light", label: "Light", surface: "card-light" },
  { id: "action", label: "Action", surface: "action" },
] as const satisfies ReadonlyArray<{
  id: PreviewTone;
  label: string;
  surface: SurfaceRole;
}>;

type UIFormsToneMatrixProps = {
  children: (tone: PreviewTone) => ReactNode;
};

export default function UIFormsToneMatrix({ children }: UIFormsToneMatrixProps) {
  return (
    <div className={s.toneMatrix} data-tone-matrix>
      {previewTones.map((tone) => (
        <Surface
          as="article"
          className={s.tonePanel}
          data-contract-tone={tone.id}
          key={tone.id}
          surface={tone.surface}
          tone={tone.id}
        >
          <header className={s.toneHeader}>
            <strong>{tone.label}</strong>
            <code>{tone.surface}</code>
          </header>
          {children(tone.id)}
        </Surface>
      ))}
    </div>
  );
}
