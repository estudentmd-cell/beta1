# Landing Page Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure landing page to convert 99% mobile visitors from ads into customers who start a photo album — fix false info, add ThemeCards, reduce to 3 steps, add floating CTA.

**Architecture:** Modify existing landing sections in-place (copy/data fixes), add 2 new components (ThemeCards based on CollectionCards, FloatingCTA), restructure section order in LandingPage.jsx. No new dependencies. Firestore CMS admin stays intact.

**Tech Stack:** React 19, Tailwind CSS, Zustand, Firebase Firestore, existing `getPagePrice()` from `src/utils/pricing.js`

**Spec:** `docs/superpowers/specs/2026-04-20-landing-page-redesign.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `src/landing/sections/TrustStrip.jsx` | Fix false data (2000+ albume, remove "design gratuit") |
| Modify | `src/landing/sections/HeroSplit.jsx` | Fix sub-text badges ("Livrare 7 zile" → correct) |
| Modify | `src/landing/sections/HowItWorks.jsx` | Reduce 4→3 steps, absorb DesignService, fix terms |
| Modify | `src/landing/sections/FAQ.jsx` | New questions with correct terms |
| Modify | `src/landing/sections/AnnouncementBar.jsx` | Default message with real price from getPagePrice() |
| Modify | `src/landing/sections/CollectionCards.jsx` | Transform into ThemeCards (4 themes + emotional text + price) |
| Create | `src/landing/sections/FloatingCTA.jsx` | Sticky bottom CTA for mobile |
| Modify | `src/landing/LandingPage.jsx` | New section order, remove WhyChoose/ProductQuiz/DesignService |

---

## Task 1: Fix TrustStrip — correct false data

**Files:**
- Modify: `src/landing/sections/TrustStrip.jsx:5-49`

- [ ] **Step 1: Update items array to 3 badges with correct data**

Replace the entire `items` array in TrustStrip:

```jsx
const items = [
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="3" width="15" height="13" rx="2" ry="2" />
          <polyline points="16 8 20 8 23 11 23 16 20 16 16 16 16 8" />
          <circle cx="5.5" cy="18.5" r="2.5" />
          <circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      title: 'LIVRARE ÎN TOATĂ MOLDOVA',
      desc: 'Primești albumul acasă',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      title: 'HÂRTIE FOTOGRAFICĂ PREMIUM',
      desc: 'Culori vii, rezistente în timp',
    },
    {
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
      title: '2000+ ALBUME TIPĂRITE',
      desc: 'Rating 4.9 pe Google',
    },
  ];
```

- [ ] **Step 2: Update desktop grid to 3 columns**

In the desktop grid section, change `md:grid-cols-4` to `md:grid-cols-3`:

```jsx
<AnimatedSection stagger staggerDelay={0.12} className="grid md:grid-cols-3 gap-4">
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Check: TrustStrip shows 3 badges, "2000+ ALBUME TIPĂRITE", no "DESIGN GRATUIT"

- [ ] **Step 4: Commit**

```bash
git add src/landing/sections/TrustStrip.jsx
git commit -m "fix: TrustStrip — 2000+ albume, remove design gratuit, 3 badges"
```

---

## Task 2: Fix HeroSplit — correct sub-text badges

**Files:**
- Modify: `src/landing/sections/HeroSplit.jsx:129-136` (mobile) and `src/landing/sections/HeroSplit.jsx:193-203` (desktop)

- [ ] **Step 1: Fix mobile sub-text badges**

Find this block (around line 129-136):
```jsx
<div className="flex items-center justify-center gap-2 mt-2 text-[9px]"
  style={{ color: slide.textColor ? slide.textColor + 'AA' : '#857D74' }}>
  <span>✓ Design gratuit</span>
  <span>·</span>
  <span>✓ Garanție 100%</span>
  <span>·</span>
  <span>✓ Livrare 7 zile</span>
</div>
```

Replace with:
```jsx
<div className="flex items-center justify-center gap-2 mt-2 text-[9px]"
  style={{ color: slide.textColor ? slide.textColor + 'AA' : '#857D74' }}>
  <span>✓ Aranjare automată</span>
  <span>·</span>
  <span>✓ Design inclus</span>
  <span>·</span>
  <span>✓ 2000+ albume tipărite</span>
</div>
```

- [ ] **Step 2: Fix desktop sub-text badges**

Find this block (around line 193-203):
```jsx
{['Design gratuit', 'Garanție 100%', 'Livrare în toată Moldova'].map(t => (
```

Replace with:
```jsx
{['Aranjare automată', 'Design inclus', '2000+ albume tipărite'].map(t => (
```

