'use client'

import { useRouter } from 'next/navigation'

export function useNavigate() {
  const router = useRouter()
  return (href, options) => options?.replace ? router.replace(href, { scroll: false }) : router.push(href, { scroll: false })
}
