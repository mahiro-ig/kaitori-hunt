"use client"

import Link from "next/link"
import { ArrowLeft, FileDown, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PurchaseFormPage() {
  // PDFダウンロード処理
  const handleDownload = () => {
    // 実際の環境では、ここでPDFファイルへのリンクを提供します
    const pdfUrl = "/documents/purchase-form.pdf"

    // PDFをダウンロードするためのリンクを作成
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = "買取依頼書.pdf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center mb-6">
        <Link
          href="/dashboard"
          className="flex items-center text-sm font-medium text-muted-foreground hover:text-primary mr-4"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">買取依頼書</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>買取依頼書のダウンロードと記入方法</CardTitle>
              <CardDescription>
                買取依頼書をダウンロードして、必要事項を記入の上、商品と一緒に発送してください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-center justify-center p-6 border rounded-lg bg-muted/50">
                <h2 className="text-xl font-bold mb-4">買取依頼書/買取同意書</h2>
                <div className="flex space-x-4">
                  <Button className="flex items-center" onClick={handleDownload}>
                    <FileDown className="mr-2 h-4 w-4" />
                    PDFをダウンロード
                  </Button>
                  <Button variant="outline" className="flex items-center" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    印刷する
                  </Button>
                </div>
              </div>

              <div className="border p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4 text-center">買取依頼書/買取同意書</h3>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-end">
                    <p>記入日：　　　月　　　　日</p>
                  </div>

                  <div>
                    <h4 className="font-bold border-b pb-1 mb-2">依頼者情報</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      古物商許可証　新潟県公安委員会　第461100000687号
                    </p>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p>買取方法予約番号</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                      <div>
                        <p>フリガナ　　　　　　　　　　　年齢　　　性別</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                    </div>

                    <div className="mb-2">
                      <p>名前</p>
                      <div className="border-b border-dashed h-6"></div>
                    </div>

                    <div className="mb-2">
                      <p>住所</p>
                      <div className="border-b border-dashed h-6"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p>電話番号</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                      <div>
                        <p>メールアドレス</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                    </div>

                    <div className="mb-2">
                      <p>ご職業</p>
                      <div className="border-b border-dashed h-6"></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold border-b pb-1 mb-2">買取品内容</h4>
                    <div className="grid grid-cols-4 gap-2 mb-2 text-center font-medium">
                      <p>商品名</p>
                      <p>色・サイズ</p>
                      <p>数量</p>
                      <p>査定金額</p>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-1">
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-1">
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-1">
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                      <div className="border-b border-dashed h-6"></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold border-b pb-1 mb-2">お振込先情報</h4>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p>銀行名</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                      <div>
                        <p>支店名</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-2">
                      <div>
                        <p>口座種別　　普通・当座</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                      <div>
                        <p>口座番号</p>
                        <div className="border-b border-dashed h-6"></div>
                      </div>
                    </div>
                    <div className="mb-2">
                      <p>口座名義（カナ）</p>
                      <div className="border-b border-dashed h-6"></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold border-b pb-1 mb-2">ご確認事項</h4>
                    <ul className="list-inside space-y-1">
                      <li>
                        □
                        お値段の保証は予約期間までに発送された商品に限ります。商品の状態や相場によって減額、買取不可となる場合がございます。
                      </li>
                      <li>□ 商品が当社に到着するまでの破損、紛失に関しましては当社は一切の責任を負いません。</li>
                      <li>□ 18歳未満の方は、親権者の方が記入した保護者同意書を同封の上発送してください。</li>
                      <li>
                        □
                        不正転売を目的とした商品（模倣品、盗品、サンプル品等）、割賦残債額のある商品、免税店での購入品などは買取できません。
                      </li>
                      <li>□ 買取不成立時、弊社からの返品は着払いにて郵送いたします。</li>
                      <li>
                        □
                        虚偽の事実の記載、架空の適格請求書発行事業者登録番号の入力を行った場合、買取金額の訂正と損害賠償請求を行う場合がございます。
                      </li>
                      <li>
                        □
                        返送時の受取拒否等で当社への返送が確認された場合、所有権の放棄とみなし、当社にて物品の処分を行います。
                      </li>
                    </ul>
                  </div>

                  <div className="border-t pt-4">
                    <p className="mb-2">上記全てに同意いただける場合はご署名をお願いします。</p>
                    <div className="flex justify-end">
                      <p>署名欄　　　　　　　　　　　　　　　　　　　㊞</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <p className="font-bold">商品送付先</p>
                    <p>〒950-0087　新潟県新潟市中央区東大通1-2-30 第3マルカビル10F　五十嵐商事株式会社　査定部宛</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">記入方法</h3>
                <ol className="space-y-4 list-decimal list-inside">
                  <li className="pl-2">
                    <span className="font-medium">記入日を記入</span>
                    <p className="text-sm text-muted-foreground mt-1 pl-6">
                      買取依頼書を記入した日付を記入してください。
                    </p>
                  </li>
                  <li className="pl-2">
                    <span className="font-medium">依頼者情報を記入</span>
                    <p className="text-sm text-muted-foreground mt-1 pl-6">
                      氏名、フリガナ、年齢、性別、住所、電話番号、メールアドレス、ご職業、生年月日を記入してください。
                    </p>
                  </li>
                  <li className="pl-2">
                    <span className="font-medium">買取品内容を記入</span>
                    <p className="text-sm text-muted-foreground mt-1 pl-6">
                      商品名、色・サイズ、数量、製造番号（携帯電話の場合はIMEI番号）を記入してください。
                    </p>
                  </li>
                  <li className="pl-2">
                    <span className="font-medium">お振込先情報を記入</span>
                    <p className="text-sm text-muted-foreground mt-1 pl-6">
                      銀行名、支店名、口座種別、口座番号、口座名義（カナ）を記入してください。
                    </p>
                  </li>
                  <li className="pl-2">
                    <span className="font-medium">確認事項をチェック</span>
                    <p className="text-sm text-muted-foreground mt-1 pl-6">
                      すべての確認事項を読み、内容に同意いただける場合はチェックを入れてください。
                    </p>
                  </li>
                  <li className="pl-2">
                    <span className="font-medium">署名欄に署名</span>
                    <p className="text-sm text-muted-foreground mt-1 pl-6">署名欄に自筆で署名し、捺印してください。</p>
                  </li>
                </ol>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertDescription>
                  <p className="font-semibold">重要事項</p>
                  <ul className="list-disc list-inside mt-1 text-sm">
                    <li>買取依頼書は必ず記入・署名の上、商品と一緒に発送してください。</li>
                    <li>記入漏れや署名がない場合、買取手続きが遅れる場合があります。</li>
                    <li>18歳未満の方は、保護者同意書も必要です。</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>必要書類一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs mr-2">
                    1
                  </span>
                  <div>
                    <p className="font-medium">買取依頼書（必須）</p>
                    <p className="text-sm text-muted-foreground">記入・署名済みのもの</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs mr-2">
                    2
                  </span>
                  <div>
                    <p className="font-medium">住民票の写し（必須）</p>
                    <p className="text-sm text-muted-foreground">発行から3ヶ月以内の原本</p>
                  </div>
                </li>
                <li className="flex items-start">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs mr-2">
                    3
                  </span>
                  <div>
                    <p className="font-medium">保護者同意書（18歳未満の方のみ）</p>
                    <p className="text-sm text-muted-foreground">親権者の署名・捺印が必要</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>発送先情報</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium">五十嵐商事株式会社 査定部</p>
                <p>〒950-0087</p>
                <p>新潟県新潟市中央区東大通1-2-30 第3マルカビル10F</p>
                <p className="text-sm text-muted-foreground mt-4">
                  発送は原則当日中、到着は翌日営業時間内までに必着です。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
