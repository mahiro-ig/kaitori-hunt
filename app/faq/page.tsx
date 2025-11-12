// app/faq/page.tsx
"use client";

import { useState } from "react";
import { Mail, Phone, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


export default function FaqPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = [
    { id: "all", name: "すべて" },
    { id: "buyback", name: "買取について" },
    { id: "payment", name: "支払いについて" },
    { id: "shipping", name: "配送について" },
    { id: "cancel", name: "キャンセルについて" },
    { id: "account", name: "アカウントについて" },
  ];

  const faqs = [
    {
      category: "buyback",
      question: "買取の流れを教えてください",
      answer: "買取の流れは、メニューバーにある「郵送買取」または「店頭買取」ページをご確認ください。",
    },
    {
      category: "buyback",
      question: "郵送買取時に必要なものを教えてください",
      answer:
        "【本人確認書類(2点)】\n\n1. 身分証明書のコピー 1点\n   • 運転免許証\n   • マイナンバーカード\n   • 在留カード\n   • 特別永住者証明書\n   ※上記のいずれか1点のコピー\n\n2. 以下のいずれか 1点(原本)\n   • 住民票の写し ※発行より3ヶ月以内でマイナンバーの記載のないもの\n   • 印鑑証明書 ※発行より3ヶ月以内のもの\n   ※２については、初回の方、前回提出から1年以上経過している方のみ\n\n上記2点を商品と一緒に郵送してください。",
      important: true,
    },
    {
      category: "buyback",
      question: "店頭での買取は予約は必要ですか?",
      answer:
        "必ず予約が必要です。会員登録後、カート画面の買取方法選択欄で「店頭買取」を選択の上、買取申込を行ってください。\n\n予約なしでのご来店の場合、店内にて買取申込をしていただきます。",
      important: true,
    },
    {
      category: "buyback",
      question: "買取申請した価格はいつまで保証されますか?",
      answer:
        "【店頭買取】\n申請日当日(営業時間内)限りの価格保証です。申請日にご来店がない場合や休業日の申込はキャンセルされますので予めご了承ください。\n\n【郵送買取】\n申込承認当日に発送が完了した商品の価格を保証いたします。また、各配送業者の当日発送のご利用をお願いしております。コンビニからの発送や各営業所の受付時間によっては翌日発送扱いとなる場合がございます。当社への到着が遅れた場合、到着時点での買取価格を適用させていただく場合がございます。\n\n※原則、翌日必着です。(離島含む遠方は翌々日着)",
      important: true,
    },
    {
      category: "buyback",
      question: "未成年ですが買取は可能ですか?",
      answer:
        "可能です。18歳未満の方は、保護者の方に記入していただいた「保護者同意書」をご提出ください。\n\n保護者同意書のフォーマットについては、メールまたはお電話にてお問い合わせください。",
    },
    {
      category: "buyback",
      question: "本人確認書類なしでの買取は可能ですか?",
      answer:
        "いいえ、できません。古物営業法により買取・取引時に申込の方の身分確認の義務が法律で定められています。\n\n必ず本人確認書類をご提出いただく必要がございます。",
      important: true,
    },
    {
      category: "buyback",
      question: "法人買取は可能ですか?",
      answer:
        "可能です。下記書類のご提出をお願いします:\n\n• 登記事項証明書\n• ご担当者様の身分証明書\n• インボイス番号記載の請求書\n• ご担当者様の名刺\n\n法人買取に関する詳細は、メールまたはお電話にてお気軽にご相談ください。",
    },
    {
      category: "buyback",
      question: "査定にはどのくらい時間がかかりますか?",
      answer:
        "店頭買取の場合は、その場で査定が完了します。\n\n郵送買取の場合は、原則として商品到着日に査定と振込が完了いたします。ただし、混雑状況次第で査定・振込の所要時間が変動する場合がございますので、予めご了承ください。",
    },
    {
      category: "payment",
      question: "支払い方法は何がありますか?",
      answer:
        "店頭買取の場合は、現金または銀行振込でのお支払いとなります。\n\n郵送買取の場合は、銀行振込でのお支払いとなります。マイページの「振込先口座情報」から振込先口座を登録してください。",
    },
    {
      category: "payment",
      question: "自分以外の口座に振込をしてもらうことは可能ですか?",
      answer:
        "申込を行ったご本人様口座のみへの振込となり、お申込者・本人確認書類・お振込み口座の名義が一致している場合のみ買取可能です。\n\nまた住所も同じく申込書・身分証のご住所が一致しない場合は買取が行えませんのであらかじめご了承ください。\n\n※身分証の記載内容の変更を行った方は、変更後の情報が記載された面をご提示ください。",
      important: true,
    },
    {
      category: "payment",
      question: "振込手数料はかかりますか?",
      answer:
        "買取金額が3万円未満の場合、振込手数料として100円を頂戴いたします。買取金額が3万円以上の場合は、振込手数料は当社が負担いたします。",
    },
    {
      category: "payment",
      question: "買取金額はいつ振り込まれますか?",
      answer:
        "郵送買取の場合、商品到着後、原則として当日中に査定と振込が完了いたします。ただし、混雑状況や金融機関の営業時間・休業日によって振込タイミングが前後する場合がございます。\n\n店頭買取で銀行振込を選択された場合は、査定完了後、最短で当日中にお振込みいたします。",
    },
    {
      category: "shipping",
      question: "商品の発送方法を教えてください",
      answer:
        "買取申し込み完了後、商品を梱包して配送業者にお渡しください。配送業者は、ヤマト運輸、佐川急便、日本郵便など、追跡番号のある配送方法をご利用ください。",
    },
    {
      category: "shipping",
      question: "送料は誰が負担しますか?",
      answer:
        "商品の発送にかかる送料は、お客様のご負担となります。ただし、買取金額が一定額以上の場合、送料を当社が負担するキャンペーンを実施している場合がございます。詳しくは各商品ページをご確認ください。",
    },
    {
      category: "shipping",
      question: "梱包材は自分で用意する必要がありますか?",
      answer:
        "はい、梱包材はお客様にてご用意ください。商品が破損しないよう、十分な緩衝材を使用して梱包してください。特に精密機器は衝撃に弱いため、厳重な梱包をお願いいたします。",
    },
    {
      category: "cancel",
      question: "買取申込をキャンセルできますか?",
      answer:
        "商品発送前であれば、キャンセルが可能です。下記の電話番号までご連絡いただくか、メールにてお問い合わせください。\n\n商品発送後のキャンセルについては、着払いにてご返送を承っております。また、お客様のキャンセル状況によっては当サービスのアカウント停止及び今後のご利用をご遠慮いただく場合もありますので予めご了承ください。",
    },
    {
      category: "cancel",
      question: "査定金額に納得できない場合はどうすればよいですか?",
      answer:
        "査定金額にご納得いただけない場合は、買取をキャンセルして商品を返送することが可能です。ただし、返送料はお客様のご負担となります。査定結果をご確認の上、3営業日以内にご連絡ください。",
    },
    {
      category: "cancel",
      question: "返送料はかかりますか?",
      answer:
        "査定金額にご納得いただけず、商品の返送を希望される場合、返送料はお客様のご負担となります。商品の大きさや重量によって返送料が異なりますので、事前にお問い合わせください。",
    },
    {
      category: "account",
      question: "アカウント登録は必須ですか?",
      answer:
        "はい、買取サービスをご利用いただくには、アカウント登録が必須となります。法令に基づく本人確認のため、お名前、メールアドレス、電話番号、住所などの情報が必要です。",
    },
    {
      category: "account",
      question: "登録情報を変更したいです",
      answer:
        "マイページの「プロフィール編集」から、登録情報の変更が可能です。\n\nメールアドレスの変更をご希望の場合はメールにてその旨をご連絡ください。",
    },
    {
      category: "account",
      question: "パスワードを忘れてしまいました",
      answer:
        "ログインページの「パスワードをお忘れの方」リンクから、パスワードリセットの手続きができます。登録されているメールアドレスを入力すると、パスワード再設定用のリンクが記載されたメールが送信されます。",
    },
    {
      category: "account",
      question: "アカウントを削除したいです",
      answer:
        "アカウントの削除をご希望の場合は、メールまたはお電話にてご連絡ください。進行中の取引がある場合は、取引完了後にアカウント削除の手続きを行います。削除後は、登録情報や取引履歴の復元はできませんのでご注意ください。",
    },
  ];

  const filteredFaqs = selectedCategory === "all" ? faqs : faqs.filter((faq) => faq.category === selectedCategory);

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">よくある質問</h1>
        <p className="text-lg text-muted-foreground">
          お探しの情報が見つからない場合は、お気軽にお問い合わせください。
        </p>
      </div>

      <Alert className="mb-8 border-amber-500 bg-amber-50">
        <AlertCircle className="h-5 w-5" />
        <AlertTitle className="font-bold text-lg">【重要】郵送買取時に必要なもの</AlertTitle>
        <AlertDescription className="mt-2">
          <p className="font-semibold mb-3">本人確認書類(2点)</p>
          <div className="space-y-3 ml-2">
            <div>
              <p className="font-semibold mb-1">1. 身分証明書のコピー 1点</p>
              <ul className="list-disc list-inside ml-2 text-sm">
                <li>運転免許証</li>
                <li>マイナンバーカード</li>
                <li>在留カード</li>
                <li>特別永住者証明書</li>
              </ul>
              <p className="text-sm mt-1">※上記のいずれか1点のコピー</p>
            </div>
            <div>
              <p className="font-semibold mb-1">2. 以下のいずれか 1点(原本)</p>
              <ul className="list-disc list-inside ml-2 text-sm">
                <li>住民票の写し ※発行より3ヶ月以内でマイナンバーの記載のないもの</li>
                <li>印鑑証明書 ※発行より3ヶ月以内のもの</li>
              </ul>
              <p className="text-sm mt-1 font-semibold">※２については、初回の方、前回提出から1年以上経過している方のみ</p>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-2 mb-8 justify-center">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? "default" : "outline"}
            onClick={() => setSelectedCategory(category.id)}
            className="transition-all"
          >
            {category.name}
          </Button>
        ))}
      </div>

      <Card className="mb-8">
        <CardContent className="p-6">
          <Accordion type="single" collapsible className="w-full">
            {filteredFaqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left hover:no-underline">
                  <div className="flex items-start gap-3">
                    <span className="text-primary font-semibold">Q.</span>
                    <span className="font-medium">
                      {faq.question}
                      {faq.important && <span className="ml-2 text-amber-600">⚠️</span>}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="flex items-start gap-3 pl-0">
                    <span className="text-muted-foreground font-semibold">A.</span>
                    <div>
                      <p className="text-muted-foreground whitespace-pre-line">{faq.answer}</p>
                      {faq.important && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                          <p className="text-sm text-amber-900 font-semibold">⚠️ 重要な情報です。必ずご確認ください。</p>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Separator className="my-12" />

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              <CardTitle>お電話でのお問い合わせ</CardTitle>
            </div>
            <CardDescription>営業時間内にお気軽にお電話ください</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              営業時間:平日 10:00〜18:00 / 土曜日 10:00〜17:00(日祝休み)
              <br />
              <span className="text-xs">※営業時間外はメールでのお問い合わせをご利用ください。</span>
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Phone className="h-4 w-4" />
              <a href="tel:0253338655" className="text-primary hover:underline text-lg font-semibold">
                025-333-8655
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              ※お電話が混み合っている場合がございます。時間をおいておかけ直しください。
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <CardTitle>メールでのお問い合わせ</CardTitle>
            </div>
            <CardDescription>24時間受付しております</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              下記のメールアドレス宛にお問い合わせください。担当者が順次返信いたします。
            </p>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="h-4 w-4" />
              <a href="mailto:support@kaitori-hunt.com" className="text-primary hover:underline">
                support@kaitori-hunt.com
              </a>
            </div>
            <p className="text-xs text-muted-foreground">※営業時間外のお問い合わせは翌営業日以降の対応となります。</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
