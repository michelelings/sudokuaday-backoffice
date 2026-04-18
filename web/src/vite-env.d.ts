/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BACKOFFICE_PASSWORD?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
