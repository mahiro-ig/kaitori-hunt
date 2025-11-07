// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="text-3xl font-bold mb-3">ページが見つかりません</h1>
      <p className="text-muted-foreground mb-6">
        お探しのページは移動・削除されたか、URL が間違っている可能性があります。
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex items-center rounded-md border px-4 py-2"
        >
          トップへ戻る
        </Link>
        
      </div>
    </div>
  );
}
