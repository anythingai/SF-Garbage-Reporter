import { redirect } from "next/navigation"

export default function ReportPage() {
  // Redirect /report to the main page for QR code compatibility
  redirect("/")
}
