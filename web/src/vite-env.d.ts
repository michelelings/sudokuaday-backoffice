/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKOFFICE_PASSWORD?: string
  /** Optional; default https://sudokuaday.com — links to live HTML from repo paths */
  readonly VITE_PUBLIC_SITE_ORIGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
