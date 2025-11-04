"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Globe } from "lucide-react"
import { useLanguage, supportedLanguages, type LanguageCode } from "@/lib/i18n"

interface LanguageSwitcherProps {
  variant?: "default" | "minimal"
}

export function LanguageSwitcher({ variant = "default" }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage()
  const [mounted, setMounted] = useState(false)

  // クライアントサイドでのみレンダリング
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  // 現在の言語の国旗絵文字を取得
  const currentFlag = supportedLanguages.find((lang) => lang.code === language)?.flag || "🌐"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "minimal" ? (
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="言語切り替え">
            <span className="text-lg">{currentFlag}</span>
          </Button>
        ) : (
          <Button variant="outline" className="flex items-center gap-2 px-3">
            <span className="text-lg">{currentFlag}</span>
            <span className="hidden sm:inline">{supportedLanguages.find((lang) => lang.code === language)?.name}</span>
            <Globe className="h-4 w-4 ml-1" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={`flex items-center gap-2 cursor-pointer ${language === lang.code ? "bg-muted font-medium" : ""}`}
            onClick={() => setLanguage(lang.code as LanguageCode)}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
