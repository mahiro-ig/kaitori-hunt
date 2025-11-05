"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* =========================
   言語・辞書（クライアント用）
   ========================= */
export const supportedLanguages = [
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "zh", name: "中文", flag: "🇨🇳" },
  { code: "vi", name: "Tiếng Việt", flag: "🇻🇳" },
  { code: "th", name: "ไทย", flag: "🇹🇭" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
] as const;

export type LanguageCode = "ja" | "en" | "zh" | "vi" | "th" | "ko";

export type TranslationResource = Record<string, string>;

export const translations: Record<LanguageCode, TranslationResource> = {
  ja: {
    // ナビゲーション
    "nav.home": "ホーム",
    "nav.iphone": "iPhone",
    "nav.camera": "カメラ",
    "nav.game": "ゲーム",
    "nav.about": "会社概要",
    "nav.how_it_works": "ご利用方法",
    "nav.login": "ログイン",
    "nav.register": "新規登録",
    "nav.dashboard": "マイページ",
    "nav.admin": "管理画面",
    "nav.cart": "カート",
    // ホーム
    "home.hero.title": "iPhone・カメラ・ゲーム機の買取なら",
    "home.hero.subtitle": "高価買取、スピード対応、安心の本人確認システム",
    "home.hero.cta": "今すぐ査定",
    "home.features.title": "買取ハントの特徴",
    "home.features.high_price": "高価買取",
    "home.features.high_price_desc": "市場価格を常に分析し、適正価格で買取いたします。",
    "home.features.fast": "スピード対応",
    "home.features.fast_desc": "申し込みから入金まで最短2日で完了します。",
    "home.features.secure": "安心の本人確認",
    "home.features.secure_desc": "オンラインで完結する本人確認システムで安全に取引できます。",
    // 設定
    "settings.general": "一般設定",
    "settings.notifications": "通知設定",
    "settings.prices": "買取価格設定",
    "settings.integrations": "外部連携",
    "settings.language": "言語設定",
    "settings.save": "設定を保存",
    "settings.language.title": "言語設定",
    "settings.language.description": "サイト全体の表示言語を設定します",
    "settings.language.select": "言語を選択",
    "settings.language.auto": "ブラウザの言語を使用",
    // 共通
    "common.save": "保存",
    "common.cancel": "キャンセル",
    "common.edit": "編集",
    "common.delete": "削除",
    "common.add": "追加",
    "common.search": "検索",
    "common.loading": "読み込み中...",
    "common.error": "エラーが発生しました",
    "common.success": "成功しました",
  },
  en: {
    "nav.home": "Home",
    "nav.iphone": "iPhone",
    "nav.camera": "Camera",
    "nav.game": "Game",
    "nav.about": "About",
    "nav.how_it_works": "How It Works",
    "nav.login": "Login",
    "nav.register": "Register",
    "nav.dashboard": "Dashboard",
    "nav.admin": "Admin",
    "nav.cart": "Cart",
    "home.hero.title": "Best Buyback for iPhone, Camera, and Game Consoles",
    "home.hero.subtitle": "High price, Fast process, Secure verification system",
    "home.hero.cta": "Get Quote Now",
    "home.features.title": "Our Features",
    "home.features.high_price": "Best Price",
    "home.features.high_price_desc": "We constantly analyze market prices to offer the best value.",
    "home.features.fast": "Fast Process",
    "home.features.fast_desc": "Complete the entire process in as little as 2 days.",
    "home.features.secure": "Secure Verification",
    "home.features.secure_desc": "Our online verification system ensures safe transactions.",
    "settings.general": "General Settings",
    "settings.notifications": "Notification Settings",
    "settings.prices": "Price Settings",
    "settings.integrations": "Integrations",
    "settings.language": "Language Settings",
    "settings.save": "Save Settings",
    "settings.language.title": "Language Settings",
    "settings.language.description": "Set the display language for the entire site",
    "settings.language.select": "Select Language",
    "settings.language.auto": "Use Browser Language",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.edit": "Edit",
    "common.delete": "Delete",
    "common.add": "Add",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.error": "An error occurred",
    "common.success": "Success",
  },
  zh: {
    "nav.home": "首页",
    "nav.iphone": "iPhone",
    "nav.camera": "相机",
    "nav.game": "游戏机",
    "nav.about": "关于我们",
    "nav.how_it_works": "使用方法",
    "nav.login": "登录",
    "nav.register": "注册",
    "nav.dashboard": "我的账户",
    "nav.admin": "管理页面",
    "nav.cart": "购物车",
    "home.hero.title": "iPhone、相机、游戏机的回收服务",
    "home.hero.subtitle": "高价回收、快速处理、安全的身份验证系统",
    "home.hero.cta": "立即评估",
    "home.features.title": "我们的特点",
    "home.features.high_price": "高价回收",
    "home.features.high_price_desc": "我们持续分析市场价格，提供最佳价值。",
    "home.features.fast": "快速处理",
    "home.features.fast_desc": "从申请到付款，最快2天内完成。",
    "home.features.secure": "安全验证",
    "home.features.secure_desc": "我们的在线身份验证系统确保交易安全。",
    "settings.general": "一般设置",
    "settings.notifications": "通知设置",
    "settings.prices": "价格设置",
    "settings.integrations": "外部集成",
    "settings.language": "语言设置",
    "settings.save": "保存设置",
    "settings.language.title": "语言设置",
    "settings.language.description": "设置整个网站的显示语言",
    "settings.language.select": "选择语言",
    "settings.language.auto": "使用浏览器语言",
    "common.save": "保存",
    "common.cancel": "取消",
    "common.edit": "编辑",
    "common.delete": "删除",
    "common.add": "添加",
    "common.search": "搜索",
    "common.loading": "加载中...",
    "common.error": "发生错误",
    "common.success": "成功",
  },
  vi: {
    "nav.home": "Trang chủ",
    "nav.iphone": "iPhone",
    "nav.camera": "Máy ảnh",
    "nav.game": "Máy chơi game",
    "nav.about": "Giới thiệu",
    "nav.how_it_works": "Cách thức hoạt động",
    "nav.login": "Đăng nhập",
    "nav.register": "Đăng ký",
    "nav.dashboard": "Trang cá nhân",
    "nav.admin": "Quản trị",
    "nav.cart": "Giỏ hàng",
    "home.hero.title": "Thu mua iPhone, Máy ảnh và Máy chơi game",
    "home.hero.subtitle": "Giá cao, Xử lý nhanh, Hệ thống xác minh an toàn",
    "home.hero.cta": "Báo giá ngay",
    "home.features.title": "Tính năng của chúng tôi",
    "home.features.high_price": "Giá tốt nhất",
    "home.features.high_price_desc":
      "Chúng tôi liên tục phân tích giá thị trường để đưa ra giá trị tốt nhất.",
    "home.features.fast": "Xử lý nhanh",
    "home.features.fast_desc": "Hoàn thành toàn bộ quy trình chỉ trong 2 ngày.",
    "home.features.secure": "Xác minh an toàn",
    "home.features.secure_desc":
      "Hệ thống xác minh trực tuyến đảm bảo giao dịch an toàn.",
    "settings.general": "Cài đặt chung",
    "settings.notifications": "Cài đặt thông báo",
    "settings.prices": "Cài đặt giá",
    "settings.integrations": "Tích hợp",
    "settings.language": "Cài đặt ngôn ngữ",
    "settings.save": "Lưu cài đặt",
    "settings.language.title": "Cài đặt ngôn ngữ",
    "settings.language.description":
      "Đặt ngôn ngữ hiển thị cho toàn bộ trang web",
    "settings.language.select": "Chọn ngôn ngữ",
    "settings.language.auto": "Sử dụng ngôn ngữ trình duyệt",
    "common.save": "Lưu",
    "common.cancel": "Hủy",
    "common.edit": "Chỉnh sửa",
    "common.delete": "Xóa",
    "common.add": "Thêm",
    "common.search": "Tìm kiếm",
    "common.loading": "Đang tải...",
    "common.error": "Đã xảy ra lỗi",
    "common.success": "Thành công",
  },
  th: {
    "nav.home": "หน้าแรก",
    "nav.iphone": "iPhone",
    "nav.camera": "กล้อง",
    "nav.game": "เกม",
    "nav.about": "เกี่ยวกับเรา",
    "nav.how_it_works": "วิธีการใช้งาน",
    "nav.login": "เข้าสู่ระบบ",
    "nav.register": "ลงทะเบียน",
    "nav.dashboard": "แดชบอร์ด",
    "nav.admin": "ผู้ดูแลระบบ",
    "nav.cart": "ตะกร้า",
    "home.hero.title": "รับซื้อ iPhone กล้อง และเครื่องเล่นเกม",
    "home.hero.subtitle":
      "ราคาสูง กระบวนการรวดเร็ว ระบบยืนยันตัวตนที่ปลอดภัย",
    "home.hero.cta": "ประเมินราคาเลย",
    "home.features.title": "คุณสมบัติของเรา",
    "home.features.high_price": "ราคาดีที่สุด",
    "home.features.high_price_desc":
      "เราวิเคราะห์ราคาตลาดอย่างต่อเนื่องเพื่อเสนอมูลค่าที่ดีที่สุด",
    "home.features.fast": "กระบวนการรวดเร็ว",
    "home.features.fast_desc": "เสร็จสิ้นกระบวนการทั้งหมดภายในเพียง 2 วัน",
    "home.features.secure": "การยืนยันที่ปลอดภัย",
    "home.features.secure_desc":
      "ระบบยืนยันตัวตนออนไลน์ของเราช่วยให้การทำธุรกรรมปลอดภัย",
    "settings.general": "การตั้งค่าทั่วไป",
    "settings.notifications": "การตั้งค่าการแจ้งเตือน",
    "settings.prices": "การตั้งค่าราคา",
    "settings.integrations": "การเชื่อมต่อ",
    "settings.language": "การตั้งค่าภาษา",
    "settings.save": "บันทึกการตั้งค่า",
    "settings.language.title": "การตั้งค่าภาษา",
    "settings.language.description":
      "ตั้งค่าภาษาที่แสดงสำหรับเว็บไซต์ทั้งหมด",
    "settings.language.select": "เลือกภาษา",
    "settings.language.auto": "ใช้ภาษาของเบราว์เซอร์",
    "common.save": "บันทึก",
    "common.cancel": "ยกเลิก",
    "common.edit": "แก้ไข",
    "common.delete": "ลบ",
    "common.add": "เพิ่ม",
    "common.search": "ค้นหา",
    "common.loading": "กำลังโหลด...",
    "common.error": "เกิดข้อผิดพลาด",
    "common.success": "สำเร็จ",
  },
  ko: {
    "nav.home": "홈",
    "nav.iphone": "아이폰",
    "nav.camera": "카메라",
    "nav.game": "게임",
    "nav.about": "회사 소개",
    "nav.how_it_works": "이용 방법",
    "nav.login": "로그인",
    "nav.register": "회원가입",
    "nav.dashboard": "대시보드",
    "nav.admin": "관리자",
    "nav.cart": "장바구니",
    "home.hero.title": "아이폰, 카메라, 게임기 매입 서비스",
    "home.hero.subtitle": "높은 가격, 빠른 처리, 안전한 인증 시스템",
    "home.hero.cta": "지금 견적 받기",
    "home.features.title": "우리의 특징",
    "home.features.high_price": "최고 가격",
    "home.features.high_price_desc":
      "시장 가격을 지속적으로 분석하여 최상의 가치를 제공합니다.",
    "home.features.fast": "빠른 처리",
    "home.features.fast_desc":
      "신청부터 입금까지 최소 2일 내에 완료됩니다.",
    "home.features.secure": "안전한 인증",
    "home.features.secure_desc":
      "온라인 인증 시스템으로 안전한 거래를 보장합니다.",
    "settings.general": "일반 설정",
    "settings.notifications": "알림 설정",
    "settings.prices": "가격 설정",
    "settings.integrations": "외부 연동",
    "settings.language": "언어 설정",
    "settings.save": "설정 저장",
    "settings.language.title": "언어 설정",
    "settings.language.description":
      "사이트 전체의 표시 언어를 설정합니다",
    "settings.language.select": "언어 선택",
    "settings.language.auto": "브라우저 언어 사용",
    "common.save": "저장",
    "common.cancel": "취소",
    "common.edit": "편집",
    "common.delete": "삭제",
    "common.add": "추가",
    "common.search": "검색",
    "common.loading": "로딩 중...",
    "common.error": "오류가 발생했습니다",
    "common.success": "성공",
  },
};

/* =========================
   Zustand ストア（クライアント専用）
   ========================= */
export interface LanguageState {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
}

export const useLanguage = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: "ja",
      setLanguage: (language: LanguageCode) => set({ language }),
      t: (key: string, fallback?: string) => {
        const { language } = get();
        const dict = translations[language];
        return dict[key] ?? fallback ?? key;
      },
    }),
    {
      name: "language-storage",
      // 重要：SSRで storage を触らないように明示
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => localStorage)
          : undefined,
    }
  )
);

/* =========================
   ブラウザ言語の検出（クライアントのみ）
   ========================= */
export function detectBrowserLanguage(): LanguageCode {
  if (typeof window === "undefined") return "ja";
  const browserLang = (navigator.language || "").split("-")[0] as LanguageCode;
  const codes = supportedLanguages.map((l) => l.code) as LanguageCode[];
  return codes.includes(browserLang) ? browserLang : "ja";
}
