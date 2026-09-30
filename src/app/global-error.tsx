"use client";

import * as React from "react";

/*
  Global error boundary. Yeh tab chalta hai jab root layout khud crash ho jaye,
  is liye apna <html>/<body> render karta hai - us halat me layout ke fonts aur
  CSS available nahi hote. Isi wajah se yahan inline styles hain, Tailwind par
  depend nahi kar sakte.

  SECURITY: user ko sirf generic message. error.message / stack kabhi show nahi.
  console.error sirf development me - production me koi debug logging nahi.
*/
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.error(error);
    }
    // TODO (Phase 7): error monitoring ko report karo.
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#ffffff",
          color: "#1b1d26",
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "26rem", textAlign: "center" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.2rem",
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              marginBottom: "1.25rem",
            }}
          >
            <span>SMIU Feedback Website</span>
            <span style={{ color: "#d23f37" }}>+</span>
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", lineHeight: 1.6, color: "#5b6070", margin: 0 }}>
            An unexpected error stopped the app from loading. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              cursor: "pointer",
              border: "1px solid #3d4b8e",
              borderRadius: "0.5rem",
              backgroundColor: "#4858a3",
              color: "#ffffff",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
            }}
          >
            Try again
          </button>
          {error.digest ? (
            <p style={{ marginTop: "1.5rem", fontSize: "0.75rem", color: "#757b8c" }}>
              Reference code: {error.digest}
            </p>
          ) : null}
        </div>
      </body>
    </html>
  );
}
