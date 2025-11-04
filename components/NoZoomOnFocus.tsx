'use client';
import { useEffect } from 'react';

export default function NoZoomOnFocus({ hardReset = true }: { hardReset?: boolean } = {}) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) return;

    const original =
      meta.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';

    const setLocked = () => {
      // 既存の maximum-scale / user-scalable を一旦除去してから付け直し
      const cleaned = original
        .replace(/,\s*maximum-scale=[^,]*/gi, '')
        .replace(/,\s*user-scalable=[^,]*/gi, '');
      meta.setAttribute('content', `${cleaned}, maximum-scale=1, user-scalable=no`);
    };

    const onFocusIn = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (!t) return;
      const tag = t.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        setLocked();
      }
    };
    const onFocusOut = () => {
      meta.setAttribute('content', original);
    };

    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);

    // ★ 初期ズームが持ち越される問題を確実にリセット
    if (hardReset) {
      // 1) 万一フォーカス中なら解除
      if (document.activeElement instanceof HTMLElement) {
        try { document.activeElement.blur(); } catch {}
      }
      // 2) 一時的にロック → 少し待って元に戻す（iOS で初期倍率を 1 に戻すための“揺さぶり”）
      setLocked();
      const id = setTimeout(() => {
        meta.setAttribute('content', original);
      }, 400);

      return () => {
        clearTimeout(id);
        document.removeEventListener('focusin', onFocusIn);
        document.removeEventListener('focusout', onFocusOut);
        meta.setAttribute('content', original);
      };
    }

    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      meta.setAttribute('content', original);
    };
  }, []);

  return null;
}
