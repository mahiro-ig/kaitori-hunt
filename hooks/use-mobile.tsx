// hooks/use-mobile.ts
import { useState, useEffect } from "react"

/**
 * 現在のウィンドウ幅がモバイル（ここでは 768px 未満）かどうかを判定するカスタムフックです。
 * default export かつ named export で useIsMobile を定義しています。
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // ウィンドウサイズをチェックしてフラグを更新
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // 初回チェック
    checkWindowSize()
    // リサイズ時もチェック
    window.addEventListener("resize", checkWindowSize)
    return () => {
      window.removeEventListener("resize", checkWindowSize)
    }
  }, [])

  return isMobile
}

export default useIsMobile
export { useIsMobile }
