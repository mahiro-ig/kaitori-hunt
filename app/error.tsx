"use client";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 16 }}>
      <h2>ページでエラーが発生しました</h2>
      <pre style={{ whiteSpace: "pre-wrap" }}>{String(error.stack || error.message || error)}</pre>
      <button onClick={() => reset()} style={{ padding: 8, marginTop: 8, border: "1px solid #ccc" }}>
        再試行
      </button>
    </div>
  );
}
