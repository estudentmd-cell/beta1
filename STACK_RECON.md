# Momentive Platform — Technical Stack Reconnaissance

**Date:** 2026-03-31
**Platform:** Momentive — Premium Photo Album E-Commerce (Moldova)
**Live URL:** https://fotocarte-app.web.app
**Repository:** Local (no remote git)

---

## 1. Core Framework & Build

| Component | Version | Purpose |
|-----------|---------|---------|
| React | 19.2.4 | UI Framework (hooks, Suspense) |
| React DOM | 19.2.4 | Rendering (createRoot) |
| Vite | 8.0.1 | Build tool, dev server (port 3000) |
| @vitejs/plugin-react | 6.0.1 | JSX transform, Fast Refresh |
| Node | ES Modules | `"type": "module"` in package.json |

---

## 2. Routing

| Component | Version | Pattern |
|-----------|---------|---------|
| React Router DOM | 7.13.1 | SPA, createBrowserRouter |
| Lazy Loading | React.lazy + Suspense | Code-split all non-landing routes |
| Page Transitions | Motion AnimatePresence | 0.2s opacity fade between routes |

**Routes:**
- `/` — Landing page (immediate load)
- `/albume-de-calatorie` — Travel albums landing
- `/colectie/:tema` — Collection by category (lazy)
- `/preturi` — Pricing (lazy)
- `/app/editor` — Photo album editor (lazy, heavy)
- `/app/product/:slug` — Product configurator (lazy)
- `/app/checkout` — Order checkout (lazy)
- `/app/cabinet` — User account (lazy)
- `/admin_panel` — Admin dashboard (lazy, 15 nested routes)

---

## 3. State Management — Zustand 5.0.12

| Store | Purpose | Persistence |
|-------|---------|-------------|
| useAuthStore | Auth, Google Sign-In, admin role | localStorage (persist) |
| useProjectStore | Album config, cover template, spreads | localStorage |
| useEditorStore | Canvas state, photos, undo/redo (200+ props) | In-memory |
| useUIStore | Toasts, modals, global UI | In-memory |
| useOrderStore | Order workflow | In-memory |
| useAdminStore | Admin data, notifications | In-memory |

**Pattern:** No Redux. Zustand with `persist` middleware. Direct `getState()` for imperative access.

---

## 4. Styling

| Tool | Version | Purpose |
|------|---------|---------|
| Tailwind CSS | 3.4.19 | Utility-first CSS |
| tailwindcss-animate | 1.0.7 | Predefined animation utilities |
| PostCSS | 8.5.8 | CSS pipeline |
| Autoprefixer | 10.4.27 | Browser compatibility |

