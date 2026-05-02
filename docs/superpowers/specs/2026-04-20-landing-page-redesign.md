# Spec: Landing Page Redesign — Mobile-First, Conversie

**Data:** 2026-04-20
**Scop:** Restructurare landing page pentru a converti vizitatorii din ads (99% mobil) în clienți care încep un album.

---

## Problemele actuale

1. **Termene false pe tot site-ul** — "livrare 7 zile", "3-5 zile", "7-14 zile" → realitatea: 18 zile lucrătoare din aprobarea machetei
2. **TrustStrip** zice "320+ familii" → realitatea: 2000+ albume tipărite
3. **Secțiuni redundante** — WhyChoose repetă TrustStrip; ProductQuiz e prea complex pentru mobil
4. **Hero texte** — nu pun clientul "la zid", nu comunică USP-ul principal
5. **HowItWorks la poziția 8** — 95% din vizitatorii mobili nu ajung acolo; conceptul de editor online e nou în MD
6. **DesignService (USP principal) la poziția 7** — "noi facem albumul" trebuie comunicat în primele 3-4 ecrane
7. **4 pași în HowItWorks** — companiile de succes (Shutterfly, Chatbooks) au exact 3; 4 sună ca muncă

---

## USP-ul central (mesajul #1)

> "Încarci pozele → editorul le aranjează instant → echipa verifică gratis → primești albumul acasă"

Clienta (mamă ocupată, 28-38 ani) trebuie să înțeleagă:
- NU trebuie să selecteze din 3000 de poze
- NU trebuie să aranjeze nimic manual
- Toată "munca" o face editorul automat + echipa gratuit
- Ea doar aprobă și achită

---

## Prețuri reale (din cod — src/utils/pricing.js)

| Produs | Format min | Pagini min | Preț minim |
|--------|-----------|-----------|------------|
| Pagini Subțiri | 20×20 | 32 pag | **85 MDL** |
| Pagini Groase | 20×20 | 20 pag | **100 MDL** |
| Design service | — | — | **49 MDL** (opțional, dar prezentat ca "inclus în preț") |

**Notă:** Prețurile pot fi suprascrise din admin (Firestore `settings/pricing`). Valorile de pe landing trebuie să reflecte prețurile reale din sistem, nu cifre inventate. Verifică `getPagePrice()` pentru prețul corect înainte de hardcodare.

---

## Structura nouă a Landing Page-ului

### Flow psihologic: Emoție → Ce poți face → Cât de ușor e → Cât costă → Dovadă → Întrebări → Start

### Ordinea secțiunilor (8 active):

```
1. AnnouncementBar (sticky)  — preț vizibil instant
2. HeroSplit                 — UN mesaj: "Încarci pozele. Noi facem albumul."
3. ThemeCards (NOU)          — 4 teme emoționale + preț pe fiecare
4. HowItWorks (3 pași)       — Încarci → Aranjăm → Primești (absoarbe DesignService)
5. HotOffers                 — oferta concretă cu preț și countdown
6. AlbumCarousel             — albume reale (dovadă vizuală)
7. TrustStrip + FAQ          — combinate într-o singură secțiune
8. FloatingCTA (NOU)         — sticky bottom mobile
   Footer (din RootLayout)
```

### Ce se ELIMINĂ:
- `WhyChoose` — redundant cu TrustStrip
- `ProductQuiz` — nimeni nu face quiz pe mobil din ad
- `DesignService` ca secțiune separată — contopit în HowItWorks pasul 2

### Motivare ordine (bazat pe research — Shutterfly, Mixbook, Chatbooks, CEWE):
- **ThemeCards la poz 3:** Clientul trebuie să vadă "ce pot face" imediat după emoție
- **HowItWorks la poz 4:** Conceptul de editor online e NOU în Moldova — clientul trebuie să înțeleagă CUM funcționează înainte să vadă preț/ofertă
- **HotOffers la poz 5:** Prețul concret vine DUPĂ ce înțelege procesul (dar prețul minim e deja vizibil în AnnouncementBar + ThemeCards)
- **AlbumCarousel la poz 6:** Dovada vizuală vine după ce e deja convins pe proces
- **TrustStrip + FAQ combinate:** Economisim 1 ecran de scroll, ambele elimină obiecții

---

## Secțiune NOUĂ: ThemeCards (poziția 3, după Hero)

### Concept
4 carduri tematice plasate IMEDIAT după Hero. Fiecare card răspunde la o întrebare din capul clientului și îl motivează emoțional.

### Scop psihologic
Clientul vine din ad și se întreabă: "Dar eu pot? Cu pozele mele? Din telefon?" Aceste 4 carduri îi răspund instant, înainte să apuce să scrolleze mai departe.

### Cele 4 teme (fixe):

