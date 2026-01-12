"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import s from "./leadform.module.css";

type StatusToastProps = {
  state: "success" | "error" | "info";
  message: string;
  onHide?: () => void;
  duration?: number;
  actionLabel?: string;
  onAction?: () => void;
  showClose?: boolean;
};

export function StatusToast({
  state,
  message,
  onHide,
  duration = 3500,
  actionLabel,
  onAction,
  showClose = true,
}: StatusToastProps) {
  // 🔹 toast je viditelný hned po mountu
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(duration)) return;
    const t = window.setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => window.clearTimeout(t);
  }, [duration]);

  // 🔹 po doběhnutí hide animace odmountuj
  useEffect(() => {
    if (!visible) {
      const t = window.setTimeout(() => {
        onHide?.();
      }, 400); // musí sedět s CSS transition

      return () => window.clearTimeout(t);
    }
  }, [visible, onHide]);

  return createPortal(
    <>
      <div
        className={`${s.statusOverlay} ${
          visible ? s.statusOverlayVisible : ""
        }`}
        aria-hidden
      />
      <div
        className={`${s.statusToast} ${visible ? s.statusToastVisible : ""} ${
          state === "success"
            ? s.statusToastSuccess
            : state === "info"
            ? s.statusToastInfo
            : s.statusToastError
        }`}
        role="status"
        aria-live="polite"
      >
        <div className={s.statusToastBody}>
          <span className={s.statusToastMessage}>{message}</span>
          <div className={s.statusToastActions}>
            {actionLabel && onAction ? (
              <button
                type="button"
                className={s.statusToastAction}
                onClick={() => {
                  setVisible(false);
                  onAction();
                }}
              >
                {actionLabel}
              </button>
            ) : null}
            {showClose ? (
              <button
                type="button"
                className={s.statusToastClose}
                aria-label="Zavřít oznámení"
                onClick={() => setVisible(false)}
              >
                ×
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ${ visible ? s.statusToastVisible : ""} ${state === "success" ? s.statusToastSuccess : s.statusToastError}
