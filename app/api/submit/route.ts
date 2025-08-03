import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"

// Validation schema
const submitSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().optional(),
  timestamp: z.number().optional(),
  client_nonce: z.string().uuid(),
  message: z.string().optional(),
  photoBase64: z.string().optional(),
})

// San Francisco bounding box (more precise)
const SF_BOUNDS = {
  north: 37.8324,
  south: 37.7049,
  east: -122.3482,
  west: -122.5277,
}

// Production logging with correlation IDs
function logWithCorrelation(correlationId: string, level: "info" | "warn" | "error", message: string, data?: any) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    correlationId,
    level,
    message,
    ...(data && { data }),
  }
  console.log(JSON.stringify(logEntry))
}

function isInSanFrancisco(lat: number, lon: number): boolean {
  return lat >= SF_BOUNDS.south && lat <= SF_BOUNDS.north && lon >= SF_BOUNDS.west && lon <= SF_BOUNDS.east
}

async function sendEmailReport(
  data: z.infer<typeof submitSchema>,
  correlationId: string,
): Promise<{ success: boolean; reference?: string; error?: string }> {
  try {
    // Production email using Resend
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured")
    }

    const attachments = []
    if (data.photoBase64) {
      // Remove the data URL prefix to get the raw base64 data
      const base64Data = data.photoBase64.split(",")[1]
      attachments.push({
        filename: "photo.jpg",
        content: base64Data,
      })
    }

    const emailPayload = {
      from: process.env.SENDER_EMAIL || "reports@qr-garbage-reporter.com",
      to: process.env.CITY_OPERATIONS_EMAIL || "operations@sf.gov",
      subject: `Litter report — ${data.lat.toFixed(6)},${data.lon.toFixed(6)} — QR Reporter`,
      text: `
Source: QR-Driven Garbage Reporting Webapp
When: ${new Date(data.timestamp || Date.now()).toISOString()}
Where: ${data.lat.toFixed(6)},${data.lon.toFixed(6)} ${data.accuracy ? `(±${Math.round(data.accuracy)}m)` : ""}
Report ID: ${data.client_nonce}
Correlation ID: ${correlationId}

---
User Message:
${data.message || "No message provided."}
---
      `.trim(),
      attachments: attachments,
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
      signal: AbortSignal.timeout(15000), // Increased timeout for attachments
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Email API error: ${response.status} ${error}`)
    }

    const result = await response.json()

    logWithCorrelation(correlationId, "info", "Email sent successfully", {
      messageId: result.id,
      to: emailPayload.to,
      nonce: data.client_nonce,
    })

    return { success: true, reference: result.id }
  } catch (error) {
    logWithCorrelation(correlationId, "error", "Failed to send email", { error: error.message })
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

// Idempotency check (in-memory store)
const recentSubmissions = new Map<string, { timestamp: number; response: any }>()

function getIdempotencyKey(data: { lat: number; lon: number; client_nonce: string }): string {
  const roundedLat = Math.round(data.lat * 10000) / 10000
  const roundedLon = Math.round(data.lon * 10000) / 10000
  const minuteBucket = Math.floor(Date.now() / 60000)
  return `${roundedLat},${roundedLon},${minuteBucket},${data.client_nonce}`
}

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const startTime = Date.now()

  try {
    const ip =
      request.ip ||
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown"

    logWithCorrelation(correlationId, "info", "Report submission started", { ip })

    const body = await request.json()
    const validatedData = submitSchema.parse(body)

    // Check idempotency
    const idempotencyKey = getIdempotencyKey(validatedData)
    const existing = recentSubmissions.get(idempotencyKey)
    if (existing && Date.now() - existing.timestamp < 300000) {
      logWithCorrelation(correlationId, "info", "Duplicate submission detected", { idempotencyKey })
      return NextResponse.json(existing.response)
    }

    // NOTE: Location bounds check disabled for hackathon demo - judges can test from anywhere
    // In production, uncomment the bounds check above to restrict to SF only
    // if (!isInSanFrancisco(validatedData.lat, validatedData.lon)) {
    //   logWithCorrelation(correlationId, "warn", "Location out of bounds", validatedData)
    //   return NextResponse.json(
    //     {
    //       status: "error",
    //       code: "out_of_bounds",
    //       message: "Location must be within San Francisco city limits",
    //     },
    //     { status: 400 },
    //   )
    // }

    // Attempt to send email report
    const emailResult = await sendEmailReport(validatedData, correlationId)

    if (!emailResult.success) {
      throw new Error(emailResult.error || "Failed to send report email.")
    }

    const response = {
      status: "success" as const,
      reference: emailResult.reference,
    }

    recentSubmissions.set(idempotencyKey, { timestamp: Date.now(), response })

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      const cutoff = Date.now() - 300000
      for (const [key, value] of recentSubmissions.entries()) {
        if (value.timestamp < cutoff) {
          recentSubmissions.delete(key)
        }
      }
    }

    const duration = Date.now() - startTime
    logWithCorrelation(correlationId, "info", "Report submission completed", {
      duration,
      status: response.status,
    })

    return NextResponse.json(response)
  } catch (error) {
    const duration = Date.now() - startTime
    logWithCorrelation(correlationId, "error", "API error", { error: error.message, duration })

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          status: "error",
          code: "bad_request",
          message: "Invalid request data",
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { status: "error", code: "server_error", message: "Internal server error" },
      { status: 500 },
    )
  }
}