| # | Temă | Întrebarea din capul clientului | Headline pe card | Subtext emoțional | Link |
|---|------|------|------|------|------|
| 1 | **Bunici** | "Oare bunicii ar aprecia?" | Album pentru bunici | "Bunicii nu au Instagram. Dar au un raft gol unde ar încăpea un album." | `/colectie/familie` |
| 2 | **Copii / Familie** | "Am poze cu copiii doar pe telefon" | Album de familie | "Copiii cresc în fiecare zi. Pozele rămân în telefon." | `/colectie/copii` |
| 3 | **Nuntă** | "Am 2000 poze de la fotograf, ce fac?" | Album de nuntă | "2000 de poze de la nuntă. Câte le-ai mai răsfoit?" | `/colectie/nunti` |
| 4 | **Poze din telefon** | "Dar pozele din telefon ies bine?" | Album din poze proprii | "Pozele din telefon sunt perfecte pentru un album. Serios." | `/colectie/toate` |

### Layout mobil (390px)
Grid 2×2 — toate 4 vizibile pe un ecran, fără scroll:
```
┌──────────┐ ┌──────────┐
│  [foto]  │ │  [foto]  │
│  Bunici  │ │  Copii   │
│ text mic │ │ text mic │
│ de la X  │ │ de la X  │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│  [foto]  │ │  [foto]  │
│  Nuntă   │ │ Telefon  │
│ text mic │ │ text mic │
│ de la X  │ │ de la X  │
└──────────┘ └──────────┘
```

### Layout desktop
Grid 4 coloane pe un rând (ca în screenshot-ul de referință).

### Structura cardului
- **Imagine:** Poză reală de album tipărit (din admin CMS, editabilă)
- **Badge opțional:** "Cel mai popular", "Nou" (pe primele 1-2)
- **Titlu:** Numele temei (bold, 14px mobil)
- **Subtext emoțional:** 1-2 rânduri provocator-prietenos (12px, culoare secondary)
- **Preț:** "de la X MDL" — calculat dinamic cu `getPagePrice()` pentru cea mai ieftină configurație
- **CTA:** Link la colecția respectivă (tap pe tot cardul)

### Implementare
Bazat pe componenta existentă `CollectionCards.jsx` care deja are:
- CMS admin (upload imagine, zoom, drag, titlu editabil)
- Layout mobil (grid 2 coloane) + desktop (grid 4 coloane)
- Firestore storage (`homepage_images`)

**Modificări necesare:**
1. Schimbă cele 6 colecții default → 4 teme fixe (bunici, copii, nuntă, telefon)
2. Adaugă câmpul `emotionalText` pe fiecare card (hardcoded default + editabil din admin)
3. Adaugă prețul dinamic "de la X MDL" sub titlu (calculat cu `getPagePrice()`)
4. Textul emoțional editabil din admin (Firestore `homepage_images/{id}.emotionalText`)

---

## Modificări per secțiune

### 1. AnnouncementBar — PĂSTRAT, mic fix

**Stare actuală:** Funcționează bine, citește oferte din Firestore.
**Corecție:** Dacă nu e ofertă activă, mesajul default e:
```
📸 Transformă pozele din telefon într-un album foto premium — Design gratuit inclus
```
→ Schimbare: pune prețul real din `getPagePrice()`:
```
📸 Album foto de la 85 MDL · Încarci pozele, noi aranjăm · Livrare în toată Moldova
```
**Notă:** 85 MDL = pagini subțiri 20×20, 32 pagini (cel mai ieftin). Dacă prețurile sunt actualizate din admin (`settings/pricing`), bar-ul trebuie să reflecte prețul minim real.
**Motivare:** Clientul vrea preț imediat. "Design gratuit" fără context sună ca capcană.

---

### 2. HeroSplit — RESCRIE TEXTE SUB CTA

**Stare actuală:** Slider cu texte din Firestore admin. Funcțional bine.

**Corecții obligatorii pe sub-text (hardcoded în componentă):**

Actual (mobil):
```
✓ Design gratuit · ✓ Garanție 100% · ✓ Livrare 7 zile
```
Actual (desktop):
```
Design gratuit · Garanție 100% · Livrare în toată Moldova
```

Corect (ambele):
```
✓ Aranjare automată · ✓ Design inclus · ✓ 2000+ albume tipărite
```

**De ce:** "Livrare 7 zile" e FALS. "Aranjare automată" comunică magia editorului. "2000+" e social proof real.

**Recomandare pentru textele slide-urilor (admin):**

Slide 1 (principal):
- Title: `Pozele din telefon merită un album`
- Subtitle: `Încarci pozele. Editorul le aranjează instant. Echipa verifică gratis.`
- CTA: `ÎNCEPE ALBUMUL`

