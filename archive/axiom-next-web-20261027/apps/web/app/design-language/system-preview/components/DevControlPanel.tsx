import s from "../SystemPreview.module.css";

export type PreviewControls = {
  panelOpen: boolean;
  showLabels: boolean;
  showTokens: boolean;
  showBoundaries: boolean;
  reduceMotion: boolean;
};

export type PreviewControlKey = Exclude<keyof PreviewControls, "panelOpen">;

type DevControlPanelProps = {
  controls: PreviewControls;
  onClose: () => void;
  onOpen: () => void;
  onToggle: (key: PreviewControlKey) => void;
};

const controlItems: Array<{
  key: PreviewControlKey;
  label: string;
}> = [
  { key: "showLabels", label: "Show section labels" },
  { key: "showTokens", label: "Show surface token names" },
  { key: "showBoundaries", label: "Show layout boundaries" },
  { key: "reduceMotion", label: "Reduce motion" },
];

export default function DevControlPanel({
  controls,
  onClose,
  onOpen,
  onToggle,
}: DevControlPanelProps) {
  if (!controls.panelOpen) {
    return (
      <button className={s.controlReopen} type="button" onClick={onOpen}>
        System Preview
      </button>
    );
  }

  return (
    <aside className={s.controlPanel} aria-label="System Preview controls">
      <div className={s.controlHeader}>
        <div>
          <span>System Preview</span>
          <strong>Reference tools</strong>
        </div>
        <button type="button" onClick={onClose}>
          Hide
        </button>
      </div>
      <div className={s.controlList}>
        {controlItems.map((item) => (
          <label key={item.key} className={s.controlToggle}>
            <input
              checked={controls[item.key]}
              type="checkbox"
              onChange={() => onToggle(item.key)}
            />
            <span>{item.label}</span>
          </label>
        ))}
      </div>
    </aside>
  );
}
