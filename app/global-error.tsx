"use client";

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  return (
    <html>
      <body style={{ padding: 16, fontFamily: "system-ui" }}>
        <h1>Something went wrong.</h1>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#eee", padding: 12, borderRadius: 8 }}>
{String(error.stack || error.message || error)}
        </pre>
        <a href="/" style={{ color: "#0af" }}>Back to Home</a>
      </body>
    </html>
  );
}
