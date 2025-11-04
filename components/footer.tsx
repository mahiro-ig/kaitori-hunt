// components/footer.tsx
import Link from "next/link";

export function Footer() {
  return (
    <footer
      role="contentinfo"
      className="border-t bg-background"
    >
      <div className="container mx-auto px-4 py-6 pb-[env(safe-area-inset-bottom)]">
        {/* モバイル：縦並び中央 / SM以上：左右2カラム */}
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          {/* コピーライト */}
          <p className="text-xs text-muted-foreground text-center sm:text-left shrink-0">
            © 2025 五十嵐商事株式会社. All rights reserved.
          </p>

          {/* ナビ：折り返しOK＋行間確保 */}
          <nav
            aria-label="フッターナビゲーション"
            className="min-w-0"
          >
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              <li>
                <Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/about">
                  会社概要
                </Link>
              </li>
              <li>
                <Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/terms">
                  利用規約
                </Link>
              </li>
              <li>
                <Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/privacy">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/faq">
                  よくある質問
                </Link>
              </li>
              <li>
                <Link className="hover:underline underline-offset-4 whitespace-nowrap" href="/legal">
                  特定商取引法に基づく表記
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
