# SF Garbage Reporter 🗑️

A QR-driven web application for reporting garbage and illegal dumping to San Francisco city operations. Built for the SF10x Hackathon.

## 🎯 Problem

San Francisco faces ongoing challenges with litter and illegal dumping. Current reporting methods are cumbersome, requiring citizens to navigate complex city websites or make phone calls. This creates barriers to reporting and delays in cleanup response.

## 💡 Solution

**QR Garbage Reporter** provides instant, location-aware reporting through QR codes placed on trash cans and street furniture throughout the city. Citizens simply scan a code, add optional details and photos, and submit reports directly to city operations.

## ✨ Features

- **🔍 QR Code Integration** - Instant access via QR codes on city infrastructure
- **📍 Automatic Location** - GPS coordinates captured automatically
- **📸 Photo Upload** - Attach images with automatic compression
- **📱 Mobile-First Design** - Optimized for smartphones
- **🌙 Dark Mode Support** - Automatic theme switching
- **⚡ Fast & Anonymous** - No account required, quick submission
- **🔒 Secure** - Input validation and anti-abuse measures
- **📧 Email Integration** - Reports sent directly to city operations
- **🎨 Professional UI** - Clean, accessible interface

## 🚀 Live Demo

```
https://www.sourcesocial.com
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Email**: Resend API
- **Deployment**: Vercel
- **Security**: Cloudflare Turnstile (optional)

## 📱 User Flow

1. **Scan QR Code** - Citizen scans code on trash can/street furniture
2. **Auto-Location** - App requests and captures GPS coordinates
3. **Add Details** - Optional message and photo attachment
4. **Submit Report** - One-click submission with confirmation
5. **City Notification** - Structured email sent to operations team

## 🏗️ Installation

### Prerequisites

- Node.js 18\+
- npm or yarn

### Setup

1. **Clone the repository**

   ```bash
   git clone [your-repo-url]
   cd qr-garbage-reporter
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Variables**
   Create a `.env.local` file:

   ```env
   # Required for email functionality
   RESEND_API_KEY=re_xxxxxxxxxx
   CITY_OPERATIONS_EMAIL=operations@sf.gov
   SENDER_EMAIL=reports@yourdomain.com

   # Optional - Anti-abuse protection
   NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x00000000000000000000AA
   TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 🌐 Deployment

### Vercel (Recommended)

1. **Connect to Vercel**
   - Push code to GitHub
   - Connect repository to Vercel
   - Configure environment variables

2. **Environment Variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add all variables from `.env.local`

3. **Deploy**
   - Automatic deployment on git push
   - Custom domain support available

## 📧 Email Service Setup

### Resend Configuration

1. **Sign up at [resend.com](https://resend.com)**
2. **Get API Key** from dashboard
3. **Add to environment variables**
4. **Verify domain** (for production)

### Email Template

Reports are sent with this structure:

```
From: reports@yourdomain.com
To: operations@sf.gov
Subject: Litter report — 37.7749,-122.4194 — QR Reporter

Source: QR-Driven Garbage Reporting Webapp
When: 2025-01-08T04:36:35.643Z
Where: 37.774900,-122.419400 (±10m)
Report ID: a0d4b216-f4cf-4219-822b-f83e49a6cccb

---
User Message:
Large pile of cardboard boxes behind the bus stop.
---
```

## 🔧 Configuration

### Location Bounds

By default, the app restricts reports to San Francisco city limits. For testing/demo purposes, this is disabled. To enable:

```typescript
// In app/api/submit/route.ts
if (!isInSanFrancisco(validatedData.lat, validatedData.lon)) {
  return NextResponse.json({
    status: "error",
    code: "out_of_bounds", 
    message: "Location must be within San Francisco city limits"
  }, { status: 400 })
}
```

### Photo Upload

- **Max file size**: 10MB
- **Automatic compression**: Images resized to 1280px max
- **Format**: JPEG at 80% quality
- **Attachment**: Sent via email as base64

## 🎨 Design System

- **Colors**: Neutral palette with blue accents
- **Typography**: Inter font family
- **Components**: shadcn/ui component library
- **Responsive**: Mobile-first breakpoints
- **Accessibility**: WCAG 2.1 compliant

## 🔒 Security Features

- **Input Validation**: Zod schema validation
- **Rate Limiting**: Idempotency checks prevent spam
- **CORS Protection**: Secure API endpoints  
- **Location Bounds**: Geographic restrictions
- **File Validation**: Image type and size limits

## 📊 API Endpoints

### POST /api/submit

Submit a garbage report

**Request Body:**

```json
{
  "lat": 37.7749,
  "lon": -122.4194,
  "accuracy": 10,
  "timestamp": 1704672395643,
  "client_nonce": "uuid-v4",
  "message": "Optional description",
  "photoBase64": "data:image/jpeg;base64,..."
}
```

**Response:**

```json
{
  "status": "success",
  "reference": "email-id"
}
```

### GET /api/health

Health check endpoint

## 🧪 Testing

The app includes comprehensive error handling and validation:

- **Geolocation errors** - Permission denied, timeout, unavailable
- **Network errors** - Connection issues, API failures  
- **Validation errors** - Invalid coordinates, file size limits
- **Duplicate prevention** - Idempotency key system

## 🚀 Production Considerations

### For City Deployment

1. **Domain Setup** - Official SF government domain
2. **Email Authentication** - SPF, DKIM, DMARC records
3. **Analytics** - Usage tracking and reporting
4. **Monitoring** - Error tracking and performance metrics
5. **Backup Systems** - Queue system for reliability
6. **Load Testing** - Handle high traffic volumes

### QR Code Deployment

- **Physical Placement** - Trash cans, bus stops, street furniture
- **QR Code Generation** - Unique codes per location
- **Maintenance** - Weather-resistant materials
- **Analytics** - Track scan rates and locations

## 🤝 Contributing

This project was built for the SF10x Hackathon. For production deployment, consider:

- Database integration for report storage
- Admin dashboard for city operations
- Advanced analytics and reporting
- Multi-language support
- Offline functionality (PWA)

## 📄 License

MIT License - Built for SF10x Hackathon 2025

## 🏆 Hackathon Context

**SF10x Hackathon Submission**

- **Category**: Civic Technology
- **Problem**: Urban cleanliness and citizen engagement
- **Innovation**: QR-driven mobile reporting
- **Impact**: Faster response times, better city data

---

**Built with ❤️ for San Francisco**
