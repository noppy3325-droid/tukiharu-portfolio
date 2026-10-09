export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
// Same-origin visitor session; no external OAuth service is needed.
export const startLogin = () => { window.location.assign("/visitor?return=" + encodeURIComponent(window.location.pathname + window.location.search)); };
