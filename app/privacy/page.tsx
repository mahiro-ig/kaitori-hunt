// app/privacy/page.tsx
import Link from "next/link"
import { ArrowLeft, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export const metadata = {
  title: "プライバシーポリシー | 買取ハント（五十嵐商事株式会社）",
  description:
    "五十嵐商事株式会社（買取ハント）のプライバシーポリシー。個人情報の取扱い、利用目的、第三者提供、クッキー、SSL/TLS暗号化通信、開示・訂正・利用停止等の請求窓口について。",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header / Back */}
      <div className="flex items-center mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary"
          aria-label="ホームに戻る"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          ホームに戻る
        </Link>
      </div>

      {/* Title */}
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-2xl bg-primary/10 p-3">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">プライバシーポリシー</h1>
          <p className="text-sm text-muted-foreground">五十嵐商事株式会社（買取ハント）</p>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">個人情報保護方針</CardTitle>
          <CardDescription>
            当社は、お客様の個人情報の重要性を認識し、その適正な取扱いと保護を社会的責務と考え、以下の方針を定めます。
          </CardDescription>
        </CardHeader>

        <CardContent className="text-sm leading-7">
          {/* 全体の余白を広めに（各条の間隔） */}
          <div className="space-y-8">
            {/* 1. 保護・管理 */}
            <section id="management" className="space-y-3">
              <h2 className="text-base font-semibold">1. 個人情報の保護・管理</h2>
              <p>
                当社は、個人情報を正確かつ最新の状態に保ち、不正アクセス・改ざん・破壊・紛失・漏えい等の防止のため、必要かつ適切な安全管理措置を講じます。
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>セキュリティシステムの維持、管理体制の整備、従業員教育の徹底</li>
                <li>アクセス権限を必要最小限に制限し、個人情報へのアクセスを厳格に管理</li>
                <li>紙媒体は使用後に断裁・廃棄、電子データは適切な方法で削除</li>
                <li>個人情報は、法令および業務上必要と判断する期間に限り保管</li>
              </ul>
            </section>

            {/* 2. 取得と利用目的 */}
            <section id="purpose" className="space-y-3">
              <h2 className="text-base font-semibold">2. 個人情報の取得および利用目的</h2>
              <p>当社は、適法かつ公正な手段により取得した個人情報を、以下の目的の範囲内で利用します。</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>本人確認、契約・取引に関する連絡</li>
                <li>商品の発送、買取代金の支払、アフターサービス対応</li>
                <li>見積書・領収書その他書類の送付</li>
                <li>古物営業法に基づく本人確認手続き（郵送・店頭・法人買取を含む）</li>
                <li>サービス品質向上を目的とした顧客データベースへの登録および運用</li>
                <li>上記に付随または関連する業務の遂行</li>
              </ul>
              <p className="text-muted-foreground">
                ※「キャンペーンやお知らせ等のご案内」は任意項目のため本ポリシーから除外しています。
              </p>
            </section>

            {/* 3. クッキー等 */}
            <section id="cookies" className="space-y-3">
              <h2 className="text-base font-semibold">3. クッキー（Cookies）およびJavaScriptの利用</h2>
              <p>
                当社サイトでは、利便性向上や手続きの円滑化のためにクッキーを使用する場合がありますが、これによりお客様個人を特定できる情報は取得しません。入力補助等のためにJavaScriptを使用しますが、個人情報の収集を目的としたものではありません。
              </p>
              <p className="text-muted-foreground">
                広告の効果測定を行う場合、広告クリック情報（クリック日時や掲載サイト等）と申込情報を照合することがありますが、法令・ガイドラインに従い適切に取り扱います。
              </p>
            </section>

            {/* 4. SSL/TLS */}
            <section id="ssl" className="space-y-3">
              <h2 className="text-base font-semibold">4. SSL/TLSによる通信の保護</h2>
              <p>
                個人情報を入力いただくフォーム等では、原則として<strong>SSL/TLS暗号化通信</strong>を採用し、通信中のデータを保護します。
                一部の非SSL環境向けフォームをご利用の場合は、この限りではありません。
              </p>
            </section>

            {/* 5. 第三者提供 */}
            <section id="third-parties" className="space-y-3">
              <h2 className="text-base font-semibold">5. 個人情報の第三者提供</h2>
              <p>当社は、次の場合を除き、お客様の個人情報を第三者に提供しません。</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>お客様の同意がある場合</li>
                <li>法令に基づき開示が必要な場合、または裁判所・警察等の公的機関から要請があった場合</li>
                <li>お客様または第三者の生命・身体・財産の保護が必要な場合</li>
                <li>業務委託先（クレジットカード会社・配送業者等）に業務遂行上必要な範囲で開示する場合</li>
              </ul>
            </section>

            {/* 6. 委託先監督 */}
            <section id="processors" className="space-y-3">
              <h2 className="text-base font-semibold">6. 個人情報の取り扱いの委託および監督</h2>
              <p>
                当社は、業務遂行のため個人情報の取扱いを委託する場合、秘密保持契約の締結等により安全管理措置を義務付け、適切な監督を行います。
              </p>
            </section>

            {/* 7. 開示・訂正等 */}
            <section id="data-subject-rights" className="space-y-3">
              <h2 className="text-base font-semibold">7. 開示・訂正・利用停止等の請求</h2>
              <p>
                お客様が自己の個人情報について開示・訂正・追加・削除・利用停止等を希望される場合は、ご本人確認のうえ、法令に従って速やかに対応します。
              </p>
            </section>

            {/* 8. 法令遵守と見直し */}
            <section id="compliance" className="space-y-3">
              <h2 className="text-base font-semibold">8. 法令遵守と継続的改善</h2>
              <p>
                当社は、個人情報保護法その他の関連法令・指針を遵守するとともに、本ポリシーを適宜見直し、継続的な改善に努めます。
              </p>
            </section>

            {/* お問い合わせ */}
            <section id="contact" className="space-y-2">
              <h2 className="text-base font-semibold">お問い合わせ窓口</h2>
              <address className="not-italic space-y-1 text-muted-foreground">
                <div>五十嵐商事株式会社（買取ハント本部）</div>
                <div>〒950-0087 新潟県新潟市中央区東大通1-2-30 第3マルカビル 10F</div>
                <div>TEL: 025-333-8655</div>
                <div>
                  E-mail:{" "}
                  <a href="mailto:info@kaitori-hunt.com" className="underline underline-offset-4 hover:text-primary">
                    info@kaitori-hunt.com
                  </a>
                </div>
              </address>
            </section>

            {/* 制定・改定日（必要に応じて更新してください） */}
            <section id="dates" className="space-y-1 text-muted-foreground">
              <p>制定日：2025年8月20日</p>
              <p>最終改定日：2025年8月20日</p>
            </section>

            {/* ページ下部の戻るボタン */}
            <div className="pt-2">
              <Button asChild variant="secondary">
                <Link href="/" aria-label="ホームに戻る">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  ホームに戻る
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