Slide 2 (emoțional):
- Title: `Copiii cresc. Pozele rămân în telefon.`
- Subtitle: `Fă-le un album pe care să-l răsfoiască peste 20 de ani.`
- CTA: `CREEAZĂ ALBUMUL`

Slide 3 (practic):
- Title: `Ai 3000 de poze? Perfect.`
- Subtitle: `Editorul nostru le aranjează automat. Tu doar aprobi.`
- CTA: `ÎNCEPE ACUM`

**Notă:** Textele se pun din admin (Firestore `settings/hero_slides`). Spec-ul doar recomandă.

---

### 3. HowItWorks — REDUCE LA 3 PAȘI + ABSOARBE DesignService

**Stare actuală:** 4 pași cu termene false + DesignService e secțiune separată mai jos.

**Schimbare fundamentală:**
- Reduce de la 4 pași la **3 pași** (companiile de succes au 3)
- Pasul 2 absoarbe mesajul DesignService ("noi aranjăm")
- Subtitlul comunică USP-ul "done for you"

**Cei 3 pași noi:**

| # | Titlu | Descriere |
|---|-------|-----------|
| 01 | **Încarci pozele** | Din telefon, WhatsApp, de la fotograf. Chiar și 3000 de poze — fără limită. |
| 02 | **Noi le aranjăm** | Editorul distribuie pozele automat pe pagini. Detectează fețele, alege layout-uri. Echipa verifică gratis — tu doar aprobi. |
| 03 | **Primești albumul acasă** | Confirmi macheta, achiti. În 18 zile lucrătoare de la aprobare — albumul e la ușa ta. |

**Heading:** `Cum funcționează`
**Subtitlu NOU:** `Încarci pozele. Noi facem restul. Tu doar aprobi.`

**De ce pasul 2 absoarbe DesignService:**
- DesignService ca secțiune separată spune același lucru: "noi aranjăm pozele"
- Două secțiuni cu același mesaj = redundanță
- Într-un singur pas e mai puternic: "Noi le aranjăm" = clar, direct, fără dubiu

**Notă despre imagini:** Imaginile celor 3 pași se schimbă din admin (Firestore `homepage_howitworks`). Recomandare:
- Pas 1: Screenshot telefon cu upload în progres
- Pas 2: Screenshot editor cu poze aranjate automat
- Pas 3: Poză album real împachetat / livrat

---

### 4. HotOffers — PĂSTRAT, fără modificări

Funcționează excelent. Carduri cu:
- Imagine ofertă (swipe dacă mai multe)
- Badge discount + economie
- Preț vechi → preț nou
- Countdown cu deadline real
- CTA "Comandă acum"

Singura sugestie: asigură-te că există MEREU cel puțin 1 ofertă activă în admin.

---

### 5. AlbumCarousel — PĂSTRAT, fără modificări

Funcționează bine. Afișează coverte din colecția "family" din Firestore.
Fără schimbări necesare.

---

### 6. TrustStrip + FAQ — COMBINATE într-o singură secțiune

**Stare actuală:** Două secțiuni separate, ocupă 2 ecrane pe mobil.

**Schimbare:** Le combinăm vizual:
- TrustStrip (3 badge-uri) sus
- FAQ (accordion) imediat dedesubt
- Zero spațiu între ele — arată ca o singură secțiune

#### TrustStrip — CORECTARE DATE (3 badge-uri, nu 4)

| Actual | Corect |
|--------|--------|
| `DESIGN GRATUIT — Noi aranjăm pozele pentru tine` | **ELIMINAT** (redundant cu HowItWorks pasul 2) |
| `320+ FAMILII MULȚUMITE — Rating 4.9` | `2000+ ALBUME TIPĂRITE — Rating 4.9 pe Google` |
| `LIVRARE ÎN TOATĂ MOLDOVA` ✅ | Rămâne |
| `HÂRTIE FOTOGRAFICĂ PREMIUM` ✅ | Rămâne |

3 badge-uri = mai compact pe mobil, fiecare vizibil fără scroll.

#### FAQ — RESCRIE ÎNTREBĂRI

**Întrebări noi (înlocuiesc complet):**

