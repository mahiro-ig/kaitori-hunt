// lib/site.ts
export function getBaseUrl() {
  // Vercelの実行環境では VERCEL_URL が来る（https なし）
  if (typeof window === 'undefined') {
    const vercel = process.env.VERCEL_URL;
    if (vercel) return `https://${vercel}`;
  }
  // NEXT_PUBLIC_SITE_URL を最優先で固定
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');
  // ローカル
  return 'http://localhost:3004';
}
