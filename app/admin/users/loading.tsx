// app/admin/users/loading.tsx
'use client'

import React from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  // ユーザー一覧ロード中のスケルトン表示
  return (
    <div className="p-4 space-y-4">
      {[...Array(5)].map((_, i) => (
        <Skeleton key={i} className="h-12 w-full rounded-md" />
      ))}
    </div>
  )
}
