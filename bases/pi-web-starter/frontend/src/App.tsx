import { useEffect, useState } from "react";
import type { PiInitResult } from "./pi/init";

type Props = {
  piInit: PiInitResult;
};

export default function App({ piInit }: Props) {
  const [backendStatus, setBackendStatus] = useState<string>("checking…");

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 px-6 py-12">
      <div className="mx-auto max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm uppercase tracking-[0.2em] text-cyan-400">
            Pi Web Starter
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">
            Official Pi SDK shell
          </h1>
          <p className="text-slate-300 leading-relaxed">
            Minimal self-hosted web app with the official Pi JavaScript SDK
            loaded from the documented CDN. Authentication and payments are
            intentionally excluded.
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
            OpenSail preview helps with ordinary web UI. Full Pi Browser /
            sandbox fidelity is required for Pi-native runtime behavior. See
            docs/PI_SETUP.md.
          </p>
        </section>

        <section className="space-y-3 border-t border-slate-800 pt-6">
          <h2 className="text-lg font-medium">Backend health</h2>
          <p className="text-slate-300">/api/health → {backendStatus}</p>
          <p className="text-sm text-slate-400">
            Backend is scaffolding only — health check, no Pi auth or payment
            integration in this starter.
          </p>
        </section>

        <section className="space-y-2 border-t border-slate-800 pt-6 text-sm text-slate-400">
          <p>Deferred (see README / docs/PI_SETUP.md):</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pi authentication starter → Phase 4 (pi-auth skill)</li>
            <li>Pi payments starter → Phase 5 (pi-payments skill)</li>
          </ul>
          <p className="pt-2">
            Related skills: pi-sdk, pi-developer-portal, pi-browser.
          </p>
        </section>
      </div>
    </main>
  );
}
