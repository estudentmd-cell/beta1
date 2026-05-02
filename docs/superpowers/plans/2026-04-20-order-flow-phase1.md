# Phase 1: Clean Order Flow — Dual Path + Checkout Guard

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the order flow to two clear paths (Creez singur / Vreau designer), block checkout when photos aren't arranged on self-service path, remove old 3-option service picker.

**Architecture:** Replace ServicePickerModal (3 options) with a simple 2-choice popup in the editor. Move service selection from checkout to editor. Block "Comandă" button when self-service path has 0 photos placed on spreads.

**Tech Stack:** React, Zustand (useProjectStore, useEditorStore, useUIStore), Tailwind CSS

---

### Task 1: Simplify SERVICE_INFO to 2 options

**Files:**
- Modify: `src/utils/constants.js:1-25`

- [ ] **Step 1: Replace 3 service levels with 2**

```js
export const SERVICE_INFO = {
  full_design: {
    icon: '✨',
    title: 'Vreau designer',
    desc: 'Încarci pozele, noi aranjăm totul profesional. Tu doar aprobi rezultatul.',
    time: '24-48h',
    path: 'designer',
    recommended: true,
  },
  self_service: {
    icon: '🎨',
    title: 'Creez singur',
    desc: 'Aranjezi pozele pe pagini cum dorești. Noi verificăm calitatea înainte de tipar.',
    time: '12h verificare',
    path: 'self',
  },
};
```

- [ ] **Step 2: Commit**

---

### Task 2: Rewrite ServicePickerModal as 2-choice popup

**Files:**
- Modify: `src/components/modals/ServicePickerModal.jsx`

- [ ] **Step 1: Rewrite modal with 2 large buttons**

Replace entire component with a simple 2-button modal:
- "Vreau designer" → sets `chosenPath: 'designer'` → navigates to `/app/checkout`
- "Creez singur" → sets `chosenPath: 'self'` → closes modal, client stays in editor
- Auth gate: if not authenticated, open auth modal first
- Mobile: renders as bottom sheet (`rounded-t-[20px]`, `items-end`)
- Desktop: centered dialog

- [ ] **Step 2: Commit**

---

### Task 3: Update DesignerNudge — 2 options instead of opening ServicePicker

**Files:**
- Modify: `src/components/editor/DesignerNudge.jsx`

- [ ] **Step 1: Change "Da, designerii fac totul" to go directly to checkout with designer path**

Replace `openModal('servicePicker')` with:
```js
useProjectStore.getState().setChosenPath('designer');
useProjectStore.getState().setServiceLevel('full_design');
// Auth check then navigate to checkout
```

- [ ] **Step 2: Change "Continui singur" to just dismiss (stays in editor)**

Already works — just dismiss the nudge.

- [ ] **Step 3: Commit**

---

### Task 4: Block "Comandă" on self-service path when no photos arranged

**Files:**
- Modify: `src/components/editor/EditorTopbar.jsx:170-187`
- Modify: `src/components/editor/MobileBottomToolbar.jsx:552-557`

- [ ] **Step 1: Add checkout guard logic**

In both files, before navigating to checkout, check:
```js
const { chosenPath } = useProjectStore.getState();
const { spreads } = useEditorStore.getState();
const hasPhotosOnSpreads = spreads.some(s => s.photos?.length > 0 || s.full || s.left || s.right);

if (chosenPath !== 'designer' && !hasPhotosOnSpreads) {
  // Open service picker — let them choose designer or arrange photos
  openModal('servicePicker');
  return;
}
```

- [ ] **Step 2: If self-service and no photos placed, show popup instead of blocking silently**

The ServicePickerModal (now 2 options) appears:
- "Vreau designer" → checkout
- "Creez singur" → close modal, client returns to editor to arrange

- [ ] **Step 3: Change button text from "Plasează comanda" to "Comandă albumul"**

EditorTopbar.jsx line 183: `Plasează comanda` → `Comandă albumul`
MobileBottomToolbar.jsx line 556: `Comandă` → stays `Comandă` (short for mobile)

- [ ] **Step 4: Commit**

---

### Task 5: Remove service selector from CheckoutScreen

**Files:**
- Modify: `src/screens/CheckoutScreen.jsx:200-216`

- [ ] **Step 1: Remove the service toggle buttons from checkout form**

Delete the entire `grid grid-cols-2 gap-3 mb-5` block with "Verifică albumul meu" and "Serviciu designer" buttons.

- [ ] **Step 2: Service comes from store, not from checkout**

The `service` state should read from `chosenPath` (already set before arriving at checkout):
```js
const service = chosenPath === 'self' ? 'verify' : 'designer';
```
Remove `setService` state and the selector UI entirely.

- [ ] **Step 3: Show service info as read-only badge in order summary**

In the price summary section, show:
```jsx
<div className="flex justify-between">
  <span className="text-gray-500">Serviciu</span>
  <span className="font-medium">{service === 'designer' ? '✨ Designer' : '✓ Self-service'}</span>
</div>
```

- [ ] **Step 4: Commit**

---

### Task 6: Update MobileBottomToolbar onOrder handler

**Files:**
- Modify: `src/components/editor/MobileBottomToolbar.jsx`

- [ ] **Step 1: Find where `onOrder` is defined and update**

The `onOrder` prop should use the same guard logic as Task 4:
- Check if photos are placed
- If not → open ServicePickerModal
- If yes → navigate to checkout

- [ ] **Step 2: Commit**

---

### Task 7: Clean up unused code

**Files:**
- Modify: `src/utils/constants.js` — remove `finish_started` and `verify_only` from SERVICE_INFO
- Modify: `src/screens/CheckoutScreen.jsx` — remove `service`/`setService` state, `autoService`, related useEffect

- [ ] **Step 1: Remove dead code**
- [ ] **Step 2: Build and verify no errors**

Run: `npx vite build 2>&1 | tail -5`
Expected: `✓ built in`

- [ ] **Step 3: Commit**

---

### Task 8: Deploy and test

- [ ] **Step 1: Build**
Run: `npx vite build`

- [ ] **Step 2: Deploy**
Run: `firebase deploy --only hosting`

- [ ] **Step 3: Test flows**
- Desktop: upload photos → click "Comandă albumul" with 0 placed → popup appears
- Desktop: choose "Vreau designer" → goes to checkout
- Desktop: choose "Creez singur" → stays in editor
- Desktop: arrange photos → click "Comandă albumul" → goes to checkout
- Mobile: same flow, popup as bottom sheet
- Checkout: no service selector, service shown as badge

- [ ] **Step 4: Commit final**
