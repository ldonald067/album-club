"use client";

import { useEffect } from "react";

// App Router error boundary. Without this, any render-time throw (a poisoned
// fetch body, a bad data shape) blanks the entire page with no recovery.
// Here it degrades to an on-brand retry card instead.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div
      style={{
        maxWidth: 520,
        margin: "80px auto",
        padding: "0 20px",
        textAlign: "center",
        fontFamily: "var(--font-body, monospace)",
      }}
    >
      <div className="panel">
        <div className="panel-header">
          <span>💿 Needle skipped</span>
        </div>
        <div className="panel-body">
          <p style={{ marginBottom: 16 }}>
            Something glitched while loading the club. Your streak and votes are
            safe — this is just the page hiccuping.
          </p>
          <button className="btn-submit" onClick={() => reset()}>
            ▶ Try again
          </button>
          <p style={{ marginTop: 14, fontSize: 11, opacity: 0.6 }}>
            Still stuck? Reload the page.
          </p>
        </div>
      </div>
    </div>
  );
}
