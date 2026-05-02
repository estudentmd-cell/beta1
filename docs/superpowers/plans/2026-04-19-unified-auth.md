# Unified Auth System — Email + Cod 4 Cifre + Custom Token

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un singur sistem de autentificare: email + cod 4 cifre → Cloud Function verifică și returnează custom token → `signInWithCustomToken` → același UID pe orice dispozitiv. Înlocuiește OTP 6-cifre, Email Link Auth, Anonymous Auth pentru clienți. Google Auth rămâne doar pentru admin.

**Architecture:** Cloud Function `verifyAndAuth` primește email + cod, verifică, caută/creează client în Firestore, generează custom token cu UID-ul persistent al clientului. Frontend-ul apelează `signInWithCustomToken(token)` — Firebase Auth creează sesiune reală cu același UID pe orice dispozitiv. Un singur popup inline (nu pagină separată) servește toate cele 3 scenarii: creare cont, login, alt dispozitiv.

**Tech Stack:** Firebase Admin SDK (createCustomToken), Firebase Auth (signInWithCustomToken), EmailJS (trimitere cod), Firestore (stocarea codurilor + clienților), React (popup component inline)

---

## File Structure

| File | Responsabilitate | Acțiune |
|------|-----------------|---------|
| `functions/index.js` | Cloud Function `verifyAndAuth` — verifică cod, creează custom token | Modify |
| `src/firebase/emailCode.js` | `createEmailCode` — cod 4 cifre (nu 6), trimite via EmailJS | Modify |
| `src/stores/useAuthStore.js` | `verifyAndSignIn` — unica metodă de auth client. Elimină `signInWithPhone`, `signInAsGuest`, `sendEmailLink`, `completeEmailLink` | Modify |
| `src/components/modals/AuthModal.jsx` | Popup inline: email+nume+telefon → cod 4 cifre → auto-submit | Rewrite |
| `src/screens/LoginScreen.jsx` | Redirect la homepage cu popup auth | Rewrite |
| `src/components/shared/GlobalAuthModal.jsx` | Păstrat ca wrapper | No change |
| `src/main.jsx` | Elimină `completeEmailLink()` la boot | Modify |
| `src/hooks/useUploadCTA.js` | Simplificare check `hasIdentity` | Modify |
| `src/components/editor/PhotoGalleryPopup.jsx` | Simplificare check auth | Modify |
| `firestore.rules` | Regula `auth-tokens` collection | Modify |

---

### Task 1: Cloud Function `verifyAndAuth`

**Files:**
- Modify: `functions/index.js` — adaugă funcția `verifyAndAuth`

- [ ] **Step 1: Adaugă funcția `verifyAndAuth` în `functions/index.js`**

Adaugă DUPĂ funcția `sendSignInEmail`:

```javascript
// ══════════════════════════════════════════════
//  Verify email code + return Custom Auth Token
// ══════════════════════════════════════════════
exports.verifyAndAuth = onCall({ region: 'europe-west1' }, async (request) => {
  const { email, code } = request.data;
  if (!email || !code) {
    throw new HttpsError('invalid-argument', 'Email și cod necesare');
  }

  const normalizedEmail = email.toLowerCase().trim();

  // 1. Verify code from Firestore
  const codeDoc = await db.doc(`email-codes/${normalizedEmail}`).get();
  if (!codeDoc.exists) {
    throw new HttpsError('not-found', 'Cod inexistent. Solicită un cod nou.');
  }

  const codeData = codeDoc.data();
  if (codeData.code !== code) {
    throw new HttpsError('permission-denied', 'Cod greșit');
  }

  const expiresAt = codeData.expires_at ? new Date(codeData.expires_at).getTime() : 0;
  if (expiresAt < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Codul a expirat. Solicită unul nou.');
  }

  // Mark code as used
  await db.doc(`email-codes/${normalizedEmail}`).update({ verified: true, used_at: new Date().toISOString() });

  // 2. Find or create client
  const clientsSnap = await db.collection('clients')
    .where('email', '==', normalizedEmail)
    .limit(1)
    .get();

  let clientId;
  let clientName = '';
  let isNew = false;

  if (!clientsSnap.empty) {
    // Returning client — use existing UID
    const clientDoc = clientsSnap.docs[0];
    clientId = clientDoc.id;
    clientName = clientDoc.data().name || '';
  } else {
    // New client — generate persistent UID
    const { name, phone } = request.data;
    clientId = db.collection('clients').doc().id; // auto-generated Firestore ID
    await db.doc(`clients/${clientId}`).set({
      email: normalizedEmail,
      name: name || '',
      phone: phone || '',
      authMethod: 'email_code',
      type: 'client',
      status: 'active',
      created_at: new Date().toISOString(),
    });
    clientName = name || '';
    isNew = true;
  }

  // 3. Create custom token with the persistent client UID
  const customToken = await admin.auth().createCustomToken(clientId);

  console.log(`Auth: ${isNew ? 'NEW' : 'RETURNING'} client ${normalizedEmail} → uid ${clientId}`);

  return { token: customToken, clientId, clientName, isNew };
});
```

