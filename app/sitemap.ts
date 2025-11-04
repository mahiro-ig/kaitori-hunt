import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
      "https://kaitori-hunt.com")

  const now = new Date()
  const paths = [
    { path: "/",        changeFrequency: "daily",   priority: 1.0 },
    { path: "/iphone",  changeFrequency: "hourly",  priority: 0.9 },
    { path: "/camera",  changeFrequency: "hourly",  priority: 0.9 },
    { path: "/game",    changeFrequency: "hourly",  priority: 0.9 },
    { path: "/about",   changeFrequency: "monthly", priority: 0.7 },
  ] as const

  return paths.map(p => ({
    url: `${baseUrl}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFrequency,
    priority: p.priority,
  }))
}
