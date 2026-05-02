/**
 * Font manager — totul în Firebase, fără localStorage
 */

const LOADED_FONTS = new Set();

const FONT_FAMILIES = [
  { name: 'Playfair Display', weights: [400, 700] },
  { name: 'Montserrat', weights: [400, 500, 700] },
  { name: 'Lora', weights: [400, 700] },
  { name: 'Cormorant Garamond', weights: [400, 600, 700] },
  { name: 'Raleway', weights: [400, 600] },
  { name: 'Great Vibes', weights: [400] },
];

// Cache custom fonts in memory (fetched from Firebase)
let _customFonts = [];

export function loadFont(family, weight = 400) {
  const key = `${family}:${weight}`;
  if (LOADED_FONTS.has(key)) return Promise.resolve();
  return new Promise((resolve) => {
    const encoded = family.replace(/\s+/g, '+');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encoded}:wght@${weight}&display=swap`;
    link.onload = () => { LOADED_FONTS.add(key); resolve(); };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

export async function loadAllFonts() {
  const promises = [];
  for (const f of FONT_FAMILIES) {
    for (const w of f.weights) {
      promises.push(loadFont(f.name, w));
    }
  }
  // Also load custom fonts (can be strings or {name, type} objects)
  for (const f of _customFonts) {
    const name = typeof f === 'string' ? f : f.name;
    if (!name) continue;
    promises.push(loadFont(name, 400));
    promises.push(loadFont(name, 700));
  }
  await Promise.all(promises);
}

/** Get all font names (built-in + custom from Firebase) */
export function getAvailableFonts() {
  const builtIn = FONT_FAMILIES.map((f) => f.name);
  const custom = _customFonts.map((f) => typeof f === 'string' ? f : f.name);
  return [...new Set([...builtIn, ...custom])];
}

/** Add a Google font by name */
export async function addFont(name) {
  if (!name?.trim()) return;
  name = name.trim();
  if (_customFonts.find(f => (typeof f === 'string' ? f : f.name) === name)) return;

  _customFonts.push({ name, type: 'google' });
  loadFont(name, 400);
  await _saveToFirebase();
}

/** Upload a local font file (TTF/OTF/WOFF2) → Firebase Storage + register */
export async function uploadFontFile(file) {
  if (!file) return null;
  const name = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');

  try {
    const { storage } = await import('../firebase/config');
    if (!storage) throw new Error('No storage');
    const { ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const path = `fonts/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);

    // Register @font-face
    _registerFontFace(name, url);

    // Save to custom fonts
    _customFonts.push({ name, type: 'file', url });
    await _saveToFirebase();
    return name;
  } catch (e) {
    console.warn('[Fonts] Upload failed:', e);
    return null;
  }
}

function _registerFontFace(name, url) {
  const style = document.createElement('style');
  style.textContent = `@font-face { font-family: '${name}'; src: url('${url}') format('truetype'); font-weight: normal; font-style: normal; font-display: swap; }`;
  document.head.appendChild(style);
  LOADED_FONTS.add(`${name}:400`);
}

async function _saveToFirebase() {
  try {
    const { db } = await import('../firebase/config');
    if (!db) return;
    const { doc, setDoc } = await import('firebase/firestore');
    await setDoc(doc(db, 'config', 'fonts'), { custom: _customFonts }, { merge: true });
  } catch (e) {
    console.warn('[Fonts] Save failed:', e);
  }
}

/** Remove a custom font — deletes from Firebase */
export async function removeFont(name) {
  _customFonts = _customFonts.filter((f) => (typeof f === 'string' ? f : f.name) !== name);
  await _saveToFirebase();
}

/** Sync custom fonts from Firebase — loads Google + file fonts */
export async function syncFontsFromFirestore() {
  try {
    const { db } = await import('../firebase/config');
    if (!db) return;
    const { doc, getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'config', 'fonts'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.custom?.length > 0) {
        _customFonts = data.custom;
        for (const f of _customFonts) {
          if (typeof f === 'string') {
            loadFont(f, 400);
          } else if (f.type === 'google') {
            loadFont(f.name, 400);
          } else if (f.type === 'file' && f.url) {
            _registerFontFace(f.name, f.url);
          }
        }
      }
    }
  } catch (e) {
    console.warn('[Fonts] Sync from Firebase failed:', e);
  }
}