- [ ] **Step 2: Deploy Cloud Function**

```bash
cd functions && npm install && cd ..
npx firebase deploy --only functions
```

Expected: `✔ Deploy complete!` cu `verifyAndAuth` listată.

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "feat: add verifyAndAuth Cloud Function — custom token auth"
```

---

### Task 2: Email code — 4 cifre, fără localStorage

**Files:**
- Modify: `src/firebase/emailCode.js`

- [ ] **Step 1: Rescrie `emailCode.js` — cod 4 cifre, fără localStorage**

```javascript
/**
 * Email verification code — 4 digits, Firestore only.
 */
import { db } from './config';
import emailjs from '@emailjs/browser';

const EMAILJS_SERVICE_ID = 'service_riu4h4v';
const EMAILJS_TEMPLATE_ID = 'template_ko2uc37';
const EMAILJS_PUBLIC_KEY = 'G5ZCle95xNR-1_AFo';

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

/**
 * Generate 4-digit code, store in Firestore, send via EmailJS.
 */
export async function createEmailCode(email) {
  const code = generateCode();
  const normalizedEmail = email.toLowerCase().trim();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  // Store in Firestore
  if (db) {
    const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
    await setDoc(doc(db, 'email-codes', normalizedEmail), {
      code,
      email: normalizedEmail,
      created_at: serverTimestamp(),
      expires_at: expiresAt.toISOString(),
      verified: false,
    });
  }

  // Send via EmailJS
  const time = expiresAt.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
    passcode: code,
    email: normalizedEmail,
    time,
  }, EMAILJS_PUBLIC_KEY);

  return code;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/firebase/emailCode.js
git commit -m "refactor: email code to 4 digits, remove localStorage fallback"
```

---

### Task 3: Rescrie `useAuthStore.js` — o singură metodă de auth client

**Files:**
- Modify: `src/stores/useAuthStore.js`

- [ ] **Step 1: Rescrie useAuthStore — elimină signInWithPhone, signInAsGuest, sendEmailLink, completeEmailLink**

Păstrează:
- `signInWithGoogle` (doar admin)
- `logout`
- `initAuth`
- State + persist

Adaugă:
- `verifyAndSignIn(email, code, name?, phone?)` — unica metodă client

```javascript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth, googleProvider } from '../firebase/config';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithCustomToken,
  signOut as fbSignOut,
} from 'firebase/auth';