- [ ] **Step 3: Verify in browser**

Check both mobile (resize to 390px) and desktop views. Sub-text should show new badges.

- [ ] **Step 4: Commit**

```bash
git add src/landing/sections/HeroSplit.jsx
git commit -m "fix: HeroSplit — remove false 'Livrare 7 zile', add correct badges"
```

---

## Task 3: Rewrite HowItWorks — 3 steps, absorb DesignService

**Files:**
- Modify: `src/landing/sections/HowItWorks.jsx:30-59` (steps array) and `src/landing/sections/HowItWorks.jsx:110-168` (template)

- [ ] **Step 1: Replace steps array with 3 steps**

Find the `steps` array (line 30):
```jsx
const steps = [
  {
    id: 'step1',
    num: '01',
    title: 'Alege albumul',
    desc: 'Selectează formatul și designul care ți se potrivește. Ai peste 50 de template-uri gata făcute.',
    image: '/images/nunta.webp',
  },
  // ... 3 more
];
```

Replace with:
```jsx
const steps = [
  {
    id: 'step1',
    num: '01',
    title: 'Încarci pozele',
    desc: 'Din telefon, WhatsApp, de la fotograf. Chiar și 3000 de poze — fără limită.',
    image: '/images/newborn.webp',
  },
  {
    id: 'step2',
    num: '02',
    title: 'Noi le aranjăm',
    desc: 'Editorul distribuie pozele automat pe pagini. Detectează fețele, alege layout-uri. Echipa verifică gratis — tu doar aprobi.',
    image: '/images/familie.webp',
  },
  {
    id: 'step3',
    num: '03',
    title: 'Primești albumul acasă',
    desc: 'Confirmi macheta, achiti. În 18 zile lucrătoare de la aprobare — albumul e la ușa ta.',
    image: '/images/nunta.webp',
  },
];
```

- [ ] **Step 2: Update heading and subtitle**

Find (line ~112):
```jsx
<AnimatedHeading className="text-[18px] sm:text-[28px] md:text-[36px] lg:text-[42px] text-[#1c1c1c] sm:text-center mb-1 sm:mb-3 px-1" style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>
  Cum funcționează
</AnimatedHeading>
```

Keep heading, but find the desktop subtitle (line ~137):
```jsx
<p className="text-[16px] text-[#888] text-center mb-8 md:mb-12 max-w-lg mx-auto">
  Cel mai simplu editor de albume foto din Moldova.
</p>
```

Replace with:
```jsx
<p className="text-[16px] text-[#888] text-center mb-8 md:mb-12 max-w-lg mx-auto">
  Încarci pozele. Noi facem restul. Tu doar aprobi.
</p>
```

- [ ] **Step 3: Verify in browser**

Check: 3 steps visible (not 4), correct text, mobile carousel shows 3 cards.

- [ ] **Step 4: Commit**

```bash
git add src/landing/sections/HowItWorks.jsx
git commit -m "feat: HowItWorks — reduce to 3 steps, absorb DesignService, fix terms"
```

---

## Task 4: Rewrite FAQ — new questions with correct terms

**Files:**
- Modify: `src/landing/sections/FAQ.jsx:5-33`

- [ ] **Step 1: Replace faqs array**

Find the `faqs` array (line 5):
```jsx
const faqs = [
  {
    q: 'Cum comand un album?',
    // ...
```

Replace with:
```jsx
const faqs = [
  {
    q: 'Am prea multe poze (3000+). Ce fac?',
    a: 'Perfect. Încarci toate — editorul le distribuie automat pe pagini. Nu trebuie să selectezi tu. Echipa noastră verifică și ajustează gratis.',
  },
  {
    q: 'Cât durează până primesc albumul?',
    a: '18 zile lucrătoare din momentul în care aprobi macheta și achiti. Termenul începe DUPĂ aprobarea ta finală — nu înainte.',
  },
  {
    q: 'Cât costă?',
    a: 'Albumele încep de la 85 MDL (pagini subțiri, 20×20) sau 100 MDL (pagini groase, 20×20). Prețul include aranjarea pozelor. Prețul final depinde de format și pagini — îl vezi înainte de comandă.',
  },
  {
    q: 'Pozele de pe telefon ies bine la tipar?',
    a: 'Da. Telefoanele moderne fac poze excelente pentru tipar. Verificăm fiecare imagine înainte de producție.',
  },
  {
    q: 'Ce se întâmplă dacă încep și nu termin?',
    a: 'Proiectul se salvează automat. Revii oricând — peste o oră sau o săptămână.',
  },
  {
    q: 'Pot vedea albumul înainte de tipar?',
    a: 'Da. Primești preview digital complet. Ceri modificări până ești mulțumit. Termenul de 18 zile începe doar după aprobarea ta finală.',
  },
];
```

