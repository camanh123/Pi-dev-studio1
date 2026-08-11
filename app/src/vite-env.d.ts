/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PUBLIC_POSTHOG_KEY: string
  readonly VITE_PUBLIC_POSTHOG_HOST: string
  /** DEV-only: auto-enable Local Demo Mode when set to "true" (never in production). */
  readonly VITE_LOCAL_DEMO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
