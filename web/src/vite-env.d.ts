/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKOFFICE_PASSWORD?: string
  /** Optional; default https://sudokuaday.com — links to live HTML from repo paths */
  readonly VITE_PUBLIC_SITE_ORIGIN?: string
  /**
   * When set (and Vercel has TRIGGER_SYNC_SECRET + GITHUB_DISPATCH_TOKEN), “Sync snapshot now” POSTs to
   * `/api/trigger-ingest` instead of only opening GitHub. Use a long random string; it is visible in the JS bundle.
   */
  readonly VITE_TRIGGER_SYNC_SECRET?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