- [ ] **Step 2: Verify in browser**

Check: 6 questions, accordion works, terms correct.

- [ ] **Step 3: Commit**

```bash
git add src/landing/sections/FAQ.jsx
git commit -m "fix: FAQ — new questions with correct terms (18 zile, prices, prea multe poze)"
```

---

## Task 5: Fix AnnouncementBar — default message with real price

**Files:**
- Modify: `src/landing/sections/AnnouncementBar.jsx:1-2` (add import) and `src/landing/sections/AnnouncementBar.jsx:36` (default message)

- [ ] **Step 1: Add pricing import**

At the top of the file, after existing imports, add:
```jsx
import { getPagePrice } from '../../utils/pricing';
```

- [ ] **Step 2: Replace default message with dynamic price**

Find (line ~36):
```jsx
: '📸 Transformă pozele din telefon într-un album foto premium — Design gratuit inclus';
```

Replace with:
```jsx
: `📸 Album foto de la ${getPagePrice('20×20', 32, 'pagini-subtiri')} MDL · Încarci pozele, noi aranjăm · Livrare în toată Moldova`;
```

- [ ] **Step 3: Verify in browser**

Check: When no offers active, bar shows "Album foto de la 85 MDL · ..."

- [ ] **Step 4: Commit**

```bash
git add src/landing/sections/AnnouncementBar.jsx
git commit -m "fix: AnnouncementBar — dynamic min price from getPagePrice(), not hardcoded"
```

---

## Task 6: Transform CollectionCards into ThemeCards

**Files:**
- Modify: `src/landing/sections/CollectionCards.jsx:6-13` (defaultCollections) and mobile/desktop card components

- [ ] **Step 1: Add pricing import**

At the top, after existing imports:
```jsx
import { getPagePrice } from '../../utils/pricing';
```

- [ ] **Step 2: Replace defaultCollections with 4 themes**

Find `const defaultCollections` (line 6):
```jsx
const defaultCollections = [
  { id: 'nunti', title: 'Nuntă', titleFull: 'Albume de Nuntă', emoji: '💒', image: '/images/nunta.webp', link: '/colectie/nunti' },
  // ... 5 more
];
```

Replace with:
```jsx
const defaultCollections = [
  {
    id: 'bunici',
    title: 'Bunici',
    titleFull: 'Album pentru bunici',
    image: '/images/familie.webp',
    link: '/colectie/familie',
    emotionalText: 'Bunicii nu au Instagram. Dar au un raft gol unde ar încăpea un album.',
    minPrice: getPagePrice('20×20', 20, 'pagini-groase'),
  },
  {
    id: 'copii',
    title: 'Familie',
    titleFull: 'Album de familie',
    image: '/images/newborn.webp',
    link: '/colectie/copii',
    emotionalText: 'Copiii cresc în fiecare zi. Pozele rămân în telefon.',
    minPrice: getPagePrice('20×20', 20, 'pagini-groase'),
  },
  {
    id: 'nunti',
    title: 'Nuntă',
    titleFull: 'Album de nuntă',
    image: '/images/nunta.webp',
    link: '/colectie/nunti',
    emotionalText: '2000 de poze de la nuntă. Câte le-ai mai răsfoit?',
    minPrice: getPagePrice('20×20', 20, 'pagini-groase'),
  },
  {
    id: 'telefon',
    title: 'Din telefon',
    titleFull: 'Album din poze proprii',
    image: '/images/familie.webp',
    link: '/colectie/toate',
    emotionalText: 'Pozele din telefon sunt perfecte pentru un album. Serios.',
    minPrice: getPagePrice('20×20', 32, 'pagini-subtiri'),
  },
];
```

- [ ] **Step 3: Add emotional text + price to MobileCard**

Find in MobileCard component, the title section (around line 276-282):
```jsx
{/* Titlu + buton sub mască */}
<div className="mt-2.5 px-1">
  <h3 className="text-[13px] text-[#1c1c1c] leading-snug"
    style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
    {titleText}
  </h3>
</div>
```

