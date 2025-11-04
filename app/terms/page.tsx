"use client"
// app/terms/page.tsx

import React from "react"
import Link from "next/link"
import { ArrowLeft, FileText, Shield, ScrollText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center mb-6">
        <Link
          href="/"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          ホームに戻る
        </Link>
        <h1 className="text-2xl font-bold">利用規約</h1>
      </div>

      {/* ヒーロー/イントロカード */}
      <Card className="mb-10">
        <CardHeader className="flex flex-row items-center gap-3">
          <FileText className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>買取ハント 利用規約</CardTitle>
            <p className="text-sm text-muted-foreground">
              本規約は、五十嵐商事株式会社が提供する「買取ハント」のご利用条件を定めるものです。
            </p>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          本サービスをご利用いただくことで、本規約に同意したものとみなします。内容をご確認のうえご利用ください。
        </CardContent>
      </Card>

      {/* 2カラム：目次 + 本文 */}
      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
        {/* 目次（デスクトップで固定） */}
        <aside className="hidden md:block">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <ScrollText className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">目次</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <nav className="space-y-2">
                {[
                  ["#article-1", "第1条 目的と適用範囲"],
                  ["#article-2", "第2条 サービスの内容"],
                  ["#article-3", "第3条 利用資格"],
                  ["#article-4", "第4条 本人確認の実施"],
                  ["#article-5", "第5条 買取対象外の商品"],
                  ["#article-6", "第6条 キャンセルと返却"],
                  ["#article-7", "第7条 禁止される行為"],
                  ["#article-8", "第8条 免責事項"],
                  ["#article-9", "第9条 利用停止措置"],
                  ["#article-10", "第10条 規約の改定"],
                  ["#article-11", "第11条 準拠法・管轄"],
                ].map(([href, label]) => (
                  <div key={href}>
                    <Link
                      href={href}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {label}
                    </Link>
                  </div>
                ))}
              </nav>
            </CardContent>
          </Card>

          {/* 特商法リンク（任意） */}
          <Card className="mt-6">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">関連情報</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="mb-3 text-muted-foreground">
                「特定商取引法に基づく表記」は別ページで掲載しています。
              </p>
              <Link href="/legal">
                <Button variant="outline" size="sm">特定商取引法に基づく表記</Button>
              </Link>
            </CardContent>
          </Card>
        </aside>

        {/* 本文 */}
        <main className="prose prose-sm max-w-none md:prose-base dark:prose-invert">
          {/* スマホ用目次 */}
          <div className="md:hidden mb-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">目次</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    ["#article-1", "第1条 目的と適用範囲"],
                    ["#article-2", "第2条 サービスの内容"],
                    ["#article-3", "第3条 利用資格"],
                    ["#article-4", "第4条 本人確認の実施"],
                    ["#article-5", "第5条 買取対象外の商品"],
                    ["#article-6", "第6条 キャンセルと返却"],
                    ["#article-7", "第7条 禁止される行為"],
                    ["#article-8", "第8条 免責事項"],
                    ["#article-9", "第9条 利用停止措置"],
                    ["#article-10", "第10条 規約の改定"],
                    ["#article-11", "第11条 準拠法・管轄"],
                  ].map(([href, label]) => (
                    <Link
                      key={href}
                      href={href}
                      className="text-muted-foreground hover:text-primary"
                    >
                      {label}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 条文 */}
          <section id="article-1" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第1条（目的と適用範囲）</h2>
            <p>
              本利用規約（以下「本規約」といいます）は、五十嵐商事株式会社（以下「当社」といいます）が運営する買取サービス「買取ハント」（以下「本サービス」といいます）の利用条件を定めるものです。利用者は、本規約に同意のうえ本サービスを利用するものとし、利用の開始をもって同意が成立したものとみなします。
            </p>
            <p>本サービスは日本国内からのご利用に限ります。</p>
          </section>

          <section id="article-2" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第2条（サービスの内容）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>本サービスは、当社が指定する商品の買取およびこれに付随する業務全般を指します。</li>
              <li>
                買取方法と支払手段は次のとおりです。
                <ul className="list-disc pl-5 mt-1">
                  <li>郵送買取：銀行振込のみ</li>
                  <li>店頭買取：現金または銀行振込</li>
                  <li>法人買取：銀行振込</li>
                </ul>
              </li>
              {/* ここから分割した各項 */}
              <li>
                表示する買取価格は、最新の更新における価格であり、申込承認時点の価格を保証しません。
              </li>
              <li>
                申込承認当日の発送および翌日営業時間中の到着の場合に、承認された価格が適用されます。
                （翌々日到着となる場合は、申込前にお問い合わせください。）
              </li>
              <li>
                到着が遅れた場合は、検品完了時点での買取価格にて買取いたします。
              </li>
              <li>
                査定額は市場動向・在庫・商品の状態等により変動します。
              </li>
            </ol>
          </section>

          <section id="article-3" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第3条（利用資格）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>未成年者が利用する場合は、保護者の同意が必要です。保護者同意は当社所定の書面またはオンライン手続きで行います。</li>
              <li>個人事業主および法人が利用登録を行う場合は、<strong>適格請求書発行事業者登録番号（インボイス番号）の登録</strong>が必須です。番号を保有しない場合は登録できません。</li>
            </ol>
          </section>

          <section id="article-4" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第4条（本人確認の実施）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>古物営業法に基づき、買取時には本人確認を行います。</li>
              <li>郵送買取：初回利用または前回提出から1年以上経過している場合は、発行から3か月以内の住民票の写し（マイナンバー記載なし）を必須とし、加えて運転免許証・マイナンバーカード（表面のみ）・在留カード等のコピーいずれか1点を提出してください。</li>
              <li>店頭買取：運転免許証、マイナンバーカード（表面のみ）、在留カード等の原本を提示してください。</li>
              <li>法人：登記事項証明書または印鑑証明書（各発行から3か月以内）に加え、担当者の本人確認書類および名刺の提出が必要です。</li>
              <li>提出書類は法令に基づき適切に保管し、買取不成立の場合を除き返却いたしません。</li>
            </ol>
          </section>

          <section id="article-5" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第5条（買取対象外の商品）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>盗品、違法品、不正入手品</li>
              <li>割賦契約等の残債がある商品</li>
              <li>模造品、改造品、レンタル品、サンプル品</li>
              <li>免税品</li>
              <li>当社が取扱不可と判断した商品</li>
            </ul>
          </section>

          <section id="article-6" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第6条（キャンセルと返却）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>検品完了後のキャンセルは原則できません。</li>
              <li>査定結果に減額もしくは変更がある場合、当社よりお客様にご連絡いたします。査定結果に同意されない場合は、商品を着払いで返送いたします。</li>
              <li>買取成立後の返品は受け付けません。</li>
              <li>取扱不可品や不備のある商品の返送も着払いとなります。</li>
            </ol>
          </section>

          <section id="article-7" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第7条（禁止される行為）</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>虚偽または誤解を招く情報の提供</li>
              <li>他人名義や虚偽の登録による利用</li>
              <li>不正目的での利用</li>
              <li>当社や他の利用者への迷惑行為・業務妨害</li>
              <li>法令・公序良俗に反する行為</li>
              <li>コンピュータウイルス等の送信</li>
              <li>SNS等での当社に対する誹謗中傷</li>
              <li>複数アカウントの不正保持</li>
            </ul>
          </section>

          <section id="article-8" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第8条（免責事項）</h2>
            <ol className="list-decimal pl-5 space-y-1">
              <li>輸送中の破損・紛失について当社は責任を負いません。</li>
              <li>査定前の状態復元は行いません。</li>
              <li>本サービスの利用により発生した損害について、当社に故意または重大な過失がある場合を除き、一切の責任を負いません。</li>
            </ol>
          </section>

          <section id="article-9" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第9条（利用停止措置）</h2>
            <p>
              当社は、利用者が本規約に違反した場合、登録情報が虚偽である場合、不正取得品の持込みが判明した場合、支払遅延その他の債務不履行がある場合、または連絡不能となった場合には、事前通知なくサービス提供を停止することができます。
            </p>
          </section>

          <section id="article-10" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第10条（規約の改定）</h2>
            <p>
              当社は、必要に応じて本規約を改定することがあります。改定後に本サービスを利用された場合、改定後の内容に同意いただいたものとみなします。
            </p>
          </section>

          <section id="article-11" className="scroll-mt-20">
            <h2 className="text-xl font-bold mb-2">第11条（準拠法・管轄）</h2>
            <p>
              本規約は日本法に準拠します。本規約に関する一切の紛争は、新潟地方裁判所を第一審の専属的合意管轄裁判所とします。
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              最終改定日：2025年8月12日
            </p>
          </section>
        </main>
      </div>
    </div>
  )
}
