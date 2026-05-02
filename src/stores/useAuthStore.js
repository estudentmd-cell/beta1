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
      // ONLY auth method for clients. Same UID everywhere.
      verifyAndSignIn: async (email, code, name, phone, mode) => {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(undefined, 'europe-west1');
        const verifyAndAuth = httpsCallable(functions, 'verifyAndAuth');

        const result = await verifyAndAuth({
          email: email.toLowerCase().trim(),
          code,
          name: name || '',
          phone: phone || '',
          mode: mode || '',
        });

        const { token, clientId, clientName: serverName, clientPhone: serverPhone, isNew } = result.data;

        // Sign in with custom token — SAME UID on every device
        try {
          await signInWithCustomToken(auth, token);
        } catch (authErr) {
          console.error('signInWithCustomToken failed:', authErr.code, authErr.message);
          throw authErr;
        }

        set({
          user: {
            uid: clientId,
            email: email.toLowerCase().trim(),
            displayName: serverName || name || '',
            photoURL: null,
            phoneNumber: serverPhone || phone || '',
          },
          userId: clientId,
          role: 'user',
          isAdmin: false,
          isAuthenticated: true,
          loading: false,
          authMethod: 'email_code',
          clientName: serverName || name || '',
          clientPhone: serverPhone || phone || '',
          clientEmail: email.toLowerCase().trim(),
          activeClientId: clientId,
        });

        // Apply invite data after successful auth
        try {
          const inviteData = localStorage.getItem('fc_invite_data');
          if (inviteData) {
            const parsed = JSON.parse(inviteData);
            const current = get();
            if (!current.clientName && parsed.name) set({ clientName: parsed.name });
            if (!current.clientPhone && parsed.phone) set({ clientPhone: parsed.phone });
            localStorage.removeItem('fc_invite_data');
            localStorage.removeItem('fc_invite_slug');
          }
        } catch {}

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
            // Custom token users — uid IS the clientId, restore from Firestore
            if (!fbUser.email && !fbUser.isAnonymous) {
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

            // Google auth users (admin)
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

            // Anonymous or unknown — just stop loading
            set({ loading: false });
          } else {
            // Signed out — clear everything
            set({
              user: null, userId: null, role: null,
              isAdmin: false, isAuthenticated: false, loading: false,
              authMethod: null, clientName: '', clientPhone: '', clientEmail: '', activeClientId: null,
            });
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
