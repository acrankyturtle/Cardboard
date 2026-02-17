/// <reference types="vite/client" />

declare module '*.md?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEBUG_ACTIONS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