```
Q: Am prea multe poze (3000+). Ce fac?
A: Perfect. Încarci toate — editorul le distribuie automat pe pagini.
   Nu trebuie să selectezi tu. Echipa noastră verifică și ajustează gratis.

Q: Cât durează până primesc albumul?
A: 18 zile lucrătoare din momentul în care aprobi macheta și achiti.
   Termenul începe DUPĂ aprobarea ta finală — nu înainte.

Q: Cât costă?
A: Albumele încep de la 85 MDL (pagini subțiri, 20×20) sau 100 MDL (pagini groase, 20×20).
   Prețul include aranjarea pozelor de către echipa noastră.
   Prețul final depinde de format și număr de pagini — îl vezi înainte de comandă.

Q: Pozele de pe telefon ies bine la tipar?
A: Da. Telefoanele moderne fac poze excelente pentru tipar.
   Verificăm fiecare imagine înainte de producție.

Q: Ce se întâmplă dacă încep și nu termin?
A: Proiectul se salvează automat. Revii oricând — peste o oră sau o săptămână.

Q: Pot vedea albumul înainte de tipar?
A: Da. Primești preview digital complet. Ceri modificări până ești mulțumit.
   Termenul de 18 zile începe doar după aprobarea ta finală.
```

---

## Secțiuni ELIMINATE

### WhyChoose — ELIMINAT
**Motiv:** Repetă exact ce zice TrustStrip (livrare, hârtie, design). Pe mobil ocupă un ecran complet fără valoare adăugată.

### ProductQuiz — ELIMINAT
**Motiv:** Pe mobil din ad, nimeni nu completează 4 întrebări. Clientul vrea preț + ofertă + buton de start, nu quiz. Dacă are nevoie de ajutor — scrie pe WhatsApp/Instagram.

### DesignService — ELIMINAT ca secțiune separată
**Motiv:** Mesajul "noi aranjăm pozele" e absorbit în HowItWorks pasul 2. Nu două secțiuni care spun același lucru.

---

## Floating CTA (NOU)

**Component nou:** `FloatingCTA.jsx`

- Apare după scroll > 100vh (după Hero)
- Sticky bottom, 56px height
- Text: `Începe albumul` (sau `Începe albumul — X MDL` dacă e ofertă activă)
- Fundal: `#3D6B5E` (verdele brandului), text alb
- Border-radius: pill (28px)
- Margin: 16px lateral, 16px bottom + `env(safe-area-inset-bottom)` pentru iPhone
- Dispare când viewport-ul include `#oferte` (HotOffers are deja CTA)
- **Doar pe mobil** (`sm:hidden`)
- z-index: 40 (sub modals, deasupra conținutului)

---

## LandingPage.jsx — structura finală

```jsx
<AnnouncementBar />
<UnfinishedProjectBanner />
<HeroSplit />

{/* Secțiunea 3: Ce poți face — 4 teme emoționale */}
<ThemeCards />

{/* Secțiunea 4: Cât de ușor e — 3 pași (include "noi aranjăm") */}
<HowItWorks />

{/* Secțiunea 5: Oferta concretă */}
<HotOffers />

{/* Secțiunea 6: Dovadă vizuală */}
<AlbumCarousel />

{/* Secțiunea 7: Elimină obiecții */}
<TrustStrip />
<FAQ />

{/* Sticky CTA bottom mobile */}
<FloatingCTA />

<AdminLoginButton />
```

---

## Comunicarea termenelor — REGULA DE AUR

Oriunde pe site apare termenul de livrare, trebuie formulat EXACT așa:

> **18 zile lucrătoare din momentul aprobării machetei**

NU "18 zile lucrătoare" singur (clientul calculează din azi).
NU "livrare în 18 zile" (confuzie producție vs livrare).
NU "3-5 zile" / "7 zile" / "14 zile" (FALS).

**Formula completă corectă:**
> Producție: 18 zile lucrătoare din aprobare · Livrare: 1 zi

---

## Implementare — Ordinea pașilor

1. Rescrie `CollectionCards.jsx` → ThemeCards — 4 teme cu text emoțional + preț dinamic din `getPagePrice()`
2. Rescrie `HowItWorks.jsx` — 3 pași (nu 4), pasul 2 absoarbe DesignService, termene corecte
3. Corectează `TrustStrip.jsx` — 3 badge-uri (nu 4), "2000+ albume", scoate "design gratuit"
4. Corectează `HeroSplit.jsx` — sub-text "Livrare 7 zile" → badge-uri corecte
5. Rescrie `FAQ.jsx` — întrebări noi cu termene corecte + "am prea multe poze"
6. Actualizează `AnnouncementBar.jsx` — mesaj default cu preț real din `getPagePrice()`
7. Elimină `WhyChoose` + `ProductQuiz` + `DesignService` din `LandingPage.jsx`
8. Creează `FloatingCTA.jsx` — buton sticky bottom mobile
9. Actualizează ordinea secțiunilor în `LandingPage.jsx`
10. Testare pe telefon real (iPhone SE = cel mai mic target)

---

## Metrici de validare

După implementare, urmărește în Firestore `funnel`:
- `visit` → `select_product` (câți ajung de la landing la produs)
- `upload_photos` (câți încep upload)
- `order_placed` (câți comandă)

Target: creștere 20%+ pe `visit → select_product` în prima lună.
