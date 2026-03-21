"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
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
          backgroundColor: "#09090b",
          color: "#fafafa",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        }}
      >
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 1.5rem",
              borderRadius: "50%",
              backgroundColor: "rgba(147, 51, 234, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            !
          </div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
            Something went wrong
          </h1>
          <p
            style={{
              color: "#a1a1aa",
              marginTop: "0.75rem",
              maxWidth: 400,
              lineHeight: 1.5,
            }}
          >
            A critical error occurred. Please try refreshing the page.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 1.5rem",
              backgroundColor: "#9333ea",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
