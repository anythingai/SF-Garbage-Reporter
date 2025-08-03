"use client"

import { useEffect, useRef } from "react"

interface TurnstileProps {
  onVerify: (token: string) => void
  onError?: () => void
}

declare global {
  interface Window {
    turnstile: {
      render: (element: HTMLElement, options: any) => string
      reset: (widgetId: string) => void
    }
  }
}

export function Turnstile({ onVerify, onError }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string>()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return

    const script = document.createElement("script")
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js"
    script.async = true
    script.defer = true

    script.onload = () => {
      if (ref.current && window.turnstile) {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          callback: onVerify,
          "error-callback": onError,
          theme: "light",
          size: "normal",
        })
      }
    }

    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [onVerify, onError])

  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) {
    return null
  }

  return <div ref={ref} className="flex justify-center" />
}
