"use client"

'use client';
import { useEffect } from 'react';

export default function NoZoomOnFocus({ hardReset = true }: { hardReset?: boolean } = {}) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) return;

    const original =
      meta.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';

    const setLocked = () => {
      // 譌｢蟄倥・ maximum-scale / user-scalable 繧剃ｸ譌ｦ髯､蜴ｻ縺励※縺九ｉ莉倥￠逶ｴ縺・
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

    // 笘・蛻晄悄繧ｺ繝ｼ繝縺梧戟縺｡雜翫＆繧後ｋ蝠城｡後ｒ遒ｺ螳溘↓繝ｪ繧ｻ繝・ヨ
    if (hardReset) {
      // 1) 荳・ｸ繝輔か繝ｼ繧ｫ繧ｹ荳ｭ縺ｪ繧芽ｧ｣髯､
      if (document.activeElement instanceof HTMLElement) {
        try { document.activeElement.blur(); } catch {}
      }
      // 2) 荳譎ら噪縺ｫ繝ｭ繝・け 竊・蟆代＠蠕・▲縺ｦ蜈・↓謌ｻ縺呻ｼ・OS 縺ｧ蛻晄悄蛟咲紫繧・1 縺ｫ謌ｻ縺吶◆繧√・窶懈昭縺輔・繧岩晢ｼ・
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
