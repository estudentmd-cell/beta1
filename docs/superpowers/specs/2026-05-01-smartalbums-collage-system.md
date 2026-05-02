# SmartAlbums-Style Collage System — Design Spec

**Data:** 2026-05-01
**Scop:** Colaje profesionale cu margini, orientare strictă, variații bogate per pattern de orientare

---

## 1. Margine implicită 5%

### Comportament
- Toate spread-urile noi primesc `bounds = { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 }`
- `createSpread()` și `createPage()` setează bounds automat
- Spread-urile restaurate din Firestore fără bounds primesc implicit 0.05
- Vizual: pozele „plutesc" pe fundal, nu ating marginile paginii

### Implementare
- `layoutEngine.js`: `createPage()` returnează `{ ...page, bounds: DEFAULT_BOUNDS }`
- `EditorCanvas.jsx`: `PageFrames` deja suportă `pageBounds` — doar trebuie setat implicit
- `projectRestore.js`: la restaurare, dacă `page.bounds` lipsește → setează DEFAULT_BOUNDS

### Constante
```js
const DEFAULT_BOUNDS = { top: 0.05, right: 0.05, bottom: 0.05, left: 0.05 };
const FULL_BLEED_BOUNDS = { top: 0, right: 0, bottom: 0, left: 0 };
```

---

## 2. Toggle Full Bleed per spread

### UI
- Buton în `EditorTopbar` sau `EditorSidebar`: icon pătrat cu săgeți spre exterior
- Label: „Fără margine" / „Cu margine"
- Acționează pe spread-ul curent
- Stare vizuală: activ = fără margine (evidențiat)

### Comportament
- Click toggle: setează `bounds` pe toate paginile spread-ului curent (full, left, right)
- Full bleed ON → `bounds = { top: 0, right: 0, bottom: 0, left: 0 }`
- Full bleed OFF → `bounds = DEFAULT_BOUNDS`
- Salvat per spread în structura proiectului

### Implementare
- `useEditorStore.js`: acțiune `toggleFullBleed(spreadIdx)`
- Verifică starea curentă: dacă bounds e 0 → setează DEFAULT, altfel → setează 0

---

## 3. Orientare strictă la plasare poze

### Reguli de compatibilitate
| Poză \ Frame | V (portret) | H (landscape) | S (pătrat) |
|---|---|---|---|
| **V (portret)** | ✅ match perfect | ❌ blocat | ✅ OK |
| **H (landscape)** | ❌ blocat | ✅ match perfect | ✅ OK |
| **S (pătrat)** | ✅ OK | ✅ OK | ✅ match perfect |

### Drag-drop vizual
- **Compatibil**: frame evidențiat cyan (ca acum)
- **Incompatibil**: frame evidențiat roșu semi-transparent + icon ⚠️ + text „Orientare greșită"
- **Forțare**: utilizatorul ține **Shift** apăsat → frame-ul devine galben → permite plasarea
- Poza se plasează cu crop centrat pe fața detectată

### Auto-fill / smartBuildTree
- Nu plasează NICIODATĂ V în H sau H în V (scor 0 = exclud complet)
- Dacă nu există match perfect → lasă frame-ul gol mai degrabă decât mismatch
- Pătrat (S) rămâne wildcard, acceptă orice

### Implementare
- `EditorCanvas.jsx` → `FrameView`: la `onDragOver`, verifică orientarea pozei vs frame
- `layoutEngine.js` → `assignPhotos()`: scor 0 = skip complet (nu doar penalizare)
- `useEditorStore.js` → `placePhotoInFrame()`: verifică compatibilitate, respinge dacă incompatibil fără Shift

---

## 4. Separator cu lock de orientare

### Comportament
- La drag separator: calculează AR-ul rezultat al ambelor frame-uri adiacente
- Dacă frame-ul ar trece de pragul de orientare → blochează (clamp)
- Frame V: AR nu poate depăși 0.83 (nu devine pătrat/landscape)
- Frame H: AR nu poate scădea sub 1.2 (nu devine pătrat/portret)
- Frame S: AR rămâne între 0.83–1.2

### Implementare
- `useEditorStore.js` → `updateRatio()`: după calculul noului ratio, verifică AR-urile rezultante
- Folosește `computeRects()` cu noul ratio pentru a obține dimensiunile frame-urilor
- Dacă vreun frame ar schimba clasa → clamp ratio la limita maximă permisă

---

## 5. Sistem de colaje organizat pe pattern de orientare

