"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import s from "./leadform.module.css";

type StatusToastProps = {
  state: "success" | "error";
  message: string;
  onHide?: () => void;
  duration?: number;
};

export function StatusToast({
  state,
  message,
  onHide,
  duration = 3500,
}: StatusToastProps) {
  // 🔹 toast je viditelný hned po mountu
  const [visible, setVisible] = useState(true);

  useEffect(() => {
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
    <div
      className={`${s.statusToast} ${
        visible ? s.statusToastVisible : ""
      } ${state === "success" ? s.statusToastSuccess : s.statusToastError}`}
      role="status"
      aria-live="polite"
    >
      {message}
    </div>,
    document.body
  );
}

