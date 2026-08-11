/**
 * Official Pi frontend SDK initialization.
 *
 * Uses only documented Pi.init fields from the Pi platform docs:
 *   - version: "2.0"
 *   - sandbox?: boolean
 *
 * VITE_PI_SDK_SANDBOX is an OpenSail/generated-app configuration value.
 * It is NOT an official Pi Platform environment variable.
 *
 * Pi.init({ sandbox: true }) does NOT select Developer Portal Testnet/Mainnet.
 */

export type PiInitResult =
  | { ok: true; sandbox: boolean }
  | { ok: false; reason: string };

function readSandboxFlag(): boolean {
  const raw = import.meta.env.VITE_PI_SDK_SANDBOX;
  if (raw === undefined || raw === "") {
    // Default to sandbox-friendly development.
    return true;
  }
  return String(raw).toLowerCase() === "true" || raw === "1";
}

export function initPiSdk(): PiInitResult {
  if (typeof window === "undefined") {
    return { ok: false, reason: "Pi SDK is browser-only (window is undefined)." };
  }

  if (!window.Pi || typeof window.Pi.init !== "function") {
    return {
      ok: false,
      reason:
        "window.Pi is unavailable. Ensure https://sdk.minepi.com/pi-sdk.js is loaded, and test in Pi Browser or the documented sandbox flow.",
    };
  }

  const sandbox = readSandboxFlag();

  window.Pi.init({
    version: "2.0",
    sandbox,
  });

  return { ok: true, sandbox };
}
