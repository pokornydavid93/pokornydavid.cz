import { DESIGN_PRIMITIVE_MEDIA_QUERIES } from "@/app/theme/design-primitives";
import {
  HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE,
  HOMEPAGE_INTRO_TIMING,
  HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE,
} from "./HomepageIntro.constants";

/**
 * Runs from the persistent root layout so route transitions never insert an
 * executable script through React. The observer also keeps the pre-hydration
 * escape and timeout fallback available on a cold document load.
 */
export const HOMEPAGE_INTRO_BOOTSTRAP_SCRIPT = `(()=>{
  const d=document.documentElement,w=window;
  if(typeof w.__pokornyHomeIntroRuntimeCleanup==="function")w.__pokornyHomeIntroRuntimeCleanup();
  let activeIntro=null;
  const clearTimers=()=>{
    clearTimeout(w.__pokornyHomeIntroFallbackTimer);
    clearTimeout(w.__pokornyHomeIntroFallbackCompleteTimer);
    delete w.__pokornyHomeIntroFallbackTimer;
    delete w.__pokornyHomeIntroFallbackCompleteTimer;
  };
  const releaseBootstrap=()=>{
    if(typeof w.__pokornyHomeIntroBootstrapCleanup==="function")w.__pokornyHomeIntroBootstrapCleanup();
  };
  const deactivate=()=>{
    clearTimers();
    releaseBootstrap();
    if(activeIntro&&["pending","active","fallback-exit"].includes(d.dataset.homeIntroState||""))d.dataset.homeIntroState="complete";
    activeIntro=null;
  };
  const activate=intro=>{
    if(intro===activeIntro)return true;
    deactivate();
    activeIntro=intro;
    const startedAt=performance.now();
    w.__pokornyHomeIntroStartedAt=startedAt;
    w.__pokornyHomeIntroOverlayStartedAt=startedAt;
    d.dataset.homeIntroState="pending";
    d.removeAttribute("${HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE}");
    d.removeAttribute("${HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE}");
    const cleanup=()=>{
      removeEventListener("keydown",onKeyDown);
      if(w.__pokornyHomeIntroBootstrapSkip===onKeyDown)delete w.__pokornyHomeIntroBootstrapSkip;
      if(w.__pokornyHomeIntroBootstrapCleanup===cleanup)delete w.__pokornyHomeIntroBootstrapCleanup;
    };
    const skip=()=>{
      d.setAttribute("${HOMEPAGE_INTRO_SKIP_REQUEST_ATTRIBUTE}","true");
      d.dataset.homeIntroState="skip";
      d.setAttribute("${HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE}","static");
      cleanup();
    };
    const onKeyDown=event=>{if(event.key==="Escape")skip()};
    w.__pokornyHomeIntroBootstrapSkip=onKeyDown;
    w.__pokornyHomeIntroBootstrapCleanup=cleanup;
    addEventListener("keydown",onKeyDown);
    const reduced=matchMedia("${DESIGN_PRIMITIVE_MEDIA_QUERIES.reducedMotion}").matches;
    const exitStart=reduced?${HOMEPAGE_INTRO_TIMING.reducedMotionReadinessLimit}:${HOMEPAGE_INTRO_TIMING.fallbackExitStart};
    const exitDuration=reduced?${HOMEPAGE_INTRO_TIMING.reducedMotionExitDuration}:${HOMEPAGE_INTRO_TIMING.fallbackExitDuration};
    w.__pokornyHomeIntroFallbackTimer=setTimeout(()=>{
      if(!["pending","active"].includes(d.dataset.homeIntroState||""))return;
      d.setAttribute("${HOMEPAGE_INTRO_VISUAL_MODE_ATTRIBUTE}","static");
      d.dataset.homeIntroState="fallback-exit";
      w.__pokornyHomeIntroFallbackCompleteTimer=setTimeout(()=>{
        d.dataset.homeIntroState="fallback-complete";
        cleanup();
      },exitDuration);
    },exitStart);
    return true;
  };
  const sync=()=>{
    const next=document.querySelector("[data-home-intro]");
    if(next===activeIntro)return;
    if(!next){deactivate();return}
    activate(next);
  };
  const observer=new MutationObserver(sync);
  observer.observe(d,{childList:true,subtree:true});
  w.__pokornyHomeIntroBootstrap=activate;
  w.__pokornyHomeIntroRuntimeCleanup=()=>{
    observer.disconnect();
    deactivate();
    delete w.__pokornyHomeIntroBootstrap;
    delete w.__pokornyHomeIntroRuntimeCleanup;
  };
  sync();
})();`;