### Concept
Template-urile sunt organizate pe **pattern de orientare** — combinația sortată de V, H, S:

```
2 poze: VV, VH, HH, VS, HS, SS
3 poze: VVV, VVH, VHH, HHH, VVS, VHS, HHS, VSS, HSS, SSS
4 poze: VVVV, VVVH, VVHH, VHHH, HHHH, + combinații cu S
```

### Structura template-urilor per pattern

Fiecare pattern are **minimum 5 variații vizual distincte**:

#### 1 POZĂ
- `H_1`: landscape full (spread complet)
- `V_1`: portret centrat cu margini laterale mari
- `S_1`: pătrat centrat

#### 2 POZE — Pattern VV (2 portrete)
- `VV_1`: 2 coloane egale 50/50
- `VV_2`: coloană stânga 60%, dreapta 40%
- `VV_3`: coloană stânga 40%, dreapta 60%
- `VV_4`: 2 coloane 55/45 (subtil asimetric)
- `VV_5`: 2 coloane 45/55

#### 2 POZE — Pattern HH (2 landscape)
- `HH_1`: 2 rânduri egale 50/50
- `HH_2`: rând sus 60%, jos 40%
- `HH_3`: rând sus 40%, jos 60%
- `HH_4`: 2 rânduri 55/45
- `HH_5`: 2 rânduri 45/55

#### 2 POZE — Pattern VH (portret + landscape)
- `VH_1`: V stânga 45% + H dreapta (H ocupă toată înălțimea)
- `VH_2`: H sus 55% + V jos (V centrat)
- `VH_3`: V stânga 40% + H dreapta
- `VH_4`: H dreapta + V stânga 50%
- `VH_5`: V dreapta 45% + H stânga

#### 3 POZE — Pattern VVV (3 portrete)
- `VVV_1`: 3 coloane egale
- `VVV_2`: hero V stânga 50% + 2V stacked dreapta
- `VVV_3`: 2V stacked stânga + hero V dreapta 50%
- `VVV_4`: hero V centru 40% + V stânga 30% + V dreapta 30%
- `VVV_5`: V mare stânga 55% + 2V mici stacked dreapta
- `VVV_6`: 2V mici stacked stânga + V mare dreapta 55%

#### 3 POZE — Pattern VVH (2 portrete + 1 landscape)
- `VVH_1`: H sus 55% + 2V jos
- `VVH_2`: 2V sus + H jos 45%
- `VVH_3`: H sus 60% + 2V jos egale
- `VVH_4`: 2V sus egale + H jos 40%
- `VVH_5`: V stânga + V centru + H dreapta (3 coloane, H mai lată)
- `VVH_6`: H stânga (mai lată) + V centru + V dreapta

#### 3 POZE — Pattern VHH (1 portret + 2 landscape)
- `VHH_1`: V stânga 45% + 2H stacked dreapta
- `VHH_2`: 2H stacked stânga + V dreapta 45%
- `VHH_3`: V stânga 55% + 2H stacked dreapta
- `VHH_4`: V stânga 65% + 2H mici stacked dreapta
- `VHH_5`: 2H stacked stânga + V dreapta 55%

#### 3 POZE — Pattern HHH (3 landscape)
- `HHH_1`: 3 rânduri egale
- `HHH_2`: hero H sus 50% + 2H mici jos (coloane)
- `HHH_3`: 2H mici sus (coloane) + hero H jos 50%
- `HHH_4`: H mare sus 60% + 2H jos
- `HHH_5`: 2H sus + H mare jos 60%

#### 4 POZE — Pattern VVVV
- `VVVV_1`: 4 coloane egale
- `VVVV_2`: 2V sus + 2V jos (grid 2×2 portret)
- `VVVV_3`: hero V stânga 40% + 3V mici stacked dreapta
- `VVVV_4`: 3V mici stacked stânga + hero V dreapta 40%
- `VVVV_5`: 2V mari sus + 2V mici jos

#### 4 POZE — Pattern VVVH
- `VVVH_1`: 3V sus 45% + H jos
- `VVVH_2`: H sus 55% + 3V jos
- `VVVH_3`: H sus 40% + 3V jos egale
- `VVVH_4`: 3V sus egale + H jos 40%
- `VVVH_5`: V hero stânga + H dreapta-sus + 2V dreapta-jos

