"use client"

'use client';
import { useEffect } from 'react';

export default function FixIOSZoom() {
  useEffect(() => {
    
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null;
    if (!meta) return;

    
    const original =
      meta.getAttribute('content') || 'width=device-width, initial-scale=1, viewport-fit=cover';

    
    const resetZoom = () => {
      requestAnimationFrame(() => {
        meta.setAttribute('content', `${original}, maximum-scale=1, user-scalable=no`);
        
        setTimeout(() => {
          meta.setAttribute('content', original);
        }, 500);
      });
    };

    resetZoom(); 

    
    window.addEventListener('pageshow', resetZoom);
    return () => {
      window.removeEventListener('pageshow', resetZoom);
      meta.setAttribute('content', original);
    };
  }, []);

  return null;
}
