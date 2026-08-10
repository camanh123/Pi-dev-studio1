/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Project-local sandbox toggle. NOT an official Pi Platform env var. */
  readonly VITE_PI_SDK_SANDBOX?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface PiInitOptions {
  version: string;
  sandbox?: boolean;
}

interface PiNamespace {
  init: (options: PiInitOptions) => void;
}

interface Window {
  Pi?: PiNamespace;
}