**Design System:**
- **Colors:** Warm beige base (#FAF8F5), teal accent (#3D6B5E), danger (#B54A3A)
- **Fonts:** DM Sans (body), DM Serif Display (headings), Amiri (alt serif)
- **Radius:** 12px default
- **Shadows:** Subtle (0.06 opacity)

**CSS Files:**
- `src/styles/index.css` — Main (Tailwind directives + global rules)
- `src/styles/animations.css` — Custom keyframes
- `src/styles/admin.css` — Admin-specific

**Accessibility CSS:**
- `prefers-reduced-motion` — disables all animations
- `focus-visible` — 2px teal outline
- `text-wrap: balance` — on h1-h3
- `touch-action: manipulation` — no 300ms delay
- Skeleton shimmer on lazy images
- `content-visibility: auto` on off-screen sections
- Grain texture overlay (`.grain` class)

---

## 5. Animation & Motion

| Library | Version | Purpose |
|---------|---------|---------|
| Motion (Framer Motion) | 12.38.0 | Page transitions, scroll reveals, hover effects |
| @formkit/auto-animate | 0.9.0 | Grid reorder animation on filter |

**Patterns Used:**
- `whileInView` — scroll-triggered reveals with stagger
- `AnimatePresence` — page transitions
- `whileHover` / `whileTap` — button micro-interactions
- `useScroll` + `useSpring` — scroll progress bar
- `useMotionValueEvent` — scroll-to-top visibility
- Word-by-word text reveal (AnimatedText component)
- Parallax zoom on CTA backgrounds
- Float animation on hero product image

**Custom Components (`src/components/motion/`):**
- `AnimatedSection` — reusable scroll-triggered wrapper
- `AnimatedItem` — stagger child
- `AnimatedText` — word-by-word heading reveal
- `ScrollToTop` — floating button

---

## 6. Firebase — Project `fotocarte-app`

| Service | Version | Purpose |
|---------|---------|---------|
| Firebase SDK | 12.11.0 | Modular imports |
| Firestore | - | Database (real-time) |
| Firebase Auth | - | Google OAuth |
| Firebase Storage | - | Photo uploads, fonts, covers |
| Firebase Hosting | - | Static site deployment |

### Firestore Collections
```
clients/              → User profiles
orders/               → Orders (+ timeline, photos subcollections)
projects/             → Album designs (+ history subcollection)
project_data/         → Design metadata
cover-templates/      → PSD cover templates
config/               → App settings (fonts, pricing)
site-content/         → CMS content
designs/              → User designs
team/                 → Staff
notifications/        → System notifications
admins/               → Admin accounts
email-codes/          → Verification codes (10-min expiry)
invitations/          → Shared album links
visitors/             → Visitor tracking
pricing/              → Dynamic pricing
mail/                 → Email trigger (Extension)
```

### Storage Buckets
```
uploads/    → Original user photos (read/write)
resized/    → Auto-generated WebP thumbnails (read-only)
cms/        → Landing page images (read/write)
covers/     → Cover templates + backgrounds (read/write)
fonts/      → Custom font files TTF/OTF/WOFF2 (read/write)
```

### Security Rules
- **Firestore:** All public read/write (phone users not Firebase Auth'd)
- **Storage:** Per-bucket rules, `resized/` read-only

---

## 7. Authentication

| Method | Implementation |
|--------|----------------|
| Google OAuth | Firebase Auth (GoogleAuthProvider) |
| Email Verification | EmailJS + Firestore codes (6-digit, 10-min) |
| Phone Auth | localStorage clientId (non-Firebase) |
| Admin Detection | Email match: `fotocartemd@gmail.com` |

---

## 8. Email Integration

| Service | Details |
|---------|---------|
| EmailJS | @emailjs/browser 4.4.1 |
| Service ID | service_riu4h4v |
| Template | template_ko2uc37 |
| Public Key | G5ZCle95xNR-1_AFo |

---

## 9. File Processing

| Library | Version | Purpose |
|---------|---------|---------|
| ag-psd | 30.1.0 | Parse Photoshop PSD files (layers, text, zones) |
| JSZip | 3.10.1 | ZIP compression for multi-page export |

**PSD Import Workflow:**
1. Admin uploads `.psd` (full spread: back + spine + front)
2. `ag-psd` parses: composite image, text layers, photo placeholders
3. Layers named `foto`/`photo`/`poza` → interactive photo zones
4. Text layers → interactive editable text zones
5. Composite (minus interactive layers) → background image
6. Coordinates converted from spread % to front cover %
7. Uploaded to Firebase Storage, saved to Firestore

---

## 10. Utility Modules (`src/utils/`)

| Module | Purpose |
|--------|---------|
| layoutEngine.js | Canvas grid layout, spread pagination, photo distribution |
| renderEngine.js | 300 DPI JPEG export with sRGB ICC profile |
| psdParser.js | PSD file parsing (ag-psd wrapper) |
| fontManager.js | Google Fonts + custom TTF upload, Firebase sync |
| projectStorage.js | Save/restore projects (Firestore + localStorage) |
| projectRestore.js | Restore spreads from saved snapshots |
| coverData.js | Cover template CRUD (Firestore + localStorage cache) |
| coverDimensions.js | Cover dimensions: spine, bleed, safe zone calculations |
| pricing.js | Album price calculation (format × pages) |
| delivery.js | Shipping dates, delivery estimation |
| dimensions.js | Product dimension config |
| offers.js | Promotional offers management |
| editHistory.js | Design change timeline |
| adminData.js | Admin dashboard metrics |
| constants.js | App-wide constants |

---

## 11. Component Architecture

### Landing (`src/landing/`)
- **LandingPage.jsx** — Main homepage (18 sections)
- **TravelPage.jsx** — Dedicated travel albums page
- **sections/** — 18 modular section components

### Screens (`src/screens/` — 23 files)
- EditorScreen (31KB, heaviest)
- CheckoutScreen, CollectionScreen, ProductScreen
- PricingScreen, CabinetScreen, AdminScreen
- ConfirmDesignerScreen, OffersScreen, PaginiScreen

### Components (`src/components/` — 89 JSX files)
- **editor/** (16) — Canvas, upload, toolbar, mobile editor
- **admin/** (26) — Orders, clients, covers, dashboard, stats
- **layout/** (6) — Header, footer, tab bar, navigation
- **checkout/** (3) — Payment, summary, service
- **motion/** (1) — AnimatedSection/Item/Text
- **shared/** — ScrollToTop, AlbumMockup3D, BookMockup
- **cms/** — Editable content components

---

## 12. Key Features

| Feature | Implementation |
|---------|----------------|
| Photo Album Editor | Canvas-based, drag/drop, auto-layout engine |
| Cover Designer | PSD import, per-format elements, mm positioning |
| 300 DPI Export | sRGB ICC profile, JPEG compression, ZIP archive |
| Real-time Upload | 5-tier adaptive compression, Firebase Storage + resize extension |
| Undo/Redo | 40-snapshot stack in Zustand |
| Cover Text Editing | Client toolbar: font, size, bold, color |
| Font Management | Google Fonts + custom TTF upload to Firebase |
| Admin Panel | Orders, clients, covers, team, offers, dimensions, live dashboard |
| PSD Parser | Browser-side Photoshop parsing (ag-psd) |
| Countdown Timer | Urgency strip with live countdown to offer deadline |
| Newsletter | Email collection with 10% discount |
| Travel Landing | Dedicated page for vacation album promotion |

---

## 13. Performance Optimizations

| Optimization | Implementation |
|--------------|----------------|
| Code Splitting | React.lazy on all non-landing routes |
| Font Preload | `<link rel="preload">` for DM Sans + DM Serif Display |
| Preconnect | Google Fonts, Firebase, Innocence CDN |
| Image Lazy Loading | `loading="lazy"` + skeleton shimmer |
| Content Visibility | `content-visibility: auto` on off-screen sections |
| Cache Headers | JS/CSS: 1-year immutable, Images: 1-day |
| Reduced Motion | Full `prefers-reduced-motion` support |
| Touch Optimization | `touch-action: manipulation` globally |

---

## 14. External Dependencies

| Service | Usage |
|---------|-------|
| Google Fonts CDN | DM Sans, DM Serif Display, Amiri, Instrument Sans |
| Innocence Éditions CDN | Product photography, lifestyle images |
| Firebase (Google Cloud) | Database, storage, hosting, auth |
| EmailJS | Email verification delivery |

---

## 15. Deployment

```bash
# Build
vite build          # Output: dist/

# Deploy
firebase deploy --only hosting     # Static site
firebase deploy --only firestore:rules
firebase deploy --only storage
```

**Hosting:** Firebase Hosting with SPA rewrite (`** → /index.html`)

---

## 16. Bundle Analysis

| Chunk | Size (gzip) | Content |
|-------|-------------|---------|
| index.js | ~130KB | React, Router, Zustand, Motion, Landing |
| EditorScreen.js | ~14KB | Canvas editor |
| AdminCoverEditor.js | ~9KB | Cover template editor |
| EditorStrip.js | ~12KB | Editor toolbar/sidebar |
| ag-psd (dist) | ~85KB | PSD parser (lazy) |
| Three.js (if used) | ~74KB | 3D rendering (lazy) |

**Total initial load:** ~130KB gzip (landing page)

---

## 17. Security Considerations

| Area | Status | Note |
|------|--------|------|
| Firestore Rules | ⚠️ All public | By design (phone users) |
| Storage Rules | ⚠️ Mostly public | Per-bucket restrictions |
| Admin Auth | ⚠️ Email-based | Hardcoded admin email |
| API Keys | ⚠️ Client-exposed | Firebase config in source |
| CORS | ✅ Firebase default | Handled by hosting |
| HTTPS | ✅ Auto (Firebase) | Certificate managed |
| CSP | ❌ Not configured | No Content-Security-Policy header |

---

*Generated by Claude Code — Momentive Platform Stack Recon*
