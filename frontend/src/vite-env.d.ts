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
  authenticate: (
    scopes: string[],
    onIncompletePaymentFound: (payment: unknown) => void | Promise<void>,
  ) => Promise<unknown> | unknown;
  createPayment: (
    paymentData: {
      amount: number;
      memo: string;
      metadata: Record<string, unknown>;
    },
    callbacks: {
      onReadyForServerApproval: (paymentId: string) => void | Promise<void>;
      onReadyForServerCompletion: (
        paymentId: string,
        txid: string,
      ) => void | Promise<void>;
      onCancel: (paymentId: string) => void;
      onError: (error: unknown, payment?: { identifier?: string }) => void;
    },
  ) => void;
}

interface Window {
  Pi?: PiNamespace;
}