Replace with:
```jsx
{/* Titlu + text emoțional + preț */}
<div className="mt-2.5 px-1">
  <h3 className="text-[13px] text-[#1c1c1c] leading-snug"
    style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
    {titleText}
  </h3>
  {col.emotionalText && (
    <p className="text-[11px] text-[#8A8078] leading-snug mt-0.5">{cardData?.emotionalText || col.emotionalText}</p>
  )}
  {col.minPrice > 0 && (
    <p className="text-[12px] text-[#3D6B5E] font-semibold mt-1">de la {col.minPrice} MDL</p>
  )}
</div>
```

- [ ] **Step 4: Add emotional text + price to desktop CollectionCard**

Find in CollectionCard, the title section (around line 171-186):
```jsx
{/* Titlu + buton sub mască */}
<div className="mt-3">
  {editMode ? (
    // ... editable title
  ) : (
    <h3 className="text-[15px] md:text-[17px] text-[#1c1c1c] leading-snug"
      style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 600 }}>
      {titleText}
    </h3>
  )}
</div>
```

After the closing `</div>` of the title block (after the editMode ternary), add:
```jsx
{!editMode && col.emotionalText && (
  <p className="text-[12px] text-[#8A8078] leading-relaxed mt-1">{cardData?.emotionalText || col.emotionalText}</p>
)}
{col.minPrice > 0 && (
  <p className="text-[13px] text-[#3D6B5E] font-semibold mt-1.5">de la {col.minPrice} MDL</p>
)}
```

- [ ] **Step 5: Remove the activeCollections filter**

In the main `CollectionCards` component useEffect, find (around line 296-303):
```jsx
// Filter by active collections from admin settings
import('../../components/admin/AdminCollections').then(({ getActiveCollections }) => {
  getActiveCollections().then(active => {
    if (!active) return; // no settings = show all
    const filtered = defaultCollections.filter(c => active[c.id]);
    if (filtered.length > 0) setVisibleCollections(filtered);
  });
}).catch(() => {});
```

Remove this entire block — we always show 4 fixed themes.

- [ ] **Step 6: Verify in browser**

Check: 4 cards (bunici, copii, nuntă, telefon), emotional text visible, prices visible, grid 2×2 on mobile, 4 col on desktop.

- [ ] **Step 7: Commit**

```bash
git add src/landing/sections/CollectionCards.jsx
git commit -m "feat: ThemeCards — 4 emotional themes with dynamic prices from getPagePrice()"
```

---

## Task 7: Create FloatingCTA

**Files:**
- Create: `src/landing/sections/FloatingCTA.jsx`

- [ ] **Step 1: Create the component**

```jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActiveOffers, getActiveOffersAsync } from '../../utils/offers';
import { getPagePrice } from '../../utils/pricing';

export default function FloatingCTA() {
  const [visible, setVisible] = useState(false);
  const [offers, setOffers] = useState(getActiveOffers());

  useEffect(() => {
    getActiveOffersAsync().then(setOffers);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const viewportHeight = window.innerHeight;

      // Show after scrolling past Hero
      const pastHero = scrollY > viewportHeight * 0.8;

      // Hide when offers section is in view
      const offersEl = document.getElementById('oferte');
      let inOffers = false;
      if (offersEl) {
        const rect = offersEl.getBoundingClientRect();
        inOffers = rect.top < viewportHeight && rect.bottom > 0;
      }

      setVisible(pastHero && !inOffers);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bestOffer = offers.length > 0 ? offers[0] : null;
  const minPrice = getPagePrice('20×20', 32, 'pagini-subtiri');
  const label = bestOffer
    ? `Începe albumul — ${bestOffer.newPrice} MDL`
    : `Începe albumul — de la ${minPrice} MDL`;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 sm:hidden transition-transform duration-300 ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="px-4 pb-4 pt-2">
        <Link
          to="/colectie/toate"
          className="flex items-center justify-center w-full h-[52px] rounded-full bg-[#3D6B5E] text-white text-[14px] font-semibold no-underline active:scale-[0.97] transition-all shadow-lg"
          style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}
        >
          {label}
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify in browser**

Resize to mobile (390px). Scroll past hero → CTA appears. Scroll to offers section → CTA hides.

- [ ] **Step 3: Commit**

```bash
git add src/landing/sections/FloatingCTA.jsx
git commit -m "feat: FloatingCTA — sticky bottom mobile CTA with dynamic price"
```

---

## Task 8: Restructure LandingPage — new section order

**Files:**
- Modify: `src/landing/LandingPage.jsx:1-340`

- [ ] **Step 1: Update imports — remove unused, keep needed**

Find the imports section (lines 1-32). Replace with:
```jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AppHeader from '../components/layout/AppHeader';
import useAuthStore from '../stores/useAuthStore';
import { usePageMeta } from '../utils/seo';

