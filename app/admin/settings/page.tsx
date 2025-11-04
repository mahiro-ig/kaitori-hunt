// /app/admin/settings/page.tsx
"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Plus, Trash, Edit, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import {
  useLanguage,
  supportedLanguages,
  type LanguageCode,
} from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductVariant = Database["public"]["Tables"]["product_variants"]["Row"];

// --- helpers ---
function formatYen(n?: number | null) {
  if (n == null) return "-";
  try {
    return n.toLocaleString("ja-JP");
  } catch {
    return String(n);
  }
}
function clamp01(x: number) {
  if (Number.isNaN(x)) return 0;
  return Math.max(0, Math.min(1, x));
}
function progressInfo(v: ProductVariant) {
  const target = Number(v.target_quantity ?? 0);
  const current = Number(v.current_quantity ?? 0);
  if (!target || target <= 0) {
    return {
      ratio: 0,
      percentText: "—",
      status: "未設定",
      infinite: true,
    };
  }
  const ratio = clamp01(current / target);
  const percentText = `${Math.floor(ratio * 100)}%`;
  const status = current >= target ? "達成" : "進行中";
  return { ratio, percentText, status, infinite: false };
}

function ProgressBar({ ratio, label }: { ratio: number; label?: string }) {
  const widthPct = `${Math.floor(clamp01(ratio) * 100)}%`;
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: widthPct }}
          aria-valuenow={Math.floor(clamp01(ratio) * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
      {label ? (
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const supabase = createClientComponentClient<Database>();
  const { language, t } = useLanguage();

  // --- 一般設定 ---
  const [generalSettings, setGeneralSettings] = useState({
    siteName: "買取ハント",
    siteDescription: "iPhone、カメラ、ゲーム機の専門買取サービス",
    contactEmail: "info@kaitori-hunt.com",
    contactPhone: "025-333-8655",
    address: "〒950-0922 新潟県新潟市中央区東大通1-2-30 第3マルカビル 10F",
  });

  // --- 通知設定 ---
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    adminEmailNotifications: true,
    userRegistrationNotifications: true,
    purchaseNotifications: true,
    verificationNotifications: true,
  });

  // --- 外部連携 ---
  const [integrationSettings, setIntegrationSettings] = useState({
    inventorySystem: "none",
    shippingService: "yamato",
    crmSystem: "salesforce",
    chatService: "line",
    analyticsService: "google",
    yamatoApiKey: "",
    salesforceApiKey: "",
    lineApiKey: "",
    googleAnalyticsId: "",
  });

  // --- 言語設定 ---
  const [languageSettings, setLanguageSettings] = useState({
    defaultLanguage: language as LanguageCode,
    autoDetect: true,
    showLanguageSwitcher: true,
  });

  // --- 商品＆バリアント管理 ---
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);

  // 新規商品
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const [newProductCategory, setNewProductCategory] = useState<"iphone" | "camera" | "game">("iphone");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newMaxBuybackPrice, setNewMaxBuybackPrice] = useState<number | null>(null);
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null);
  const [newProductCautionText, setNewProductCautionText] = useState("");

  // 新規バリアント
  const [isAddVariantDialogOpen, setIsAddVariantDialogOpen] = useState(false);
  const [newVariantData, setNewVariantData] = useState<Partial<ProductVariant>>({
    product_id: "",
    jan_code: "",
    color: "",
    capacity: "",
    buyback_price: 0,
    target_quantity: 0,
    current_quantity: 0,
    next_price: null,
    next_price_quantity: null,
  });

  // 編集バリアント
  const [isEditVariantDialogOpen, setIsEditVariantDialogOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [editingVariantData, setEditingVariantData] = useState<Partial<ProductVariant>>({});

  // 表示/非表示トグル用
  const [busyVariantId, setBusyVariantId] = useState<string | null>(null);

  // 初期ロード
  useEffect(() => {
    refreshLists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshLists() {
    setIsLoadingList(true);
    await Promise.all([fetchProducts(), fetchVariants()]);
    setIsLoadingList(false);
  }

  // 一覧取得（読み取りはRLS public許可の想定）
  async function fetchProducts() {
    const { data, error } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("fetchProducts error", error);
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      return;
    }
    setProducts(data ?? []);
  }

  async function fetchVariants() {
    const { data, error } = await supabase.from("product_variants").select("*").order("updated_at", { ascending: false });
    if (error) {
      console.error("fetchVariants error", error);
      toast({ title: "エラー", description: error.message, variant: "destructive" });
      return;
    }
    setVariants(data ?? []);
  }

  const handleSaveSettings = () => {
    toast({ title: "設定を保存しました" });
  };

  // --- サーバー経由：画像アップロード ---
  async function uploadProductImageViaApi(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("filename", file.name);

    const res = await fetch("/api/admin/product-images", {
      method: "POST",
      body: fd,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "画像アップロードに失敗しました");
    return json.publicUrl as string;
  }

  // --- 新規商品（API経由） ---
  const handleAddProduct = async () => {
    if (!newProductName) {
      toast({ title: "エラー", description: "商品名を入力してください", variant: "destructive" });
      return;
    }
    if (!newProductImageFile) {
      toast({ title: "エラー", description: "商品写真を選択してください", variant: "destructive" });
      return;
    }

    try {
      // 1) 画像をAPI経由でアップロード
      const imageUrl = await uploadProductImageViaApi(newProductImageFile);

      // 2) products 追加
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductName,
          category: newProductCategory,
          description: newProductDescription,
          max_buyback_price: newMaxBuybackPrice,
          image_url: imageUrl,
          caution_text: newProductCautionText,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "追加に失敗しました");

      const created = json.data as Product;

      // 初期化
      await fetchProducts();
      setNewProductName("");
      setNewProductCategory("iphone");
      setNewProductDescription("");
      setNewMaxBuybackPrice(null);
      setNewProductImageFile(null);
      setNewProductCautionText("");

      // 直後にバリアント追加ダイアログへ
      setNewVariantData((prev) => ({ ...prev, product_id: created.id }));
      setIsAddProductDialogOpen(false);
      setIsAddVariantDialogOpen(true);
      toast({ title: "商品を追加しました" });
    } catch (e: any) {
      console.error("handleAddProduct error", e);
      toast({ title: "エラー", description: e?.message ?? "追加に失敗しました", variant: "destructive" });
    }
  };

  // --- 新規バリアント（API経由） ---
  const handleAddVariant = async () => {
    const {
      product_id,
      jan_code,
      color,
      capacity,
      buyback_price,
      target_quantity,
      current_quantity,
      next_price,
      next_price_quantity,
    } = newVariantData;

    if (!product_id || !jan_code || !color || capacity == null) {
      toast({ title: "エラー", description: "必須項目を入力してください", variant: "destructive" });
      return;
    }

    try {
      const res = await fetch("/api/admin/product-variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_id,
          jan_code,
          color,
          capacity,
          buyback_price,
          target_quantity,
          current_quantity,
          next_price,
          next_price_quantity,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "追加に失敗しました");

      await fetchVariants();
      setNewVariantData({
        product_id: "",
        jan_code: "",
        color: "",
        capacity: "",
        buyback_price: 0,
        target_quantity: 0,
        current_quantity: 0,
        next_price: null,
        next_price_quantity: null,
      });
      setIsAddVariantDialogOpen(false);
      toast({ title: "バリアントを追加しました" });
    } catch (e: any) {
      console.error("handleAddVariant error", e);
      toast({ title: "エラー", description: e?.message ?? "追加に失敗しました", variant: "destructive" });
    }
  };

  // --- 商品削除（API経由） ---
  const handleDeleteProduct = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "削除に失敗しました");

      await fetchProducts();
      toast({ title: "商品を削除しました" });
    } catch (e: any) {
      console.error("deleteProduct error", e);
      toast({ title: "エラー", description: e?.message ?? "削除に失敗しました", variant: "destructive" });
    }
  };

  // --- バリアント削除（API経由） ---
  const handleDeleteVariant = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/product-variants/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "削除に失敗しました");

      await fetchVariants();
      toast({ title: "バリアントを削除しました" });
    } catch (e: any) {
      console.error("deleteVariant error", e);
      toast({ title: "エラー", description: e?.message ?? "削除に失敗しました", variant: "destructive" });
    }
  };

  // --- 可視切替（API経由） ---
  const toggleVariantVisibility = async (id: string, currentHidden: boolean | null | undefined) => {
    try {
      setBusyVariantId(id);
      const nextHidden = !Boolean(currentHidden);

      const res = await fetch(`/api/admin/product-variants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_hidden: nextHidden }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "更新に失敗しました");

      await fetchVariants();
      toast({ title: nextHidden ? "非表示にしました" : "表示にしました" });
    } catch (e: any) {
      console.error("toggleVariantVisibility error", e);
      toast({ title: "エラー", description: e?.message ?? "更新に失敗しました", variant: "destructive" });
    } finally {
      setBusyVariantId(null);
    }
  };

  // --- 編集更新（API経由） ---
  const openEditVariantDialog = (variant: ProductVariant) => {
    setEditingVariant(variant);
    setEditingVariantData({ ...variant });
    setIsEditVariantDialogOpen(true);
  };

  const handleEditVariant = async () => {
    if (!editingVariant) return;

    const {
      jan_code,
      color,
      capacity,
      buyback_price,
      target_quantity,
      current_quantity,
      next_price,
      next_price_quantity,
    } = editingVariantData;

    const updatePayload: Record<string, any> = {
      jan_code,
      color,
      capacity,
      buyback_price,
      target_quantity,
      current_quantity,
      next_price:
        typeof next_price === "number" ? next_price : next_price ? Number(next_price) : null,
      next_price_quantity:
        typeof next_price_quantity === "number"
          ? next_price_quantity
          : next_price_quantity
          ? Number(next_price_quantity)
          : null,
    };

    try {
      const res = await fetch(`/api/admin/product-variants/${editingVariant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "更新に失敗しました");

      await fetchVariants();
      setIsEditVariantDialogOpen(false);
      toast({ title: "バリアントを更新しました" });
    } catch (e: any) {
      console.error("editVariant error", e);
      toast({ title: "エラー", description: e?.message ?? "更新に失敗しました", variant: "destructive" });
    }
  };

  // product_id -> variants map
  const byProductId = useMemo(() => {
    const map = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      const pid = String(v.product_id);
      if (!map.has(pid)) map.set(pid, []);
      map.get(pid)!.push(v);
    }
    return map;
  }, [variants]);

  // ---------- UI ----------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">{t("settings.title", "管理者設定")}</h1>
        <Button variant="outline" onClick={refreshLists} disabled={isLoadingList} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isLoadingList ? "animate-spin" : ""}`} />
          再読込
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">{t("settings.general", "一般設定")}</TabsTrigger>
          <TabsTrigger value="notifications">{t("settings.notifications", "通知設定")}</TabsTrigger>
          <TabsTrigger value="integrations">{t("settings.integrations", "外部連携")}</TabsTrigger>
          <TabsTrigger value="language">{t("settings.language", "言語設定")}</TabsTrigger>
          <TabsTrigger value="products">{t("settings.products", "商品管理")}</TabsTrigger>
        </TabsList>

        {/* 一般設定 */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>サイト情報</CardTitle>
              <CardDescription>サイト名や連絡先を設定します</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="siteName">サイト名</Label>
                <Input
                  id="siteName"
                  value={generalSettings.siteName}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteName: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="siteDescription">サイト説明</Label>
                <Textarea
                  id="siteDescription"
                  value={generalSettings.siteDescription}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, siteDescription: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">お問い合わせメール</Label>
                <Input
                  id="contactEmail"
                  value={generalSettings.contactEmail}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactEmail: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">お問い合わせ電話</Label>
                <Input
                  id="contactPhone"
                  value={generalSettings.contactPhone}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contactPhone: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="address">住所</Label>
                <Textarea
                  id="address"
                  value={generalSettings.address}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, address: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>保存</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 通知設定 */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>通知設定</CardTitle>
              <CardDescription>各種通知の有効/無効を切り替えます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                ["メール通知を有効にする", "emailNotifications"],
                ["管理者通知を有効にする", "adminEmailNotifications"],
                ["ユーザー登録通知を有効にする", "userRegistrationNotifications"],
                ["購入通知を有効にする", "purchaseNotifications"],
                ["本人確認通知を有効にする", "verificationNotifications"],
              ].map(([label, key]) => (
                <div key={key} className="flex items-center space-x-2">
                  <Switch
                    checked={(notificationSettings as any)[key]}
                    onCheckedChange={(v) => setNotificationSettings({ ...notificationSettings, [key]: v } as any)}
                  />
                  <Label>{label}</Label>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 外部連携 */}
        <TabsContent value="integrations">
          <Card>
            <CardHeader>
              <CardTitle>外部連携設定</CardTitle>
              <CardDescription>在庫/配送など外部サービスとの連携設定</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label>在庫管理システム</Label>
                <Select
                  value={integrationSettings.inventorySystem}
                  onValueChange={(v) => setIntegrationSettings({ ...integrationSettings, inventorySystem: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">なし</SelectItem>
                    <SelectItem value="systemA">System A</SelectItem>
                    <SelectItem value="systemB">System B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>配送サービス</Label>
                <Select
                  value={integrationSettings.shippingService}
                  onValueChange={(v) => setIntegrationSettings({ ...integrationSettings, shippingService: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yamato">ヤマト</SelectItem>
                    <SelectItem value="sagawa">佐川</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Yamato API キー</Label>
                <Input
                  value={integrationSettings.yamatoApiKey}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, yamatoApiKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Salesforce API キー</Label>
                <Input
                  value={integrationSettings.salesforceApiKey}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, salesforceApiKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Line API キー</Label>
                <Input
                  value={integrationSettings.lineApiKey}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, lineApiKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Google Analytics ID</Label>
                <Input
                  value={integrationSettings.googleAnalyticsId}
                  onChange={(e) => setIntegrationSettings({ ...integrationSettings, googleAnalyticsId: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveSettings}>保存</Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 言語設定 */}
        <TabsContent value="language">
          <Card>
            <CardHeader>
              <CardTitle>言語設定</CardTitle>
              <CardDescription>多言語対応の設定</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={languageSettings.autoDetect}
                  onCheckedChange={(v) => setLanguageSettings({ ...languageSettings, autoDetect: v })}
                />
                <Label>ブラウザ言語自動検出</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={languageSettings.showLanguageSwitcher}
                  onCheckedChange={(v) => setLanguageSettings({ ...languageSettings, showLanguageSwitcher: v })}
                />
                <Label>言語切替ボタン表示</Label>
              </div>
              {languageSettings.showLanguageSwitcher && (
                <LanguageSwitcher
                  supportedLanguages={supportedLanguages}
                  defaultLanguage={languageSettings.defaultLanguage}
                  onLanguageChange={(v) => setLanguageSettings({ ...languageSettings, defaultLanguage: v })}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 商品管理 */}
        <TabsContent value="products">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle>商品管理</CardTitle>
                  <CardDescription>登録済みの商品とバリアントを管理します</CardDescription>
                </div>
                <Button onClick={() => setIsAddProductDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  新規商品追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>商品名</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>上限価格</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>{p.category}</TableCell>
                      <TableCell>{p.description}</TableCell>
                      <TableCell>¥{formatYen(p.max_buyback_price as any)}</TableCell>
                      <TableCell className="space-x-2">
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDeleteProduct(p.id)}
                          aria-label="商品削除"
                        >
                          <Trash size={16} />
                        </Button>
                        <Button
                          size="icon"
                          onClick={() => {
                            setNewVariantData({
                              ...newVariantData,
                              product_id: p.id,
                            });
                            setIsAddVariantDialogOpen(true);
                          }}
                          aria-label="バリアント追加"
                        >
                          <Plus size={16} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* variants */}
              {products.map((p) => {
                const list = byProductId.get(String(p.id)) ?? [];
                return (
                  <div key={p.id} className="mt-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{p.name} のバリアント</h3>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={refreshLists}
                        disabled={isLoadingList}
                        className="gap-2"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isLoadingList ? "animate-spin" : ""}`} />
                        再読込
                      </Button>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>JANコード</TableHead>
                          <TableHead>カラー</TableHead>
                          <TableHead>容量</TableHead>
                          <TableHead>買取価格</TableHead>
                          <TableHead>目標買取数量</TableHead>
                          <TableHead>現在の買取数量</TableHead>
                          <TableHead>進捗</TableHead>
                          <TableHead>達成状況</TableHead>
                          <TableHead>次の買取価格</TableHead>
                          <TableHead>次の価格適用数量</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {list.map((v) => {
                          const info = progressInfo(v);
                          return (
                            <TableRow key={v.id}>
                              <TableCell>{v.jan_code}</TableCell>
                              <TableCell>{v.color}</TableCell>
                              <TableCell>{v.capacity}</TableCell>
                              <TableCell>¥{formatYen(v.buyback_price as any)}</TableCell>
                              <TableCell>
                                {v.target_quantity ?? 0}
                                {info.infinite ? (
                                  <span className="ml-1 text-xs text-muted-foreground">（自動切替なし）</span>
                                ) : null}
                              </TableCell>
                              <TableCell>{v.current_quantity ?? 0}</TableCell>
                              <TableCell className="min-w-[180px]">
                                {info.infinite ? (
                                  <span className="text-sm text-muted-foreground">—</span>
                                ) : (
                                  <ProgressBar
                                    ratio={info.ratio}
                                    label={`${v.current_quantity ?? 0} / ${v.target_quantity ?? 0}（${info.percentText}）`}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    info.status === "達成"
                                      ? "text-green-600 font-medium"
                                      : info.status === "進行中"
                                      ? "text-blue-600 font-medium"
                                      : "text-muted-foreground"
                                  }
                                >
                                  {info.status}
                                </span>
                              </TableCell>
                              <TableCell>{v.next_price == null ? "—" : `¥${formatYen(v.next_price as any)}`}</TableCell>
                              <TableCell>{v.next_price_quantity == null ? "—" : v.next_price_quantity}</TableCell>
                              <TableCell className="space-x-2">
                                <Button
                                  size="icon"
                                  variant={(v as any).is_hidden ? "default" : "secondary"}
                                  onClick={() => toggleVariantVisibility(v.id, (v as any).is_hidden)}
                                  disabled={busyVariantId === v.id}
                                  aria-label={(v as any).is_hidden ? "表示にする" : "非表示にする"}
                                  title={(v as any).is_hidden ? "表示にする" : "非表示にする"}
                                >
                                  {(v as any).is_hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                                </Button>
                                <Button size="icon" onClick={() => openEditVariantDialog(v)} aria-label="バリアント編集">
                                  <Edit size={16} />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => handleDeleteVariant(v.id)}
                                  aria-label="バリアント削除"
                                >
                                  <Trash size={16} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                );
              })}

              {/* 新規商品追加ダイアログ */}
              <Dialog open={isAddProductDialogOpen} onOpenChange={setIsAddProductDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新規商品追加</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>商品名</Label>
                      <Input value={newProductName} onChange={(e) => setNewProductName(e.target.value)} />
                    </div>
                    <div>
                      <Label>カテゴリ</Label>
                      <Select value={newProductCategory} onValueChange={(v) => setNewProductCategory(v as any)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="iphone">iPhone</SelectItem>
                          <SelectItem value="camera">Camera</SelectItem>
                          <SelectItem value="game">Game</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>説明</Label>
                      <Textarea value={newProductDescription} onChange={(e) => setNewProductDescription(e.target.value)} />
                    </div>
                    <div>
                      <Label>買取上限価格</Label>
                      <Input
                        type="number"
                        value={newMaxBuybackPrice ?? ""}
                        onChange={(e) => setNewMaxBuybackPrice(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </div>
                    <div>
                      <Label>商品写真</Label>
                      <Input type="file" accept="image/*" onChange={(e) => setNewProductImageFile(e.target.files?.[0] ?? null)} />
                    </div>
                    <div>
                      <Label>注意事項</Label>
                      <Textarea value={newProductCautionText} onChange={(e) => setNewProductCautionText(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddProductDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleAddProduct}>追加</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* 新規バリアント追加ダイアログ */}
              <Dialog open={isAddVariantDialogOpen} onOpenChange={setIsAddVariantDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>新規バリアント追加</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>JANコード</Label>
                      <Input
                        value={newVariantData.jan_code ?? ""}
                        onChange={(e) => setNewVariantData({ ...newVariantData, jan_code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>カラー</Label>
                      <Input
                        value={newVariantData.color ?? ""}
                        onChange={(e) => setNewVariantData({ ...newVariantData, color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>容量</Label>
                      <Input
                        value={newVariantData.capacity ?? ""}
                        onChange={(e) => setNewVariantData({ ...newVariantData, capacity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>買取価格</Label>
                      <Input
                        type="number"
                        value={newVariantData.buyback_price ?? ""}
                        onChange={(e) =>
                          setNewVariantData({
                            ...newVariantData,
                            buyback_price: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>目標買取数量</Label>
                      <Input
                        type="number"
                        value={newVariantData.target_quantity ?? ""}
                        onChange={(e) =>
                          setNewVariantData({
                            ...newVariantData,
                            target_quantity: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>現在の買取数量</Label>
                      <Input
                        type="number"
                        value={newVariantData.current_quantity ?? ""}
                        onChange={(e) =>
                          setNewVariantData({
                            ...newVariantData,
                            current_quantity: e.target.value === "" ? 0 : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>次の買取価格</Label>
                      <Input
                        type="number"
                        value={newVariantData.next_price === null ? "" : newVariantData.next_price ?? ""}
                        onChange={(e) =>
                          setNewVariantData({
                            ...newVariantData,
                            next_price: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>次の価格適用数量</Label>
                      <Input
                        type="number"
                        value={newVariantData.next_price_quantity === null ? "" : newVariantData.next_price_quantity ?? ""}
                        onChange={(e) =>
                          setNewVariantData({
                            ...newVariantData,
                            next_price_quantity: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddVariantDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleAddVariant}>追加</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* バリアント編集ダイアログ */}
              <Dialog open={isEditVariantDialogOpen} onOpenChange={setIsEditVariantDialogOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>バリアント編集</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div>
                      <Label>JANコード</Label>
                      <Input
                        value={editingVariantData.jan_code ?? ""}
                        onChange={(e) => setEditingVariantData({ ...editingVariantData, jan_code: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>カラー</Label>
                      <Input
                        value={editingVariantData.color ?? ""}
                        onChange={(e) => setEditingVariantData({ ...editingVariantData, color: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>容量</Label>
                      <Input
                        value={editingVariantData.capacity ?? ""}
                        onChange={(e) => setEditingVariantData({ ...editingVariantData, capacity: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>買取価格</Label>
                      <Input
                        type="number"
                        value={editingVariantData.buyback_price ?? ""}
                        onChange={(e) =>
                          setEditingVariantData({
                            ...editingVariantData,
                            buyback_price: e.target.value === "" ? (undefined as any) : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>目標買取数量</Label>
                      <Input
                        type="number"
                        value={editingVariantData.target_quantity ?? ""}
                        onChange={(e) =>
                          setEditingVariantData({
                            ...editingVariantData,
                            target_quantity: e.target.value === "" ? (undefined as any) : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>現在の買取数量</Label>
                      <Input
                        type="number"
                        value={editingVariantData.current_quantity ?? ""}
                        onChange={(e) =>
                          setEditingVariantData({
                            ...editingVariantData,
                            current_quantity: e.target.value === "" ? (undefined as any) : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>次の買取価格</Label>
                      <Input
                        type="number"
                        value={editingVariantData.next_price === null ? "" : editingVariantData.next_price ?? ""}
                        onChange={(e) =>
                          setEditingVariantData({
                            ...editingVariantData,
                            next_price: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label>次の価格適用数量</Label>
                      <Input
                        type="number"
                        value={editingVariantData.next_price_quantity === null ? "" : editingVariantData.next_price_quantity ?? ""}
                        onChange={(e) =>
                          setEditingVariantData({
                            ...editingVariantData,
                            next_price_quantity: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditVariantDialogOpen(false)}>
                      キャンセル
                    </Button>
                    <Button onClick={handleEditVariant}>更新</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
