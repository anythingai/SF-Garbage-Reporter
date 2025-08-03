"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, CheckCircle, AlertCircle, Loader2, RefreshCw, Paperclip, XCircle, Trash2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

type SubmissionState = "idle" | "requesting-location" | "submitting" | "success" | "error"

interface LocationData {
  lat: number
  lon: number
  accuracy: number
  timestamp: number
}

interface SubmissionResponse {
  status: "success" | "error"
  reference?: string
  message?: string
}

// Helper to resize and compress image on the client-side
const resizeImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement("canvas")
        const MAX_WIDTH = 1280
        const MAX_HEIGHT = 1280
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height
            height = MAX_HEIGHT
          }
        }
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")
        if (!ctx) {
          return reject(new Error("Could not get canvas context"))
        }
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL("image/jpeg", 0.8)) // Compress to 80% quality JPEG
      }
      img.onerror = reject
    }
    reader.onerror = reject
  })
}

export default function ReportPage() {
  const [state, setState] = useState<SubmissionState>("idle")
  const [location, setLocation] = useState<LocationData | null>(null)
  const [response, setResponse] = useState<SubmissionResponse | null>(null)
  const [error, setError] = useState<string>("")
  const [message, setMessage] = useState("")
  const [photo, setPhoto] = useState<{ name: string; dataUrl: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const generateClientNonce = () => {
    return crypto.randomUUID()
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        // 10MB size limit
        setError("File is too large. Please select an image under 10MB.")
        return
      }
      try {
        const dataUrl = await resizeImage(file)
        setPhoto({ name: file.name, dataUrl })
        setError("")
      } catch (err) {
        setError("Could not process image. Please try another one.")
        setPhoto(null)
      }
    }
  }

  const handleLocationRequest = () => {
    requestLocation()
  }

  const requestLocation = async () => {
    setState("requesting-location")
    setError("")

    if (!navigator.geolocation) {
      setError("Geolocation is not supported by this browser.")
      setState("error")
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 60000,
        })
      })

      const locationData: LocationData = {
        lat: position.coords.latitude,
        lon: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
      }

      setLocation(locationData)
      await submitReport(locationData)
    } catch (err) {
      if (err instanceof GeolocationPositionError) {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError("Location access denied. Please enable location and try again.")
            break
          case err.POSITION_UNAVAILABLE:
            setError("Location information unavailable. Please try again.")
            break
          case err.TIMEOUT:
            setError("Location request timed out. Please try again.")
            break
          default:
            setError("An error occurred while getting your location.")
        }
      } else {
        setError("Failed to get location. Please try again.")
      }
      setState("error")
    }
  }

  const submitReport = async (locationData: LocationData) => {
    setState("submitting")

    try {
      const payload = {
        lat: locationData.lat,
        lon: locationData.lon,
        accuracy: locationData.accuracy,
        timestamp: locationData.timestamp,
        client_nonce: generateClientNonce(),
        message: message,
        photoBase64: photo?.dataUrl,
      }

      const res = await fetch("/api/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const result: SubmissionResponse = await res.json()

      if (res.ok) {
        setResponse(result)
        setState("success")
      } else {
        setError(result.message || "Failed to submit report. Please try again.")
        setState("error")
      }
    } catch (err) {
      setError("Network error. Please check your connection and try again.")
      setState("error")
    }
  }

  const retry = () => {
    setState("idle")
    setLocation(null)
    setResponse(null)
    setError("")
    setMessage("")
    setPhoto(null)
  }

  const renderContent = () => {
    switch (state) {
      case "idle":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="message">Optional Message</Label>
              <Textarea
                id="message"
                placeholder="e.g., 'Large pile of cardboard boxes behind the bus stop.'"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Optional Photo</Label>
              {!photo ? (
                <Button
                  variant="outline"
                  className="w-full bg-transparent"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Attach Photo
                </Button>
              ) : (
                <div className="flex items-center justify-between p-2 border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 truncate">
                    <img
                      src={photo.dataUrl || "/placeholder.svg"}
                      alt="Preview"
                      className="w-10 h-10 rounded-sm object-cover"
                    />
                    <span className="text-sm text-muted-foreground truncate">{photo.name}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setPhoto(null)}>
                    <XCircle className="w-5 h-5 text-destructive" />
                  </Button>
                </div>
              )}
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button onClick={handleLocationRequest} className="w-full h-12 text-lg" size="lg">
              <MapPin className="w-5 h-5 mr-2" />
              Allow Location & Report
            </Button>
          </div>
        )
      case "requesting-location":
      case "submitting":
        return (
          <div className="text-center space-y-4 p-8">
            <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground text-lg">
              {state === "requesting-location" ? "Getting your location..." : "Submitting your report..."}
            </p>
          </div>
        )
      case "success":
        return (
          <div className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Report Submitted!</h2>
              <p className="text-muted-foreground">Thank you for helping keep San Francisco clean.</p>
            </div>
            <Button onClick={retry} variant="outline" className="w-full bg-transparent">
              Report Another Issue
            </Button>
          </div>
        )
      case "error":
        return (
          <div className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold">Unable to Submit</h2>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <Button onClick={retry} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </div>
        )
    }
  }

  return (
    <div className="relative min-h-screen w-full">
      <div
        className="absolute inset-0 bg-cover bg-center blur-xs"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1501594907352-04cda38ebc29?q=80&w=2070&auto=format&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-black/30" />
      <main className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center p-2 sm:p-4 md:p-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>
        <Card className="w-full max-w-md mx-auto shadow-lg bg-background border-white/20 sm:rounded-xl">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Trash2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">SF Garbage Reporter</CardTitle>
            <CardDescription>Help keep San Francisco clean. Fast and anonymous.</CardDescription>
          </CardHeader>
          <CardContent>{renderContent()}</CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground text-center w-full">
              Your location is used once for reporting and is never stored.
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
