# Error Monitor & Funnel Tracker — Design Spec

## Goal

Admin panel feature that captures JS errors and funnel steps from client sessions, shows them in a dedicated page with notifications for critical errors.

## Architecture

### 1. Client-side: `src/utils/errorTracker.js`

Single module, two responsibilities:

**A) Auto error capture:**
- `window.onerror` + `window.onunhandledrejection`
- Writes to Firestore `errors` collection
- Skips admin panel pages (`/admin_panel`)
- Fields: message, stack, page, device, browser, screenW, screenH, clientName?, clientPhone?, sessionId, timestamp, severity

**B) Funnel step tracking:**
- Export `trackStep(step, meta?)` function
- Writes to Firestore `funnel` collection
- Steps: `visit`, `select_product`, `open_editor`, `upload_photos`, `design_progress`, `click_order`, `checkout`, `order_placed`
- Fields: step, sessionId, device, browser, clientName?, clientPhone?, timestamp, meta?

**Session ID:** random per browser session (`sessionStorage`), links errors + funnel steps from same visit.

**Client identity:** reads from `useAuthStore` (clientName, clientPhone) when available.

### 2. Firestore Collections

```
errors/{autoId}
  message: string
  stack: string (truncated to 2000 chars)
  page: string (pathname)
  device: 'mobile' | 'tablet' | 'desktop'
  browser: string
  screenW: number
  screenH: number
  clientName: string | null
  clientPhone: string | null
  sessionId: string
  timestamp: string (ISO)
  severity: 'error' | 'warning'

funnel/{autoId}
  step: string
  sessionId: string
  device: string
  browser: string
  clientName: string | null
  clientPhone: string | null
  timestamp: string (ISO)
  meta: object | null
```

### 3. Admin Page: `src/components/admin/AdminErrors.jsx`

Two tabs:

**Tab "Erori":**
- Table: ora, pagina, mesaj, device, client (name/phone or "Anonim"), browser
- Click row expands stack trace
- Period filter: azi / 7 zile / 30 zile
- Red badge with error count

**Tab "Funnel":**
- Bar visualization showing drop-off between steps
- Numbers + conversion % between each step
- Period filter: azi / 7 zile / 30 zile

### 4. Dashboard Card

New card in AdminDashboard:
- "Erori: N" (red if > 0)
- Mini funnel numbers on one line
- Click navigates to `/admin_panel/errors`

### 5. Sidebar + Route

- New nav item in AdminScreen NAV array under "Site" section
- Icon: warning/alert
- Route: `/admin_panel/errors`
- Red badge on nav item when errors exist today

### 6. Notifications

- When admin opens panel, unread error count shows as badge
- No push notifications — just visual badge in sidebar

### 7. Out of Scope

- Conversions API server-side
- Session replay / screenshots
- Error deduplication / grouping
- Admin panel tracking (only public pages)
