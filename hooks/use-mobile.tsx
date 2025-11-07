"use client"

// hooks/use-mobile.ts
import { useState, useEffect } from "react"


function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
   
    const checkWindowSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    
    checkWindowSize()
    
    window.addEventListener("resize", checkWindowSize)
    return () => {
      window.removeEventListener("resize", checkWindowSize)
    }
  }, [])

  return isMobile
}

export default useIsMobile
export { useIsMobile }