const ADMIN_EMAIL = 'fotocartemd@gmail.com';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      user: null,
      userId: null,
      role: null,
      isAdmin: false,
      isAuthenticated: false,
      loading: true,
      authMethod: null,
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      activeClientId: null,

      // ── Verify email code + sign in with custom token ──
      // This is the ONLY auth method for clients.
      // Works identically for: new account, login, different device.
      verifyAndSignIn: async (email, code, name, phone) => {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(undefined, 'europe-west1');
        const verifyAndAuth = httpsCallable(functions, 'verifyAndAuth');

        const result = await verifyAndAuth({
          email: email.toLowerCase().trim(),
          code,
          name: name || '',
          phone: phone || '',
        });

        const { token, clientId, clientName: serverName, isNew } = result.data;

        // Sign in with custom token — gives SAME UID on every device
        await signInWithCustomToken(auth, token);

        set({
          user: {
            uid: clientId,
            email: email.toLowerCase().trim(),
            displayName: serverName || name || '',
            photoURL: null,
            phoneNumber: phone || '',
          },
          userId: clientId,
          role: 'user',
          isAdmin: false,
          isAuthenticated: true,
          loading: false,
          authMethod: 'email_code',
          clientName: serverName || name || '',
          clientPhone: phone || '',
          clientEmail: email.toLowerCase().trim(),
          activeClientId: clientId,
        });

        return { clientId, clientName: serverName || name, isNew };
      },

      // ── Google Sign-In (admin only) ──
      signInWithGoogle: async () => {
        if (!auth || !googleProvider) return;
        try {
          googleProvider.setCustomParameters({ prompt: 'select_account' });
          const result = await signInWithPopup(auth, googleProvider);
          const u = result.user;
          const admin = u.email?.toLowerCase() === ADMIN_EMAIL;

          if (admin) {
            import('firebase/firestore').then(({ doc, setDoc }) => {
              import('../firebase/config').then(({ db }) => {
                if (db) setDoc(doc(db, 'admins', u.uid), {
                  email: u.email,
                  role: 'admin',
                  created_at: new Date().toISOString(),
                }, { merge: true }).catch(() => {});
              });
            }).catch(() => {});
          }

          set({
            user: {
              uid: u.uid,
              email: u.email,
              displayName: u.displayName,
              photoURL: u.photoURL,
              phoneNumber: u.phoneNumber || null,
            },
            userId: u.uid,
            role: admin ? 'admin' : 'user',
            isAdmin: admin,
            isAuthenticated: true,
            loading: false,
            authMethod: 'google',
            clientName: u.displayName || '',
            clientPhone: u.phoneNumber || '',
            clientEmail: u.email || '',
            activeClientId: u.uid,
          });

          return result;
        } catch (err) {
          console.error('Google sign-in error:', err);
          throw err;
        }
      },

      // ── Logout ──
      logout: async () => {
        if (auth) {
          try { await fbSignOut(auth); } catch {}
        }
        set({
          user: null,
          userId: null,
          role: null,
          isAdmin: false,
          isAuthenticated: false,
          loading: false,
          authMethod: null,
          clientName: '',
          clientPhone: '',
          clientEmail: '',
          activeClientId: null,
        });
      },

      // ── Legacy compat ──
      setClientInfo: (name, phone) => set({ clientName: name, clientPhone: phone }),

      // ── Init: listen to Firebase auth state ──
      initAuth: () => {
        if (!auth) {
          set({ loading: false });
          return () => {};
        }
        return onAuthStateChanged(auth, async (fbUser) => {
          if (fbUser) {
            // Custom token users — restore from Firestore client doc
            if (!fbUser.email && !fbUser.isAnonymous) {
              // Custom token sign-in — uid IS the clientId
              try {
                const { db } = await import('../firebase/config');
                if (db) {
                  const { doc, getDoc } = await import('firebase/firestore');
                  const clientSnap = await getDoc(doc(db, 'clients', fbUser.uid));
                  if (clientSnap.exists()) {
                    const c = clientSnap.data();
                    set({
                      user: { uid: fbUser.uid, email: c.email, displayName: c.name, photoURL: null, phoneNumber: c.phone },
                      userId: fbUser.uid,
                      role: 'user',
                      isAdmin: false,
                      isAuthenticated: true,
                      loading: false,
                      authMethod: 'email_code',
                      clientName: c.name || '',
                      clientPhone: c.phone || '',
                      clientEmail: c.email || '',
                      activeClientId: fbUser.uid,
                    });
                    return;
                  }
                }
              } catch {}
              set({ loading: false });
              return;
            }

            // Google auth users
            if (fbUser.email) {
              const admin = fbUser.email?.toLowerCase() === ADMIN_EMAIL;
              if (admin) {
                import('firebase/firestore').then(({ doc, setDoc }) => {
                  import('../firebase/config').then(({ db }) => {
                    if (db) setDoc(doc(db, 'admins', fbUser.uid), {
                      email: fbUser.email,
                      role: 'admin',
                      created_at: new Date().toISOString(),
                    }, { merge: true }).catch(() => {});
                  });
                }).catch(() => {});
              }

              set({
                user: {
                  uid: fbUser.uid,
                  email: fbUser.email,
                  displayName: fbUser.displayName,
                  photoURL: fbUser.photoURL,
                  phoneNumber: fbUser.phoneNumber,
                },
                userId: fbUser.uid,
                role: admin ? 'admin' : 'user',
                isAdmin: admin,
                isAuthenticated: true,
                loading: false,
                authMethod: 'google',
                clientName: fbUser.displayName || get().clientName,
                clientPhone: fbUser.phoneNumber || get().clientPhone,
                clientEmail: fbUser.email || get().clientEmail,
                activeClientId: fbUser.uid,
              });
              return;
            }

            // Anonymous — ignore (no longer used for clients)
            set({ loading: false });
          } else {
            // Signed out
            const m = get().authMethod;
            if (m === 'google') {
              set({
                user: null, userId: null, role: null,
                isAdmin: false, isAuthenticated: false, loading: false,
                authMethod: null, clientName: '', clientPhone: '', clientEmail: '', activeClientId: null,
              });
            } else {
              set({ loading: false });
            }
          }
        });
      },
    }),
    {
      name: 'momentive-auth',
      partialize: (state) => ({
        user: state.user,
        userId: state.userId,
        role: state.role,
        isAdmin: state.isAdmin,
        isAuthenticated: state.isAuthenticated,
        authMethod: state.authMethod,
        clientName: state.clientName,
        clientPhone: state.clientPhone,
        clientEmail: state.clientEmail,
        activeClientId: state.activeClientId,
      }),
    }
  )
);

