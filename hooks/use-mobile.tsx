"use client"

// hooks/use-mobile.ts
import { useState, useEffect } from "react"

/**
 * 迴ｾ蝨ｨ縺ｮ繧ｦ繧｣繝ｳ繝峨え蟷・′繝｢繝舌う繝ｫ・医％縺薙〒縺ｯ 768px 譛ｪ貅・峨°縺ｩ縺・°繧貞愛螳壹☆繧九き繧ｹ繧ｿ繝繝輔ャ繧ｯ縺ｧ縺吶・ * default export 縺九▽ named export 縺ｧ useIsMobile 繧貞ｮ夂ｾｩ縺励※縺・∪縺吶・ */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // 繧ｦ繧｣繝ｳ繝峨え繧ｵ繧､繧ｺ繧偵メ繧ｧ繝・け縺励※繝輔Λ繧ｰ繧呈峩譁ｰ
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // 蛻晏屓繝√ぉ繝・け
    checkWindowSize()
    // 繝ｪ繧ｵ繧､繧ｺ譎ゅｂ繝√ぉ繝・け
    window.addEventListener("resize", checkWindowSize)
    return () => {
      window.removeEventListener("resize", checkWindowSize)
    }
  }, [])

  return isMobile
}

export default useIsMobile
export { useIsMobile }
