import { useEffect, useState } from "react";
import type { PiInitResult } from "./pi/init";
import {
  authenticateWithPi,
  type IncompletePaymentNotice,
  type VerifiedPiUser,
} from "./pi/auth";

type Props = {
  piInit: PiInitResult;
};

export default function App({ piInit }: Props) {
  const [backendStatus, setBackendStatus] = useState<string>("checking…");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<VerifiedPiUser | null>(null);
  const [incomplete, setIncomplete] = useState<IncompletePaymentNotice | null>(
    null,
  );

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch("/api/health");
        if (!response.ok) {
          setBackendStatus(`unhealthy (${response.status})`);
          return;
        }
        const data = await response.json();
        setBackendStatus(data.status ?? "ok");
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
    // App-local verified-user state only — not an OpenSail session.
    setUser(null);
    setError(null);
    setIncomplete(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
            Pi Auth Starter
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Generated-app Pi sign-in
          </h1>
          <p className="text-slate-300 leading-relaxed">
            Official Pi SDK authentication for a self-hosted Pi application.
            Identity is verified by this app&apos;s backend via{" "}
            <code className="text-cyan-200">GET /v2/me</code>. This is not
            OpenSail Studio login.
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
            Production auth targets Pi Browser. Desktop development uses the
            documented sandbox flow. OpenSail preview is not full Pi Browser
            fidelity — see docs/PI_SETUP.md.
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
              <p className="text-xs text-slate-500">
                uid is app-scoped and can change after permission revocation.
                Access token is never shown.
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

        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-medium">Backend health</h2>
          <p className="text-slate-300">/api/health → {backendStatus}</p>
        </section>

        <section className="space-y-2 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <p>Architecture:</p>
          <pre className="overflow-x-auto rounded bg-slate-900 p-3 text-xs text-slate-300">{`Pi Browser / sandbox
  → Pi.authenticate(["username"], onIncompletePaymentFound)
  → accessToken (memory only)
  → POST /api/pi/auth/verify  (generated-app backend)
  → GET https://api.minepi.com/v2/me  Bearer token
  → verified uid/username
  → generated-app local verified-user state`}</pre>
          <p>
            Deferred: Pi payments / Server API Key → Phase 5 (pi-payments).
          </p>
          <p>
            Related skills: pi-auth, pi-sdk, pi-platform-api, pi-browser,
            pi-compliance.
          </p>
        </section>
      </div>
    </main>
  );
}
