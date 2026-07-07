/**
 * Feature flags.
 *
 * Several service-desk sections (Tickets, Alerts, Analytics, Reports, Settings)
 * and some Library tabs (Regions, Characters, Items) are placeholders that just
 * say "not yet instrumented". They're hidden by default so the app looks
 * finished; flip this on to see them while developing those features.
 *
 * Enable with an env var at build/dev time:
 *   VITE_SHOW_UNFINISHED=true npm run dev:frontend
 */
const raw = import.meta.env.VITE_SHOW_UNFINISHED
export const showUnfinishedPages = raw === 'true' || raw === '1'
