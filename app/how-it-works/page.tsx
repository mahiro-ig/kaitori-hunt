import Link from "next/link"
import Image from "next/image"
import { ArrowLeft, ArrowRight, CheckCircle2, FileDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function HowItWorksPage() {
  return (
    <div className="container mx-auto px-4 py-8 overflow-x-hidden">
      <div className="flex items-center mb-6">
        <Link
          href="/"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          ホームに戻る
        </Link>
        <h1 className="text-2xl font-bold">郵送買取の流れ</h1>
      </div>

      <div className="max-w-3xl mx-auto mb-12">
        <h2 className="text-3xl font-bold text-center mb-6">簡単3ステップで郵送買取</h2>
        <p className="text-center text-muted-foreground mb-8">
          買取ハントでは、お客様の大切な製品を最高の価格で買取いたします。 買取プロセスは簡単3ステップで完了します。
        </p>

        <div className="grid gap-8 mt-8">
          {/* ステップ1 */}
          <Card className="w-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  1
                </div>
                <CardTitle className="min-w-0 break-words">会員登録・ログイン</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 min-w-0">
                  <CardDescription className="text-base mb-4 break-words">
                    まずは会員登録をして、買取ハントのアカウントを作成しましょう。
                    登録は無料で、数分で完了します。すでにアカウントをお持ちの方はログインしてください。
                  </CardDescription>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>簡単な情報入力で登録完了</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>買取履歴の管理が可能</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>会員限定の特典あり</span>
                    </li>
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/auth/register">
                      <Button variant="outline" size="sm">
                        会員登録する
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="order-first md:order-last">
                  <Image
                    src="/images/register-login.jpg"
                    alt="会員登録・ログイン イメージ"
                    width={220}
                    height={160}
                    className="rounded-lg mx-auto w-full max-w-[220px] h-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ステップ2 */}
          <Card className="w-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  2
                </div>
                <CardTitle className="min-w-0 break-words">買取申込</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 min-w-0">
                  <CardDescription className="text-base mb-4 break-words">
                    買取を希望する製品をカートに追加し、必要情報を入力して買取申込を確定します。
                    複数の製品をまとめて申し込むことも可能です。
                  </CardDescription>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>iPhone、カメラ、ゲーム機など多数の製品に対応</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>カラーや容量など詳細な選択が可能</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>申込確認メールが自動送信</span>
                    </li>
                  </ul>
                  {/* ←ここが原因：wrap可能にし、space-x を gap に置換 */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href="/categories">
                      <Button variant="outline" size="sm">
                        買取カテゴリーを見る
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                    <Link href="/documents/purchase-form">
                      <Button variant="outline" size="sm">
                        買取依頼書をダウンロード
                        <FileDown className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
                <div className="order-first md:order-last">
                  <Image
                    src="/images/order.jpg"
                    alt="買取申込イメージ"
                    width={220}
                    height={160}
                    className="rounded-lg mx-auto w-full max-w-[220px] h-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ステップ3 */}
          <Card className="w-full">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  3
                </div>
                <CardTitle className="min-w-0 break-words">郵送・査定・買取成立</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 items-center">
                <div className="md:col-span-2 min-w-0">
                  <CardDescription className="text-base mb-4 break-words">
                    申込承認メールが届きましたら、メールに記載の手順に従って製品を指定の住所に郵送いただき、専門スタッフが製品の状態を確認します。
                    査定後、買取価格をご提案し、ご納得いただければその場で買取成立です。
                  </CardDescription>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>専門スタッフによる丁寧な査定</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>市場価値に基づいた適正価格の提案</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
                      <span>銀行振込でのお支払い</span>
                    </li>
                  </ul>
                </div>
                <div className="order-first md:order-last">
                  <Image
                    src="/images/complete.jpg"
                    alt="査定イメージ"
                    width={220}
                    height={160}
                    className="rounded-lg mx-auto w-full max-w-[220px] h-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="bg-muted rounded-lg p-6 max-w-3xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-4">買取時に必要なもの</h2>
        <ul className="space-y-2">
          <li className="flex items-start">
            <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
            <div>
              <span className="font-medium">本人確認書類(2点)</span>
              <p className="text-sm text-muted-foreground break-words">
                運転免許証、マイナンバーカード、在留カード等のコピー1点<br/>
                住民票の写し1点（初回の方、前回提出から1年以上経過している方）
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
            <div>
              <span className="font-medium">買取希望の製品</span>
              <p className="text-sm text-muted-foreground">
                新品未使用品のみ対応。付属品（充電器、ケーブル、箱など）も全て揃えてください。
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
            <div>
              <span className="font-medium">発送用の梱包材</span>
              <p className="text-sm text-muted-foreground">
                製品を保護するための適切な梱包材をご用意ください。
              </p>
            </div>
          </li>
          <li className="flex items-start">
            <CheckCircle2 className="h-5 w-5 mr-2 text-primary shrink-0" />
            <div>
              <span className="font-medium">買取依頼書</span>
              <p className="text-sm text-muted-foreground">
                記入・署名・捺印の上、必ず商品と一緒に同封してください。
              </p>
              <div className="mt-2">
                <Link href="/documents/purchase-form">
                  <Button variant="outline" size="sm" className="flex items-center">
                    <FileDown className="mr-2 h-4 w-4" />
                    買取依頼書をダウンロード
                  </Button>
                </Link>
              </div>
            </div>
          </li>
        </ul>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg max-w-3xl mx-auto mt-8 w-full">
        <h2 className="text-xl font-bold mb-4 text-yellow-800">発送先について</h2>
        <p className="text-sm font-semibold text-yellow-700 mb-4 leading-relaxed">
          <br/> 〒950-0087 新潟県新潟市中央区東大通1-2-30 第3マルカビル 10F<br/> 五十嵐商事株式会社 査定部宛
        </p>
        <p className="text-sm text-yellow-700">
          発送は原則当日中、到着は翌日営業時間内までに必着です。弊社への到着が遅れた場合、到着時の買取価格での買取となりますのでご注意ください。
        </p>
      </div>

      <div className="text-center mt-12 w-full">
        <h2 className="text-2xl font-bold mb-4">まずは買取申込から始めましょう</h2>
        <p className="text-muted-foreground mb-6">
          不要になった新品未使用品を高価買取。簡単3ステップで、あなたの製品に新しい価値を。
        </p>
        <Link href="/">
          <Button size="lg">
            買取カテゴリーを見る
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
