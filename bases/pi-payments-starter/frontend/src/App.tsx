import { useEffect, useState } from "react";
import type { PiInitResult } from "./pi/init";
import {
  authenticateWithPi,
  type IncompletePaymentNotice,
  type VerifiedPiUser,
} from "./pi/auth";
import { startPiPayment, type PaymentUiState } from "./pi/payments";

type Props = {
  piInit: PiInitResult;
};

/** Demo amount only — not a production price. */
const DEMO_PAYMENT_AMOUNT = 1;

export default function App({ piInit }: Props) {
  const [backendStatus, setBackendStatus] = useState<string>("checking…");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<VerifiedPiUser | null>(null);
  const [incomplete, setIncomplete] = useState<IncompletePaymentNotice | null>(
    null,
  );
  const [payment, setPayment] = useState<PaymentUiState>({ phase: "idle" });

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          setBackendStatus(`unhealthy (${response.status})`);
          return;
        }
        const data = await response.json();
        const keyHint =
          data.server_key_configured === true
            ? "server key configured"
            : "server key missing";
        setBackendStatus(`${data.status ?? "ok"} (${keyHint})`);
      } catch {
        setBackendStatus("unreachable");
      }
    };
    void run();
  }, []);

  const onSignIn = async () => {
    setBusy(true);
    setError(null);
    setIncomplete(null);
    try {
      const result = await authenticateWithPi(piInit, {
        onIncompletePayment: setIncomplete,
      });
      if (!result.ok) {
        setUser(null);
        setError(result.reason);
        setIncomplete(result.incompletePayment);
        return;
      }
      setUser(result.user);
      setIncomplete(result.incompletePayment);
    } finally {
      setBusy(false);
    }
  };

  const onSignOut = () => {
    setUser(null);
    setError(null);
    setIncomplete(null);
    setPayment({ phase: "idle" });
  };

  const onPay = () => {
    if (!user) {
      setError("Sign in with Pi before starting a payment.");
      return;
    }
    setError(null);
    startPiPayment(
      piInit,
      {
        amount: DEMO_PAYMENT_AMOUNT,
        memo: "Pi Payments Starter demo",
        metadata: { demo: true, buyerUid: user.uid },
      },
      setPayment,
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
            Pi Payments Starter
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Generated-app Pi U2A payments
          </h1>
          <p className="text-slate-300 leading-relaxed">
            Official Pi SDK authentication and User-To-App payments for a
            self-hosted Pi application. This is not OpenSail authentication and
            not OpenSail / Stripe billing.
          </p>
        </header>

        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-medium">SDK status</h2>
          {piInit.ok ? (
            <p className="text-emerald-300">
              Pi.init completed (version 2.0, sandbox=
              {String(piInit.sandbox)}).
            </p>
          ) : (
            <p className="text-amber-300">{piInit.reason}</p>
          )}
          <p className="text-sm text-slate-400">
            Prefer Pi Browser + Developer Portal Testnet for real payment tests.
            OpenSail preview is not full Pi Wallet fidelity.{" "}
            <code className="text-slate-300">sandbox=true</code> does not switch
            portal Testnet/Mainnet.
          </p>
        </section>

        <section className="space-y-4 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-medium">Pi authentication</h2>
          {user ? (
            <div className="space-y-2 rounded-lg border border-emerald-800/60 bg-emerald-950/40 p-4">
              <p className="text-emerald-300">Verified by generated-app backend</p>
              <p className="text-sm text-slate-300">
                uid: <code>{user.uid}</code>
              </p>
              <p className="text-sm text-slate-300">
                username: <code>{user.username ?? "(not provided)"}</code>
              </p>
              <button
                type="button"
                onClick={onSignOut}
                className="mt-2 rounded bg-slate-800 px-3 py-2 text-sm hover:bg-slate-700"
              >
                Clear local verified state
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void onSignIn()}
              disabled={busy || !piInit.ok}
              className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {busy ? "Signing in…" : "Sign in with Pi"}
            </button>
          )}
          {error && <p className="text-amber-300 text-sm">{error}</p>}
          {incomplete && (
            <p className="text-sm text-slate-400">{incomplete.message}</p>
          )}
        </section>

        <section className="space-y-4 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-medium">Demo U2A payment</h2>
          <p className="text-sm text-slate-400">
            Example amount π{DEMO_PAYMENT_AMOUNT} (demo only). Server approve /
            complete use a backend-only project secret. Client callbacks alone
            are not final settlement proof.
          </p>
          <button
            type="button"
            onClick={onPay}
            disabled={!user || !piInit.ok || payment.phase === "creating"}
            className="rounded bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
          >
            Pay π{DEMO_PAYMENT_AMOUNT} (demo)
          </button>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-300">
            {JSON.stringify(payment, null, 2)}
          </pre>
          <p className="text-xs text-slate-500">
            Mainnet requires deliberate Developer Portal configuration and human
            review. Prefer Testnet while developing.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-medium">Backend health</h2>
          <p className="text-slate-300">/api/health → {backendStatus}</p>
        </section>

        <section className="space-y-2 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <p>U2A architecture:</p>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-300">{`Pi.createPayment({ amount, memo, metadata }, callbacks)
  → onReadyForServerApproval(paymentId)
  → POST /api/pi/payments/{id}/approve   (backend Key auth)
  → Pi Wallet user signing
  → onReadyForServerCompletion(paymentId, txid)
  → POST /api/pi/payments/{id}/complete { txid }
  → verified local payment state`}</pre>
          <p>
            Out of scope: money returns, recurring billing, callback relays,
            app-to-user payouts, wallet APIs, App Studio automation, OpenSail
            Stripe replacement.
          </p>
          <p>
            Skills: pi-payments, pi-auth, pi-sdk, pi-platform-api, pi-browser,
            pi-compliance, pi-developer-portal.
          </p>
        </section>
      </div>
    </main>
  );
}