#### 4 POZE — Pattern VVHH
- `VVHH_1`: 2V stânga + 2H stacked dreapta
- `VVHH_2`: 2H stacked stânga + 2V dreapta
- `VVHH_3`: H sus + 2V mijloc + H jos
- `VVHH_4`: V stânga + H dreapta-sus + V centru + H dreapta-jos
- `VVHH_5`: 2V sus + 2H jos

#### 4 POZE — Pattern VHHH
- `VHHH_1`: V stânga 35% + 3H stacked dreapta
- `VHHH_2`: 3H stacked stânga + V dreapta 35%
- `VHHH_3`: V hero stânga 45% + 3H mici dreapta
- `VHHH_4`: H sus + V stânga-jos + 2H dreapta-jos
- `VHHH_5`: V stânga + H sus-dreapta + 2H jos

#### 4 POZE — Pattern HHHH
- `HHHH_1`: 2×2 grid landscape
- `HHHH_2`: hero H sus 55% + 3H mici jos
- `HHHH_3`: 3H mici sus + hero H jos 55%
- `HHHH_4`: H stânga 60% + 3H mici stacked dreapta
- `HHHH_5`: 2H sus asimetric + 2H jos asimetric

#### 5 POZE — Patterns principale
- **VVVVV**: 5 coloane / hero+4 / 2+3 / 3+2
- **VVVVH**: H hero + 4V / 4V + H / 2V + H + 2V
- **VVVHH**: 3V + 2H / 2H + 3V / grid mixt
- **VVHHH**: 2V + 3H stacked / mosaic
- **VHHHH**: V hero + 4H / 4H + V
- **HHHHH**: 5 rânduri / hero+4 / 2+3 / 3+2

#### 6-10 POZE
- Aceleași principii: variații per pattern de orientare
- Minimum 5 variații per pattern principal
- Template-uri cu ierarhie vizuală clară (hero image)
- Grid-uri, masonry, mosaic, filmstrip

### Principii de design ale template-urilor (SmartAlbums)

1. **Ierarhie vizuală**: întotdeauna un frame e mai mare (hero) — poza „principală"
2. **Proporția de aur**: ratios de ~0.618 / 0.382 pentru split-uri naturale
3. **Asimetrie intenționată**: nu 50/50, ci 55/45, 60/40, 65/35
4. **Grupare logică**: pozele din aceeași orientare sunt grupate (nu alternează random)
5. **Spațiu de respirație**: marginea 5% + gap între poze creează un look premium
6. **Consistență**: template-urile din același pattern au aceeași „energie vizuală"

### Cum funcționează selecția

```
Utilizator adaugă 3 poze: [V, V, H]
  ↓
Pattern detectat: "VVH" (sorted)
  ↓
smartBuildTree() caută doar template-uri "VVH"
  ↓
Scorează pe: match orientare (strict) + ierarhie
  ↓
Alege cel mai bun template
  ↓
Atribuie pozele: V→slot V, H→slot H (STRICT)
  ↓
Ciclare (sus/jos) = doar template-uri "VVH"
```

### Ciclare restricționată
- Când utilizatorul ciclează template-uri (butoane ←/→ din sidebar)
- Se ciclează DOAR prin template-uri compatibile cu pattern-ul curent
- Dacă pozele se schimbă (adaugă/scoate) → recalculează pattern → nou set de template-uri

---

## 6. Pro Templates ca DEFAULT — Cheia pentru 70-75% SmartAlbums

### De ce Pro Templates în loc de Binary Trees

Binary trees generează layout-uri **matematic corecte dar vizual mecanice**. SmartAlbums are template-uri **desenate de designeri** cu proporții artistice. Soluția: generăm programatic **~150 pro templates** cu proporții profesionale (golden ratio, rule of thirds) care se livrează în cod, nu în Firestore.

### Arhitectura

```
src/utils/proTemplateLibrary.js  ← NOU: ~150 template-uri hardcoded
  ↓
layoutEngine.js → smartBuildTree() folosește PRO templates PRIMUL
  ↓
Binary trees = FALLBACK (dacă nu există pro template pentru pattern)
```

### Structura unui Pro Template (în cod)

```js
{
  id: 'VVH_1',
  pattern: 'VVH',        // ← NOU: orientation pattern
  photoCount: 3,
  formatType: 'patrat',   // 'patrat' | 'portret'
  frames: [
    { x: 0, y: 0, w: 50, h: 100, slot: 'V' },     // V stânga
    { x: 50, y: 0, w: 50, h: 61.8, slot: 'V' },    // V dreapta-sus (golden)
    { x: 50, y: 61.8, w: 50, h: 38.2, slot: 'H' }, // H dreapta-jos (golden)
  ],
}
```

