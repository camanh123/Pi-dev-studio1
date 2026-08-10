/**
 * Generated-app Pi authentication helpers (Payments Starter).
 *
 * Official contract (Phase 1 catalog: pi-sdk-reference, pi-platform-api):
 *   Pi.authenticate(scopes, onIncompletePaymentFound) → AuthResult
 *   Backend verifies with GET https://api.minepi.com/v2/me
 *     Authorization: Bearer <accessToken>
 *
 * This starter requests username + payments scopes for U2A demo payments.
 * This is NOT OpenSail authentication.
 */

import type { PiInitResult } from "./init";
import {
  createIncompletePaymentHandler,
  type IncompletePaymentNotice,
} from "./payments";

export type { IncompletePaymentNotice };

export type VerifiedPiUser = {
  uid: string;
  username: string | null;
};

export type PiAuthSuccess = {
  ok: true;
  user: VerifiedPiUser;
  incompletePayment: IncompletePaymentNotice | null;
};

export type PiAuthFailure = {
  ok: false;
  reason: string;
  incompletePayment: IncompletePaymentNotice | null;
};

export type PiAuthResult = PiAuthSuccess | PiAuthFailure;

type AuthResultLike = {
  accessToken?: string;
  user?: {
    uid?: string;
    username?: string;
  };
};

type PiAuthenticate = (
  scopes: string[],
  onIncompletePaymentFound: (payment: unknown) => void | Promise<void>,
) => Promise<AuthResultLike> | AuthResultLike;

function assertPiReady(init: PiInitResult): string | null {
  if (!init.ok) {
    return init.reason;
  }
  if (typeof window === "undefined" || !window.Pi) {
    return "window.Pi is unavailable. Use Pi Browser or the documented sandbox flow.";
  }
  const authenticate = (window.Pi as { authenticate?: PiAuthenticate }).authenticate;
  if (typeof authenticate !== "function") {
    return "Pi.authenticate is unavailable on window.Pi.";
  }
  return null;
}

/**
 * Authenticate with Pi SDK and verify via generated-app backend.
 * Access token is memory-only for the verify request and never returned.
 */
export async function authenticateWithPi(
  init: PiInitResult,
  options: {
    onIncompletePayment?: (notice: IncompletePaymentNotice) => void;
  } = {},
): Promise<PiAuthResult> {
  const readyError = assertPiReady(init);
  if (readyError) {
    return { ok: false, reason: readyError, incompletePayment: null };
  }

  let incompletePayment: IncompletePaymentNotice | null = null;
  const onIncomplete = createIncompletePaymentHandler((notice) => {
    incompletePayment = notice;
    options.onIncompletePayment?.(notice);
  });

  const authenticate = (window.Pi as { authenticate: PiAuthenticate }).authenticate;

  let authResult: AuthResultLike;
  try {
    // payments scope required for Pi.createPayment in this starter.
    authResult = await Promise.resolve(
      authenticate(["username", "payments"], onIncomplete),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Pi.authenticate failed";
    return { ok: false, reason: message, incompletePayment };
  }

  const accessToken = authResult?.accessToken;
  if (!accessToken || typeof accessToken !== "string") {
    return {
      ok: false,
      reason: "Pi.authenticate did not return an accessToken.",
      incompletePayment,
    };
  }

  try {
    const response = await fetch("/api/pi/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    void accessToken;

    if (!response.ok) {
      let detail = `Verification failed (${response.status})`;
      try {
        const body = await response.json();
        if (typeof body?.detail === "string") {
          detail = body.detail;
        }
      } catch {
        // ignore
      }
      return { ok: false, reason: detail, incompletePayment };
    }

    const verified = (await response.json()) as {
      uid?: string;
      username?: string | null;
    };

    if (!verified.uid || typeof verified.uid !== "string") {
      return {
        ok: false,
        reason: "Backend verification did not return a uid.",
        incompletePayment,
      };
    }

    return {
      ok: true,
      user: {
        uid: verified.uid,
        username: verified.username ?? null,
      },
      incompletePayment,
    };
  } catch {
    return {
      ok: false,
      reason: "Could not reach generated-app backend for Pi verification.",
      incompletePayment,
    };
  }
}
