// app/legal/page.tsx
import { Header } from "@/components/header";

export default function CompanyInfoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
    
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12 max-w-4xl">
          <h1 className="text-lg sm:text-3xl font-bold mb-8 text-center">
            特定商取引法及び古物営業法に基づく表記
          </h1>

          <div className="space-y-8 bg-white rounded-lg border p-6 shadow-sm">
            <div>
              <h2 className="text-lg font-semibold mb-2 text-primary">運営会社</h2>
              <p>五十嵐商事株式会社</p>
              <p className="text-sm text-muted-foreground">
                （英文表記：IGARASHI CORPORATION）
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2 text-primary">運営責任者</h2>
              <p>代表取締役　五十嵐 真宙</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2 text-primary">所在地</h2>
              <p>〒950-0087</p>
              <p>新潟県新潟市中央区東大通1丁目2-30 第3マルカビル 10F</p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2 text-primary">電話番号</h2>
              <p>
                <a
                  href="tel:025-333-8655"
                  className="text-primary hover:underline"
                >
                  025-333-8655
                </a>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ※お電話によるお問い合わせは、平日10:00〜19:00／土曜10:00〜17:00に承っております。
                （日曜・祝日は休業）
              </p>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2 text-primary">メールアドレス</h2>
              <p>
                <a
                  href="mailto:support@kaitori-hunt.com"
                  className="text-primary hover:underline"
                >
                  support@kaitori-hunt.com
                </a>
              </p>
              
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-2 text-primary">古物商許可番号</h2>
              <p>新潟県公安委員会　第461100000687号</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                本表記は、五十嵐商事株式会社が運営する
                「買取ハント（
                <a
                  href="https://kaitori-hunt.com"
                  className="text-primary hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://kaitori-hunt.com
                </a>
                ）」に適用されます。
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