// Sections
import AnnouncementBar from './sections/AnnouncementBar';
import HeroSplit from './sections/HeroSplit';
import CollectionCards from './sections/CollectionCards';
import AlbumCarousel from './sections/AlbumCarousel';
import HotOffers from './sections/HotOffers';
import HowItWorks from './sections/HowItWorks';
import TrustStrip from './sections/TrustStrip';
import FAQ from './sections/FAQ';
import FloatingCTA from './sections/FloatingCTA';
import ScrollToTop from '../components/shared/ScrollToTop';
```

Removed imports: `CountdownStrip`, `ProductShowcase`, `EditorShowcase`, `EmotionalHook`, `QualitySection`, `Testimonials`, `FinalCTA`, `NewsletterSection`, `ThreeWays`, `FourSteps`, `WhyChoose`, `ProductQuizCard`, `DesignService`, `AnimatedHeading`, `BrandStory`, `CollectionCards` (no — keep this one).

- [ ] **Step 2: Replace the return JSX with new section order**

Find the return statement (line ~254). Replace the `<main>` block content with:

```jsx
return (
    <div className="min-h-screen bg-bg pb-16 sm:pb-0 snap-landing">
      {/* 1. Announcement Bar — preț vizibil instant */}
      <AnnouncementBar />

      <main id="main-content">
      {/* Unfinished project banner */}
      <UnfinishedProjectBanner />

      {/* 2. Hero — emoție + USP + CTA */}
      <HeroSplit />

      {/* 3. ThemeCards — 4 teme emoționale cu preț */}
      <section className="py-5 sm:py-16 md:py-20 bg-white">
        <div className="max-w-[1360px] mx-auto px-4 md:px-12">
          <CollectionCards />
        </div>
      </section>

      {/* 4. HowItWorks — 3 pași (include "noi aranjăm") */}
      <section id="cum-functioneaza" className="py-5 sm:py-16 md:py-20 bg-[#F9F8F6]">
        <div className="max-w-[1360px] mx-auto px-4 md:px-12">
          <HowItWorks />
        </div>
      </section>

      {/* 5. Oferte cu countdown */}
      <section className="py-5 sm:py-12 md:py-16" style={{ backgroundColor: '#FBF0EE' }}>
        <HotOffers />
      </section>

      {/* 6. Albume reale — dovadă vizuală */}
      <AlbumCarousel />

      {/* 7. Trust + FAQ — combinate */}
      <TrustStrip />
      <FAQ />

      {/* Admin Login (discrete) */}
      <AdminLoginButton />

      </main>

      {/* Floating CTA — sticky bottom mobile */}
      <FloatingCTA />

      <ScrollToTop />
    </div>
  );
```

- [ ] **Step 3: Verify in browser**

Check full page flow on mobile (390px):
1. AnnouncementBar sticky with price ✓
2. Hero with correct badges ✓
3. 4 theme cards with emotional text + price ✓
4. 3-step HowItWorks ✓
5. HotOffers ✓
6. AlbumCarousel ✓
7. TrustStrip + FAQ ✓
8. FloatingCTA appears/hides ✓

Check desktop (1280px+) — same order, responsive layouts.

- [ ] **Step 4: Commit**

```bash
git add src/landing/LandingPage.jsx
git commit -m "feat: restructure landing page — 8 sections, remove redundant WhyChoose/Quiz/DesignService"
```

---

## Task 9: Final verification and cleanup

- [ ] **Step 1: Check for unused imports across all files**

Run:
```bash
npx eslint src/landing/ --quiet 2>&1 | head -30
```

Fix any unused import warnings.

- [ ] **Step 2: Full mobile walkthrough**

Open `http://localhost:3000` in Chrome DevTools mobile view (iPhone SE 375px):
- AnnouncementBar: shows price, not "Design gratuit inclus"
- Hero: shows "Aranjare automată · Design inclus · 2000+ albume"
- ThemeCards: 4 cards, 2×2 grid, prices visible
- HowItWorks: 3 steps, not 4
- HotOffers: prices, countdown
- AlbumCarousel: works
- TrustStrip: 3 badges, "2000+"
- FAQ: 6 questions, correct terms
- FloatingCTA: appears after hero, hides on offers
- NO "Livrare 7 zile" anywhere
- NO "3-5 zile" anywhere
- NO "320+ familii" anywhere

- [ ] **Step 3: Desktop walkthrough**

Same checks at 1280px width. FloatingCTA hidden on desktop.

- [ ] **Step 4: Final commit if any fixes**

```bash
git add -A
git commit -m "fix: cleanup unused imports and final landing page adjustments"
```
