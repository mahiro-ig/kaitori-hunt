"use client"

'use client';
import { useEffect } from 'react';

export default function FixIOSZoom() {
  useEffect(() => {
    // meta viewport 繧呈爾縺・
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) return;

    // 蛻晄悄蛟､繧剃ｿ晏ｭ・
    const original =
      meta.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';

    // 笘・iOS 縺ｯ繝壹・繧ｸ驕ｷ遘ｻ蠕後↓繧ｺ繝ｼ繝蛟咲紫縺梧ｮ九ｋ縺薙→縺後≠繧九◆繧√・
    //   DOMContentLoaded / 繝壹・繧ｸ謠冗判蠕後↓蠑ｷ蛻ｶ逧・↓繝ｪ繧ｻ繝・ヨ
    const resetZoom = () => {
      requestAnimationFrame(() => {
        meta.setAttribute('content', `${original}, maximum-scale=1, user-scalable=no`);
        // 蟆代＠蠕・▲縺ｦ謌ｻ縺呻ｼ医ぜ繝ｼ繝隗｣髯､蠕後↓騾壼ｸｸ謫堺ｽ懊〒縺阪ｋ繧医≧縺ｫ・・
        setTimeout(() => {
          meta.setAttribute('content', original);
        }, 500);
      });
    };

    resetZoom(); // 繝壹・繧ｸ隱ｭ縺ｿ霎ｼ縺ｿ譎ゅ↓逋ｺ蜍・

    // 繝壹・繧ｸ驕ｷ遘ｻ謌ｻ繧頑凾・・fcache蟇ｾ蠢懶ｼ峨〒繧ょ・驕ｩ逕ｨ
    window.addEventListener('pageshow', resetZoom);
    return () => {
      window.removeEventListener('pageshow', resetZoom);
      meta.setAttribute('content', original);
    };
  }, []);

  return null;
}
