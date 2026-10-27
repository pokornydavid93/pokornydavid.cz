export type SiteHeaderTheme = "dark" | "light";
export type SiteHeaderMaterial = "default" | "hero-glass";

export const SITE_HEADER_THEME_STORAGE_KEY = "site_header_theme_v1";

export const SITE_HEADER_THEME_BOOTSTRAP_SCRIPT = `(()=>{try{const n=performance.getEntriesByType("navigation")[0];if(!n||!["reload","back_forward"].includes(n.type))return;const e=JSON.parse(sessionStorage.getItem("${SITE_HEADER_THEME_STORAGE_KEY}")||"null");if(!e||e.pathname!==location.pathname||!["dark","light"].includes(e.theme)||Date.now()-Number(e.updatedAt)>18e5)return;const a=()=>{const h=document.querySelectorAll('[data-component="site-header"][data-nav-theme-history="restore"]');h.forEach(t=>{t.dataset.navTheme=e.theme;t.dataset.surfaceTone=e.theme;t.dataset.cursorSurface=e.theme;t.dataset.theme=e.theme;t.dataset.navThemeBootstrap="restore"});return h.length>0};if(a())return;const o=new MutationObserver(()=>{if(a())o.disconnect()});o.observe(document.documentElement,{childList:true,subtree:true});addEventListener("DOMContentLoaded",()=>{a();o.disconnect()},{once:true})}catch{}})();`;
