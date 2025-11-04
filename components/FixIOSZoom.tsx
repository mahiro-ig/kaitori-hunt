'use client';
import { useEffect } from 'react';

export default function FixIOSZoom() {
  useEffect(() => {
    // meta viewport を探す
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) return;

    // 初期値を保存
    const original =
      meta.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';

    // ★ iOS はページ遷移後にズーム倍率が残ることがあるため、
    //   DOMContentLoaded / ページ描画後に強制的にリセット
    const resetZoom = () => {
      requestAnimationFrame(() => {
        meta.setAttribute('content', `${original}, maximum-scale=1, user-scalable=no`);
        // 少し待って戻す（ズーム解除後に通常操作できるように）
        setTimeout(() => {
          meta.setAttribute('content', original);
        }, 500);
      });
    };

    resetZoom(); // ページ読み込み時に発動

    // ページ遷移戻り時（bfcache対応）でも再適用
    window.addEventListener('pageshow', resetZoom);
    return () => {
      window.removeEventListener('pageshow', resetZoom);
      meta.setAttribute('content', original);
    };
  }, []);

  return null;
}
