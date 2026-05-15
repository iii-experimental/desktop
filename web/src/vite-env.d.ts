/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_III_BROWSER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
