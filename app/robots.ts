import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  const host =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://kaitori-hunt.com"

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",   
          "/dashboard",  
          "/auth",    
          "/cart",    
          "/api",     
          "/api/*",
        ],
      },
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  }
}
