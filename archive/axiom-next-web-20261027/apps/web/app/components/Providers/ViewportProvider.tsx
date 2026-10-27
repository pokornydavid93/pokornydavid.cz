"use client";

import { createContext, useContext, useEffect, useState } from "react";

type DeviceType = "mobile" | "tablet" | "laptop" | "desktop" | "ultra";
type Orientation = "portrait" | "landscape";
type HeightCategory = "short" | "normal" | "tall";

interface ViewportState {
  width: number;
  height: number;
  device: DeviceType;
  orientation: Orientation;
  heightCategory: HeightCategory;
}

const ViewportContext = createContext<ViewportState | null>(null);

const classifyDevice = (w: number): DeviceType => {
  if (w <= 640) return "mobile";      // telefony
  if (w <= 1024) return "tablet";     // tablety / menší šířky
  if (w <= 1439) return "laptop";     // běžné notebooky
  if (w <= 1919) return "desktop";    // větší monitory
  return "ultra";                     // FHD+ (2K, 4K...)
};

const classifyHeight = (h: number): HeightCategory => {
  if (h <= 700) return "short";
  if (h <= 900) return "normal";
  return "tall";
};

// ⚠️ DŮLEŽITÉ: žádný window, žádné podmínky → stejný výstup pro server i client
const getInitialState = (): ViewportState => ({
  width: 0,
  height: 0,
  device: "desktop",
  orientation: "landscape",
  heightCategory: "normal",
});

export const ViewportProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<ViewportState>(getInitialState);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let timeout: number;

    const update = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      setState({
        width: w,
        height: h,
        device: classifyDevice(w),
        orientation: w >= h ? "landscape" : "portrait",
        heightCategory: classifyHeight(h),
      });
    };

    // init + debounce na resize
    update();

    const onResize = () => {
      clearTimeout(timeout);
      timeout = window.setTimeout(update, 80);
    };

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <ViewportContext.Provider value={state}>
      {children}
    </ViewportContext.Provider>
  );
};

export const useViewport = () => {
  const ctx = useContext(ViewportContext);
  if (!ctx) {
    throw new Error("useViewport must be used inside <ViewportProvider>");
  }
  return ctx;
};