### Proporții profesionale folosite

| Nume | Ratio | Unde se folosește |
|---|---|---|
| **Golden ratio** | 61.8 / 38.2 | Split principal hero/secondary |
| **Rule of thirds** | 66.7 / 33.3 | Hero dominant + sidebar |
| **Asymmetric balance** | 55 / 45 | Variație subtilă |
| **Strong hero** | 70 / 30 | Hero foarte dominant |
| **Equal** | 50 / 50 | Grid-uri simetrice |
| **Fibonacci** | 62 / 38 | Aproape golden, ușor diferit |

### Template-uri per pattern — FORMAT PĂTRAT (spread 2:1)

Coordonatele sunt % din spread (100% width = 2 pagini, 100% height = 1 pagină).

#### 1 POZĂ (3 template-uri)
```
H_1: [{ x:0, y:0, w:100, h:100, slot:'H' }]                    — full spread
V_1: [{ x:25, y:0, w:50, h:100, slot:'V' }]                     — centrat cu margini
S_1: [{ x:15, y:10, w:70, h:80, slot:'S' }]                     — centrat pătrat
```

#### 2 POZE — VV (6 variații)
```
VV_1: [{x:0,y:0,w:50,h:100,slot:'V'}, {x:50,y:0,w:50,h:100,slot:'V'}]              — egale
VV_2: [{x:0,y:0,w:61.8,h:100,slot:'V'}, {x:61.8,y:0,w:38.2,h:100,slot:'V'}]        — golden
VV_3: [{x:0,y:0,w:38.2,h:100,slot:'V'}, {x:38.2,y:0,w:61.8,h:100,slot:'V'}]        — golden invers
VV_4: [{x:0,y:0,w:55,h:100,slot:'V'}, {x:55,y:0,w:45,h:100,slot:'V'}]              — subtil
VV_5: [{x:0,y:0,w:45,h:100,slot:'V'}, {x:45,y:0,w:55,h:100,slot:'V'}]              — subtil invers
VV_6: [{x:0,y:0,w:66.7,h:100,slot:'V'}, {x:66.7,y:0,w:33.3,h:100,slot:'V'}]        — thirds
```

#### 2 POZE — HH (6 variații)
```
HH_1: [{x:0,y:0,w:100,h:50,slot:'H'}, {x:0,y:50,w:100,h:50,slot:'H'}]              — egale
HH_2: [{x:0,y:0,w:100,h:61.8,slot:'H'}, {x:0,y:61.8,w:100,h:38.2,slot:'H'}]        — golden
HH_3: [{x:0,y:0,w:100,h:38.2,slot:'H'}, {x:0,y:38.2,w:100,h:61.8,slot:'H'}]        — golden inv
HH_4: [{x:0,y:0,w:100,h:55,slot:'H'}, {x:0,y:55,w:100,h:45,slot:'H'}]              — subtil
HH_5: [{x:0,y:0,w:100,h:45,slot:'H'}, {x:0,y:45,w:100,h:55,slot:'H'}]              — subtil inv
HH_6: [{x:0,y:0,w:100,h:66.7,slot:'H'}, {x:0,y:66.7,w:100,h:33.3,slot:'H'}]        — thirds
```

#### 2 POZE — VH (6 variații)
```
VH_1: [{x:0,y:0,w:38.2,h:100,slot:'V'}, {x:38.2,y:0,w:61.8,h:100,slot:'H'}]        — V slim + H wide
VH_2: [{x:0,y:0,w:45,h:100,slot:'V'}, {x:45,y:0,w:55,h:100,slot:'H'}]              — V + H subtil
VH_3: [{x:0,y:0,w:100,h:55,slot:'H'}, {x:25,y:55,w:50,h:45,slot:'V'}]              — H sus + V centrat jos
VH_4: [{x:0,y:0,w:33.3,h:100,slot:'V'}, {x:33.3,y:0,w:66.7,h:100,slot:'H'}]        — thirds
VH_5: [{x:0,y:0,w:61.8,h:100,slot:'H'}, {x:61.8,y:0,w:38.2,h:100,slot:'V'}]        — H + V (inversat)
VH_6: [{x:0,y:0,w:50,h:100,slot:'V'}, {x:50,y:0,w:50,h:100,slot:'H'}]              — egale
```

