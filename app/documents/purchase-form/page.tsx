"use client"

import Link from "next/link"
import { ArrowLeft, FileDown, Printer } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function PurchaseFormPage() {
  // public配下に配置したPDFへのパス（例: /public/docs/買取依頼書_買取同意書.pdf）
  const pdfUrl = "/docs/買取依頼書_買取同意書.pdf"

  // PDFダウンロード
  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = "[買取ハント]買取依頼書.pdf"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // PDFを直接印刷（ページではなくPDF自体を印刷）
  const handlePrintPdf = () => {
    try {
      // 非表示iframeを作ってPDFを読み込み → 読み込み完了時に印刷
      const iframe = document.createElement("iframe")
      iframe.style.visibility = "hidden"
      iframe.style.position = "fixed"
      iframe.style.right = "0"
      iframe.style.bottom = "0"
      iframe.style.width = "0"
      iframe.style.height = "0"
      // キャッシュでonloadが走らない環境向けにクエリを足しておく
      iframe.src = `${pdfUrl}?t=${Date.now()}#view=FitH`

      const cleanup = () => {
        try {
          document.body.removeChild(iframe)
        } catch {}
      }

      let printed = false
      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
          printed = true
        } catch {
          // 失敗時はフォールバック
          window.open(pdfUrl, "_blank", "noopener,noreferrer")
        } finally {
          // 少し待ってから掃除
          setTimeout(cleanup, 1000)
        }
      }

      // onloadが来ない/ブロックされた場合のフォールバック（2秒）
      const timer = setTimeout(() => {
        if (!printed) {
          try {
            window.open(pdfUrl, "_blank", "noopener,noreferrer")
          } finally {
            cleanup()
          }
        }
        clearTimeout(timer)
      }, 2000)

      document.body.appendChild(iframe)
    } catch {
      window.open(pdfUrl, "_blank", "noopener,noreferrer")
    }
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
        {/* 左カラム */}
        <div className="md:col-span-2">
          {/* ダウンロード/印刷 */}
          <Card>
            <CardHeader>
              <CardTitle>買取依頼書のダウンロードと印刷</CardTitle>
              <CardDescription>
                買取依頼書（兼 同意書）をダウンロードし、必要事項を記入の上、商品と一緒に発送してください。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-3">
                <Button className="flex items-center" onClick={handleDownload}>
                  <FileDown className="mr-2 h-4 w-4" />
                  PDFをダウンロード
                </Button>
                <Button variant="outline" className="flex items-center" onClick={handlePrintPdf}>
                  <Printer className="mr-2 h-4 w-4" />
                  PDFを印刷
                </Button>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertDescription className="text-sm">
                  <span className="font-semibold">重要事項</span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>買取依頼書は必ず記入・署名の上、商品と一緒に発送してください。</li>
                    <li>記入漏れや署名がない場合、買取手続きが遅れる場合があります。</li>
                    <li>
                      <span className="font-medium">【提出対象の補足】</span>
                      必要書類②「住民票の写しまたは印鑑証明書」は、
                      <span className="underline">初回の方</span>
                      と
                      <span className="underline">前回提出から1年以上経過している方</span>
                      が提出対象です（いずれも発行から3ヶ月以内の原本）。
                    </li>
                    <li>18歳未満の方は、保護者同意書も必要です。</li>
                  </ul>
                </AlertDescription>
              </Alert>

              {/* 記入方法 */}
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
                    <p className="text-sm text-muted-foreground mt-1 pl-6">
                      署名欄に自筆で署名の上、捺印してください。
                    </p>
                  </li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右カラム */}
        <div>
          {/* 必要書類一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>必要書類一覧</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  { num: "1", title: "買取依頼書（必須）", desc: "記入・署名済みのもの" },
                  {
                    num: "2",
                    title: "住民票の写しまたは印鑑証明書",
                    desc: "発行から3ヶ月以内の原本（初回および前回提出から1年以上経過の方）",
                  },
                  {
                    num: "3",
                    title: "保護者同意書（18歳未満の方のみ）",
                    desc: "親権者の署名・捺印が必要",
                  },
                ].map((item) => (
                  <li key={item.num} className="flex items-start">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs mr-2 shrink-0">
                      {item.num}
                    </span>
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 発送先情報 */}
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
