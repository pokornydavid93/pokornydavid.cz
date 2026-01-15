"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import LeadFormCard from "../sections/leadForm/LeadFormCard";
import styles from "../sections/leadForm/leadformModal.module.css";

type LeadFormModalContext = {
  openLeadForm: (topic?: string) => void;
  closeLeadForm: () => void;
  isOpen: boolean;
};

const LeadFormModalCtx = createContext<LeadFormModalContext | null>(null);

export const LeadFormModalProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [prefillTopic, setPrefillTopic] = useState<string | undefined>(undefined);

  const openLeadForm = useCallback((topic?: string) => {
    setPrefillTopic(topic);
    setIsOpen(true);
  }, []);

  const closeLeadForm = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (!isOpen) {
      document.body.style.overflow = "";
      document.body.removeAttribute("data-modal-open");
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeLeadForm();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-modal-open", "1");

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      document.body.removeAttribute("data-modal-open");
    };
  }, [isOpen, closeLeadForm]);

  const value = useMemo(
    () => ({
      openLeadForm,
      closeLeadForm,
      isOpen,
    }),
    [openLeadForm, closeLeadForm, isOpen],
  );

  return (
    <LeadFormModalCtx.Provider value={value}>
      {children}
      {isOpen ? (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.backdrop} onClick={closeLeadForm} />
          <div className={styles.modalShell}>
            <LeadFormCard
              key={prefillTopic ?? "lead-form-modal"}
              variant="modal"
              prefillTopic={prefillTopic}
              onRequestClose={closeLeadForm}
            />
          </div>
        </div>
      ) : null}
    </LeadFormModalCtx.Provider>
  );
};

export const useLeadFormModal = () => {
  const ctx = useContext(LeadFormModalCtx);
  if (!ctx) {
    throw new Error("useLeadFormModal must be used within LeadFormModalProvider");
  }
  return ctx;
};