#### 3 POZE — VVV (6 variații)
```
VVV_1: 3 coloane egale 33.3/33.3/33.3
VVV_2: hero V stânga 50% + 2V stacked dreapta (50×50 + 50×50)
VVV_3: 2V stacked stânga + hero V dreapta 50%
VVV_4: hero V stânga 61.8% + 2V mici 38.2% (golden)
VVV_5: 2V mici 38.2% + hero V dreapta 61.8% (golden inv)
VVV_6: V 40% + V 30% + V 30% (hero stânga)
```

#### 3 POZE — VVH (8 variații)
```
VVH_1: H sus 61.8% + 2V jos                          — hero H + 2V golden
VVH_2: 2V sus + H jos 38.2%                          — 2V + H golden
VVH_3: H sus 55% + 2V jos egale                      — hero H subtil
VVH_4: 2V sus egale + H jos 45%                      — 2V + H subtil
VVH_5: V stânga 33% + V centru 33% + H dreapta 34%   — 3 coloane
VVH_6: H stânga 50% + V centru 25% + V dreapta 25%   — H hero + 2V mici
VVH_7: V stânga 38.2% + H dreapta-sus + V dreapta-jos — mosaic golden
VVH_8: H sus 70% + 2V jos                            — hero H dominant
```

#### 3 POZE — VHH (6 variații)
```
VHH_1: V stânga 38.2% + 2H stacked dreapta           — V slim + 2H golden
VHH_2: 2H stacked stânga + V dreapta 38.2%           — inversat
VHH_3: V stânga 50% + 2H stacked dreapta             — V hero
VHH_4: V stânga 61.8% + 2H mici stacked dreapta      — V hero golden
VHH_5: H sus 55% + V stânga-jos + H dreapta-jos       — mosaic
VHH_6: V centru 40% + H stânga 30% sus/jos + H dreapta 30% — V centrat
```

#### 3 POZE — HHH (6 variații)
```
HHH_1: 3 rânduri egale
HHH_2: hero H sus 61.8% + 2H coloane jos 38.2%        — golden
HHH_3: 2H coloane sus 38.2% + hero H jos 61.8%        — golden inv
HHH_4: H sus 55% + H mijloc 25% + H jos 20%          — ierarhie 3 nivele
HHH_5: H stânga 61.8% + 2H stacked dreapta            — hero lateral
HHH_6: 2H stacked stânga + H dreapta 61.8%            — hero lateral inv
```

#### 4 POZE — VVVV (6 variații)
```
VVVV_1: 4 coloane egale (25%×4)
VVVV_2: hero V 40% + 3V mici stacked 20%×3
VVVV_3: 2V sus 50% + 2V jos 50% (grid 2×2)
VVVV_4: hero V 61.8% + 3V mici coloane 38.2%
VVVV_5: 3V mici 38.2% + hero V 61.8%
VVVV_6: V 35% + V 30% + V 20% + V 15% (ierarhie descrescătoare)
```

#### 4 POZE — VVVH (6 variații)
```
VVVH_1: 3V sus + H jos (H: 38.2% golden)
VVVH_2: H sus 61.8% + 3V jos
VVVH_3: H sus 50% + 3V jos egale
VVVH_4: V hero stânga 40% + H dreapta-sus + 2V dreapta-jos
VVVH_5: 2V stânga + H centru + V dreapta (4 coloane mixte)
VVVH_6: H sus 55% + V mare stânga-jos + 2V mici dreapta-jos
```

#### 4 POZE — VVHH (6 variații)
```
VVHH_1: 2V stânga + 2H stacked dreapta (50/50)
VVHH_2: 2H stacked stânga + 2V dreapta
VVHH_3: H sus + 2V mijloc + H jos (sandwich)
VVHH_4: V stânga + H dreapta-sus + V centru + H dreapta-jos (mosaic)
VVHH_5: 2V stânga 38.2% + 2H dreapta 61.8% (golden)
VVHH_6: H sus 45% + V stânga-jos + V centru-jos + H sub (grid mixt)
```

#### 4 POZE — VHHH (6 variații)
```
VHHH_1: V stânga 33.3% + 3H stacked dreapta
VHHH_2: 3H stacked stânga + V dreapta 33.3%
VHHH_3: V hero stânga 45% + 3H mici dreapta
VHHH_4: H sus + V stânga-jos + 2H dreapta-jos (mosaic)
VHHH_5: V stânga 38.2% + 3H dreapta 61.8% (golden)
VHHH_6: V centru + H stânga + H dreapta-sus + H dreapta-jos
```

