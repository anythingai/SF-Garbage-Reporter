import { NextResponse } from "next/server"

export async function GET() {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    environment: process.env.NODE_ENV || "development",
    services: {
      email: !!process.env.RESEND_API_KEY,
      turnstile: !!process.env.TURNSTILE_SECRET_KEY,
    },
  }

  return NextResponse.json(health)
}
