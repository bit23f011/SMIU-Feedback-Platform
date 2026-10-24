"use client";

import * as React from "react";

import Script from "next/script";

interface TurnstileApi {
  render(
    container: HTMLElement,
    options: {
      sitekey: string;
      action: string;
      theme: "auto";
      size: "flexible";
      "response-field": boolean;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
    },
  ): string;
  reset(id: string): void;
  remove(id: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function Turnstile({
  siteKey,
  nonce,
  resetKey,
  onVerifiedChange,
  action = "signup",
}: {
  siteKey: string;
  nonce?: string;
  resetKey: unknown;
  onVerifiedChange: (verified: boolean) => void;
  action?: "signup" | "signin";
}) {
  const container = React.useRef<HTMLDivElement>(null);
  const widget = React.useRef<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [token, setToken] = React.useState("");
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    if (!ready || !window.turnstile || !container.current) return;
    const api = window.turnstile;
    const clear = () => {
      setToken("");
      onVerifiedChange(false);
    };
    const id = api.render(container.current, {
      sitekey: siteKey,
      action,
      theme: "auto",
      size: "flexible",
      "response-field": false,
      callback: (value) => {
        setToken(value);
        setFailed(false);
        onVerifiedChange(true);
      },
      "expired-callback": clear,
      "error-callback": () => {
        clear();
        setFailed(true);
      },
    });
    widget.current = id;
    return () => {
      api.remove(id);
      widget.current = null;
    };
  }, [ready, siteKey, onVerifiedChange, action]);

  // Har failed submit ke baad naya token chahiye, purana token sirf ek dafa valid hai.
  React.useEffect(() => {
    setToken("");
    setFailed(false);
    onVerifiedChange(false);
    if (widget.current) window.turnstile?.reset(widget.current);
  }, [resetKey, onVerifiedChange]);

  return (
    <div className="space-y-2">
      <Script
        id="signup-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        nonce={nonce}
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onError={() => {
          setFailed(true);
          onVerifiedChange(false);
        }}
      />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <div ref={container} className="min-h-[65px]" />
      {!ready && !failed ? (
        <p role="status" className="text-xs text-muted-foreground">
          Loading security check...
        </p>
      ) : null}
      {failed ? (
        <p role="alert" className="text-xs font-medium text-state-danger">
          The security check could not load. Please reload and try again.
        </p>
      ) : null}
      <noscript>
        <p className="text-xs text-state-danger">
          Enable JavaScript to complete the security check.
        </p>
      </noscript>
    </div>
  );
}
