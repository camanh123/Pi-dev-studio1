/**
 * Generated-app Pi U2A payments (Phase 5).
 *
 * Official contract (Phase 1: pi-sdk-reference, pi-payments-u2a, pi-platform-api):
 *   Pi.createPayment({ amount, memo, metadata }, callbacks)
 *   onReadyForServerApproval → backend approve (Key)
 *   onReadyForServerCompletion → backend complete with { txid } (Key)
 *
 * This is NOT OpenSail / Stripe billing.
 * Never put server credentials, access tokens, or secrets in metadata.
 */

import type { PiInitResult } from "./init";

export type IncompletePaymentNotice = {
  reported: true;
  message: string;
};

export type PaymentUiState =
  | { phase: "idle" }
  | { phase: "creating" }
  | { phase: "awaiting_approval"; paymentId: string }
  | { phase: "awaiting_user_sign"; paymentId: string }
  | { phase: "completing"; paymentId: string; txid: string }
  | { phase: "completed"; paymentId: string; txid: string }
  | { phase: "cancelled"; paymentId?: string }
  | { phase: "error"; message: string; paymentId?: string };

export type CreatePaymentInput = {
  amount: number;
  memo: string;
  metadata?: Record<string, string | number | boolean>;
};

type PaymentDTOLike = {
  identifier?: string;
};

type CreatePaymentCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void | Promise<void>;
  onReadyForServerCompletion: (
    paymentId: string,
    txid: string,
  ) => void | Promise<void>;
  onCancel: (paymentId: string) => void;
  onError: (error: unknown, payment?: PaymentDTOLike) => void;
};

type PiCreatePayment = (
  paymentData: { amount: number; memo: string; metadata: Record<string, unknown> },
  callbacks: CreatePaymentCallbacks,
) => void;

async function postJson(path: string, body: unknown): Promise<Response> {
  return fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Incomplete-payment recovery for Phase 5.
 * Calls generated-app backend only — never invents reversal flows or fake success.
 */
export function createIncompletePaymentHandler(
  onNotice: (notice: IncompletePaymentNotice) => void,
): (payment: unknown) => void | Promise<void> {
  return async (payment: unknown) => {
    const dto = (payment ?? {}) as {
      identifier?: string;
      transaction?: { txid?: string };
    };
    const paymentId = dto.identifier;
    if (!paymentId) {
      onNotice({
        reported: true,
        message:
          "Pi reported an incomplete payment without an identifier. No recovery attempted.",
      });
      return;
    }

    const txid = dto.transaction?.txid;
    try {
      const response = await postJson("/api/pi/payments/incomplete", {
        paymentId,
        txid: txid ?? null,
      });
      if (!response.ok) {
        onNotice({
          reported: true,
          message: `Incomplete payment ${paymentId} reported; backend recovery returned ${response.status}. Do not assume success.`,
        });
        return;
      }
      const result = (await response.json()) as { status?: string; detail?: string };
      onNotice({
        reported: true,
        message:
          result.detail ??
          `Incomplete payment ${paymentId} handled with status=${result.status ?? "unknown"}. Confirm via Platform API before fulfilling.`,
      });
    } catch {
      onNotice({
        reported: true,
        message: `Incomplete payment ${paymentId} reported; backend unreachable. Do not assume success.`,
      });
    }
  };
}

function assertPaymentsReady(init: PiInitResult): string | null {
  if (!init.ok) {
    return init.reason;
  }
  if (typeof window === "undefined" || !window.Pi) {
    return "window.Pi is unavailable. Use Pi Browser or the documented sandbox flow.";
  }
  const createPayment = (window.Pi as { createPayment?: PiCreatePayment }).createPayment;
  if (typeof createPayment !== "function") {
    return "Pi.createPayment is unavailable on window.Pi.";
  }
  return null;
}

/**
 * Start a documented U2A payment. Server approve/complete happen on the
 * generated-app backend with Key auth. Client callbacks alone are not final.
 */
export function startPiPayment(
  init: PiInitResult,
  input: CreatePaymentInput,
  onState: (state: PaymentUiState) => void,
): void {
  const readyError = assertPaymentsReady(init);
  if (readyError) {
    onState({ phase: "error", message: readyError });
    return;
  }

  if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
    onState({ phase: "error", message: "Payment amount must be a positive number." });
    return;
  }

  const createPayment = (window.Pi as { createPayment: PiCreatePayment }).createPayment;
  onState({ phase: "creating" });

  createPayment(
    {
      amount: input.amount,
      memo: input.memo,
      metadata: {
        product: "pi-payments-starter-demo",
        ...(input.metadata ?? {}),
      },
    },
    {
      onReadyForServerApproval: async (paymentId: string) => {
        onState({ phase: "awaiting_approval", paymentId });
        try {
          const response = await postJson(
            `/api/pi/payments/${encodeURIComponent(paymentId)}/approve`,
            {},
          );
          if (!response.ok) {
            onState({
              phase: "error",
              paymentId,
              message: `Server approve failed (${response.status}). Payment not fulfilled.`,
            });
            return;
          }
          onState({ phase: "awaiting_user_sign", paymentId });
        } catch {
          onState({
            phase: "error",
            paymentId,
            message: "Server approve unreachable. Payment not fulfilled.",
          });
        }
      },
      onReadyForServerCompletion: async (paymentId: string, txid: string) => {
        onState({ phase: "completing", paymentId, txid });
        try {
          const response = await postJson(
            `/api/pi/payments/${encodeURIComponent(paymentId)}/complete`,
            { txid },
          );
          if (!response.ok) {
            // Official guidance: do not mark complete on non-success /complete.
            onState({
              phase: "error",
              paymentId,
              message: `Server complete failed (${response.status}). Do NOT treat as successful.`,
            });
            return;
          }
          onState({ phase: "completed", paymentId, txid });
        } catch {
          onState({
            phase: "error",
            paymentId,
            message: "Server complete unreachable. Do NOT treat as successful.",
          });
        }
      },
      onCancel: (paymentId: string) => {
        onState({ phase: "cancelled", paymentId });
        void postJson(`/api/pi/payments/${encodeURIComponent(paymentId)}/cancel`, {}).catch(
          () => undefined,
        );
      },
      onError: (error: unknown, payment?: PaymentDTOLike) => {
        const message =
          error instanceof Error ? error.message : "Pi.createPayment reported an error";
        onState({
          phase: "error",
          paymentId: payment?.identifier,
          message,
        });
      },
    },
  );
}
