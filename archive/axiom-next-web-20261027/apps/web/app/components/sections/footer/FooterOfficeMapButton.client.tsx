"use client";

import { ExternalLink, MapPin, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { scrollToSmooth } from "@/app/ui/scroll/scrollTo";
import s from "./footer.module.css";

const OFFICE_ADDRESS = "Tovární 1197/42a, 779 00 Olomouc";
const OFFICE_ADDRESS_ENCODED = encodeURIComponent(OFFICE_ADDRESS);
const GOOGLE_MAPS_EMBED_URL = `https://www.google.com/maps?q=${OFFICE_ADDRESS_ENCODED}&output=embed`;
const GOOGLE_MAPS_EXTERNAL_URL = `https://www.google.com/maps/search/?api=1&query=${OFFICE_ADDRESS_ENCODED}`;
const LEAD_FORM_TARGET = "#lead-form";
const NAV_SUPPRESS_EVENT = "axiom:nav-suppress-reveal";

type FooterOfficeMapButtonProps = {
  as?: "li" | "div";
  itemClassName?: string;
  buttonClassName?: string;
};

const FooterOfficeMapButton = ({
  as: Wrapper = "li",
  itemClassName,
  buttonClassName,
}: FooterOfficeMapButtonProps) => {
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const addressButtonRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const openMap = () => {
    setIsMapLoaded(false);
    setIsMapOpen(true);
  };

  const closeMap = useCallback((restoreAddressFocus = true) => {
    setIsMapOpen(false);
    setIsMapLoaded(false);
    if (!restoreAddressFocus) return;
    requestAnimationFrame(() => {
      addressButtonRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const focusLeadFormField = () => {
    const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `${LEAD_FORM_TARGET} input:not([type="hidden"]), ${LEAD_FORM_TARGET} textarea`,
    );
    field?.focus({ preventScroll: true });
  };

  const suppressNavRevealDuringScroll = () => {
    document.documentElement.dataset.navSuppressReveal = "1";
    window.dispatchEvent(new Event(NAV_SUPPRESS_EVENT));

    const startedAt = performance.now();
    const release = () => {
      delete document.documentElement.dataset.navSuppressReveal;
    };
    const checkTarget = () => {
      const target = document.querySelector(LEAD_FORM_TARGET);
      const targetTop = target?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY;
      if (Math.abs(targetTop) <= 8 || performance.now() - startedAt > 6500) {
        window.setTimeout(release, 250);
        return;
      }
      window.requestAnimationFrame(checkTarget);
    };

    window.requestAnimationFrame(checkTarget);
  };

  const handleConsultationJump = () => {
    suppressNavRevealDuringScroll();
    closeMap(false);
    window.setTimeout(() => {
      scrollToSmooth(LEAD_FORM_TARGET);
      window.setTimeout(focusLeadFormField, 700);
    }, 0);
  };

  useEffect(() => {
    if (!isMapOpen || typeof document === "undefined") return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyModalOpen = document.body.getAttribute("data-modal-open");
    const previousHtmlModal = document.documentElement.dataset.modal;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMap();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    document.body.setAttribute("data-modal-open", "1");
    document.documentElement.dataset.modal = "1";
    closeButtonRef.current?.focus({ preventScroll: true });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousBodyOverflow;
      if (previousBodyModalOpen === null) {
        document.body.removeAttribute("data-modal-open");
      } else {
        document.body.setAttribute("data-modal-open", previousBodyModalOpen);
      }
      if (previousHtmlModal === undefined) {
        delete document.documentElement.dataset.modal;
      } else {
        document.documentElement.dataset.modal = previousHtmlModal;
      }
    };
  }, [closeMap, isMapOpen]);

  const modal =
    isMapOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className={s.mapOverlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby="footer-office-map-title"
          >
            <div
              className={s.mapBackdrop}
              aria-hidden="true"
              onClick={() => closeMap()}
            />
            <div className={s.mapDialog} data-surface-tone="dark">
              <button
                ref={closeButtonRef}
                type="button"
                className={s.mapClose}
                aria-label="Zavřít mapu kanceláře"
                onClick={() => closeMap()}
              >
                <X size={18} aria-hidden />
              </button>

              <div className={s.mapHeader}>
                <h2 id="footer-office-map-title">Kancelář Olomouc</h2>
                <p>
                  Tovární 1197/42a
                  <br />
                  779 00 Olomouc
                </p>
              </div>

              <div className={s.mapFrameShell}>
                {!isMapLoaded ? (
                  <div
                    className={s.mapLoading}
                    role="status"
                    aria-label="Načítám mapu"
                  >
                    <span className={s.mapLoadingDots} aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </span>
                  </div>
                ) : null}
                <iframe
                  className={`${s.mapFrame} ${
                    isMapLoaded ? s.mapFrameLoaded : ""
                  }`}
                  src={GOOGLE_MAPS_EMBED_URL}
                  title="Moje kancelář v Olomouci – mapa"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  onLoad={() => setIsMapLoaded(true)}
                />
              </div>

              <div className={s.mapActions}>
                <a
                  className={s.mapExternalLink}
                  href={GOOGLE_MAPS_EXTERNAL_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Otevřít v Google Maps
                  <ExternalLink size={16} aria-hidden />
                </a>
                <button
                  type="button"
                  className={s.mapConsultButton}
                  aria-label="Zavřít mapu a přejít na formulář pro domluvení konzultace"
                  onClick={handleConsultationJump}
                >
                  Zavoláme si? <span aria-hidden>↓</span>
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <Wrapper className={itemClassName}>
      <button
        ref={addressButtonRef}
        type="button"
        className={`${s.officeMapButton} ${buttonClassName ?? ""}`.trim()}
        aria-label="Zobrazit mapu kanceláře v Olomouci"
        onClick={openMap}
      >
        <MapPin size={18} aria-hidden />
        <span>Kancelář: Tovární 1197/42a, 779 00 Olomouc</span>
      </button>

      {modal}
    </Wrapper>
  );
};

export default FooterOfficeMapButton;