export default useAuthStore;
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/useAuthStore.js
git commit -m "refactor: unified auth — verifyAndSignIn with custom token, remove phone/guest/emailLink"
```

---

### Task 4: Rescrie AuthModal — popup inline cu email + cod 4 cifre

**Files:**
- Rewrite: `src/components/modals/AuthModal.jsx`

- [ ] **Step 1: Rescrie AuthModal — popup simplu, rămâne pe pagină**

```jsx
import { useState, useRef, useEffect } from 'react';
import { createEmailCode } from '../../firebase/emailCode';
import useAuthStore from '../../stores/useAuthStore';

export default function AuthModal({ onClose, onSuccess, returnTo, hideSkip }) {
  const [step, setStep] = useState('form'); // 'form' | 'code'
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef()];

  // ── Step 1: Send code ──
  const handleSend = async () => {
    if (!email.includes('@')) { setError('Introdu un email valid'); return; }
    setError('');
    setLoading(true);
    try {
      await createEmailCode(email.trim());
      setStep('code');
    } catch (e) {
      setError(e.message || 'Eroare la trimitere. Încearcă din nou.');
    }
    setLoading(false);
  };

  // ── Step 2: Verify code — auto-submit on 4th digit ──
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto-submit when all 4 digits entered
    const fullCode = newCode.join('');
    if (fullCode.length === 4) {
      handleVerify(fullCode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerify = async (fullCode) => {
    setError('');
    setLoading(true);
    try {
      const result = await useAuthStore.getState().verifyAndSignIn(email, fullCode, name, phone);
      if (onSuccess) onSuccess(result);
      if (onClose) onClose();
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('greșit')) setError('Cod greșit. Verifică și încearcă din nou.');
      else if (msg.includes('expirat')) setError('Codul a expirat. Trimite unul nou.');
      else setError('Eroare. Încearcă din nou.');
      setCode(['', '', '', '']);
      inputRefs[0].current?.focus();
    }
    setLoading(false);
  };

  // Auto-focus first code input
  useEffect(() => {
    if (step === 'code') inputRefs[0].current?.focus();
  }, [step]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => !hideSkip && onClose?.()}>
      <div className="bg-white w-full sm:max-w-[400px] sm:rounded-2xl rounded-t-2xl p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}>

        {step === 'form' ? (
          <>
            <div className="text-center mb-5">
              <h3 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Salvăm albumul pe emailul tău
              </h3>
              <p className="text-[13px] text-[#888] mt-1">Vei primi notificări despre comandă</p>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[13px]">{error}</div>
            )}

            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full h-[48px] px-4 rounded-xl border border-[#DDD] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Numele tău"
                className="w-full h-[48px] px-4 rounded-xl border border-[#DDD] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
              />
              <div className="flex items-center gap-2">
                <span className="text-[14px] text-[#888] bg-[#F5F5F5] h-[48px] px-3 rounded-xl flex items-center border border-[#DDD]">+373</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="Telefon"
                  className="flex-1 h-[48px] px-4 rounded-xl border border-[#DDD] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#3D6B5E]/30 focus:border-[#3D6B5E]"
                />
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={loading || !email.includes('@')}
              className="w-full h-[48px] mt-4 bg-[#1C1C1E] text-white rounded-xl text-[15px] font-bold active:scale-[0.97] transition-all disabled:opacity-50">
              {loading ? 'Se trimite...' : 'Continuă'}
            </button>

            {!hideSkip && (
              <button onClick={onClose}
                className="w-full mt-2 text-[13px] text-[#999] py-2">
                Nu acum
              </button>
            )}
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-[18px] font-bold text-[#1A1A1A]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Introdu codul
              </h3>
              <p className="text-[13px] text-[#888] mt-1">
                Am trimis 4 cifre pe <strong>{email}</strong>
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-[13px]">{error}</div>
            )}

            <div className="flex justify-center gap-3 mb-6">
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-[56px] h-[56px] text-center text-[24px] font-bold rounded-xl border-2 border-[#DDD] focus:border-[#3D6B5E] focus:outline-none transition-colors"
                />
              ))}
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-2 mb-4">
                <div className="w-4 h-4 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin" />
                <span className="text-[13px] text-[#888]">Se verifică...</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <button onClick={() => { setStep('form'); setCode(['', '', '', '']); setError(''); }}
                className="text-[13px] text-[#3D6B5E] font-medium">
                ← Schimbă emailul
              </button>
              <button onClick={handleSend}
                className="text-[13px] text-[#3D6B5E] font-medium">
                Trimite din nou
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/AuthModal.jsx
git commit -m "feat: rewrite AuthModal — inline popup, 4-digit code, auto-submit"
```

---

### Task 5: Simplifică LoginScreen — redirect cu popup

**Files:**
- Modify: `src/screens/LoginScreen.jsx`

- [ ] **Step 1: Rescrie LoginScreen — deschide AuthModal în loc de formular propriu**

```jsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../stores/useAuthStore';
import useUIStore from '../stores/useUIStore';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/app/cabinet';
  const { isAuthenticated } = useAuthStore();

  // If already authenticated, redirect
  useEffect(() => {
    if (isAuthenticated) {
      navigate(returnTo, { replace: true });
    }
  }, [isAuthenticated, navigate, returnTo]);

  // Open auth modal on mount
  useEffect(() => {
    if (!isAuthenticated) {
      useUIStore.getState().openModal?.('auth', {
        returnTo,
        hideSkip: true,
        onSuccess: () => navigate(returnTo, { replace: true }),
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#3D6B5E]/20 border-t-[#3D6B5E] rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px] text-[#B0A89E]">Se încarcă...</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/screens/LoginScreen.jsx
git commit -m "refactor: LoginScreen opens AuthModal instead of custom form"
```

---

### Task 6: Simplifică auth gates — hasIdentity consistent

**Files:**
- Modify: `src/hooks/useUploadCTA.js`
- Modify: `src/components/editor/PhotoGalleryPopup.jsx`
- Modify: `src/components/editor/EditorTopbar.jsx`
- Modify: `src/main.jsx`

- [ ] **Step 1: Modifică `src/main.jsx` — elimină `completeEmailLink`**

Elimină linia:
```javascript
useAuthStore.getState().completeEmailLink().catch(() => {});
```

- [ ] **Step 2: Modifică `src/hooks/useUploadCTA.js` — check unificat**

Verificarea `hasIdentity` trebuie să fie:
```javascript
const hasIdentity = !!(user?.uid && authMethod === 'email_code' || authMethod === 'google');
```

- [ ] **Step 3: Modifică `PhotoGalleryPopup.jsx` — același check**

Înlocuiește `hasRealAuth` check cu:
```javascript
const hasRealAuth = !!(user?.uid && (authMethod === 'email_code' || authMethod === 'google'));
```

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx src/hooks/useUploadCTA.js src/components/editor/PhotoGalleryPopup.jsx
git commit -m "refactor: unified hasIdentity check, remove completeEmailLink"
```

---

### Task 7: Firestore rules — collection `email-codes` securizată

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Actualizează regula `email-codes`**

Cod-urile trebuie create public (frontend trimite), dar verificarea se face pe server (Cloud Function). Deci regula rămâne:
```
match /email-codes/{email} {
  allow create: if true;
  allow read: if true;
  allow update: if true;
  allow delete: if isAdmin();
}
```

Aceasta nu se schimbă — e deja corect. Verificarea reală se face în Cloud Function (`verifyAndAuth`), nu pe client.

- [ ] **Step 2: Commit** (dacă s-a schimbat ceva)

---

### Task 8: Build + Test + Deploy

- [ ] **Step 1: Build**

```bash
npm run build
```

Expected: `✓ built` fără erori.

- [ ] **Step 2: Test pe localhost**

```bash
npm run dev
```

Test scenarii:
1. **Client nou**: Click "Creează cont" → email+nume+telefon → cod 4 cifre → verificat → cabinet
2. **Client direct**: Editor → încarcă poze → popup → email+cod → continuă upload
3. **Alt dispozitiv**: Pune email existent → cod → recunoscut → vede proiectele
4. **Admin**: Google sign-in → admin panel (neschimbat)
5. **Logout**: Click deconectare → totul curat

- [ ] **Step 3: Deploy**

```bash
npx firebase deploy --only hosting
```

- [ ] **Step 4: Commit final**

```bash
git add -A
git commit -m "feat: unified auth system — email + 4-digit code + custom token"
```

---

## Migrare clienți existenți

Clienții care au conturi existente (create cu Anonymous Auth sau Email Link) vor trebui să se re-autentifice cu email + cod. La prima autentificare, Cloud Function va crea un client doc nou cu UID persistent. Proiectele vechi rămân accesibile prin email match în CabinetOrders (fallback pe `clientEmail`).

Nu e nevoie de migrare batch — se face organic la prima revenire a fiecărui client.