#### 4 POZE — HHHH (6 variații)
```
HHHH_1: 2×2 grid (50/50 × 50/50)
HHHH_2: hero H sus 61.8% + 3H coloane jos 38.2%
HHHH_3: 3H coloane sus 38.2% + hero H jos 61.8%
HHHH_4: H stânga 61.8% + 3H stacked dreapta
HHHH_5: 2H sus asimetric (60/40) + 2H jos asimetric (40/60)
HHHH_6: hero H sus 50% + H mijloc 30% + 2H coloane jos 20%
```

#### 5 POZE (30 template-uri: 6 patterns × 5 variații)
- **VVVVV**: 5 coloane / hero+4 / 2+3 / 3+2 / filmstrip
- **VVVVH**: H hero + 4V / 4V + H / 2V + H + 2V / H sus + grid 2×2V / mosaic
- **VVVHH**: 3V + 2H / 2H + 3V / grid mixt / hero V + 2H + 2V / masonry
- **VVHHH**: 2V + 3H stacked / mosaic / V hero + 3H + V / alternating
- **VHHHH**: V hero + 4H / 4H + V / V centru + 2H stânga + 2H dreapta
- **HHHHH**: 5 rânduri / hero + 4 / 2+3 / 3+2 / filmstrip orizontal

#### 6-8 POZE (45+ template-uri: ~15 patterns × 3 variații minim)
- Grid-uri 2×3, 3×2, 2×4, 4×2
- Hero + grid
- Masonry cu înălțimi variabile
- Filmstrip (o linie de poze mici + hero)
- Mosaic complex

### Total: ~150 Pro Templates

| Poze | Patterns | Variații/pattern | Total |
|---|---|---|---|
| 1 | 3 | 1 | 3 |
| 2 | 3 | 6 | 18 |
| 3 | 4 | 6-8 | 26 |
| 4 | 5 | 6 | 30 |
| 5 | 6 | 5 | 30 |
| 6 | 6 | 4 | 24 |
| 7 | 5 | 3 | 15 |
| 8 | 4 | 3 | 12 |
| **Total** | | | **~158** |

### Logica de selecție (smartBuildTree actualizat)

```
1. Detectează pattern pozelor: [V,V,H] → "VVH"
2. Caută pro templates cu pattern === "VVH"
3. Dacă găsește → alege random sau scorează pe calitate
4. Dacă NU găsește → fallback la binary tree (ca acum)
5. Ciclare ←/→ = ciclează doar prin pro templates cu pattern-ul curent
6. Atribuie strict: V→V, H→H, S→orice
```

### Format portret (20×30)

Toate template-urile de mai sus se generează și pentru format portret (ratio spread 1.33:1 în loc de 2:1). Proporțiile se adaptează:
- Spread portret e mai înalt → frame-urile H sunt mai generoase
- Frame-urile V sunt natural mai potrivite
- Aceleași patterns, proporții ajustate

---

## 7. Fișiere modificate

| Fișier | Schimbări |
|---|---|
| `src/utils/proTemplateLibrary.js` | **NOU** — ~158 pro templates hardcoded, organizate pe pattern |
| `src/utils/layoutEngine.js` | `smartBuildTree()` folosește pro templates PRIMUL, DEFAULT_BOUNDS, scoring strict, filtru orientare |
| `src/stores/useEditorStore.js` | `toggleFullBleed()`, `placePhotoInFrame()` cu verificare orientare, `updateRatio()` cu lock, ciclare pe pattern |
| `src/components/editor/EditorCanvas.jsx` | Indicator vizual roșu la mismatch, Shift override |
| `src/components/editor/EditorTopbar.jsx` sau `EditorSidebar.jsx` | Buton full bleed toggle |
| `src/utils/projectRestore.js` | Default bounds la restaurare |

---

## 8. Ce NU se schimbă

- Structura binary tree (se păstrează ca **FALLBACK**)
- Pro templates din Firestore (rămân, se adaugă la cele din cod)
- Face detection (deja existent, se folosește la crop)
- AdminCollageEditor (design manual, adaugă template-uri suplimentare)
- Layout collector / auto-learning pipeline
- Copertă (alt sistem)

---

## 9. Ordinea de prioritate template-uri

```
1. Pro Templates din cod (proTemplateLibrary.js) — ~158 template-uri
2. Pro Templates din Firestore (create manual din AdminCollageEditor)
3. Approved layouts din Firestore (auto-learned de la clienți)
4. Binary tree variants (FALLBACK — doar dacă nu există pro template pentru pattern)
```
