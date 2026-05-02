import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
// import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: "AIzaSyBnhMYWHlgwaKVmNLXIronB5aADAQBJ0ZQ",
  authDomain: "fotocarte-app.firebaseapp.com",
  projectId: "fotocarte-app",
  storageBucket: "fotocarte-app.firebasestorage.app",
  messagingSenderId: "1086744414519",
  appId: "1:1086744414519:web:43a72fdddedab64e1072b2",
  measurementId: "G-JCF2JVRBNM",
};

// europe-west3 (Frankfurt) — closest to Moldova/Romania (~15ms)
const MD_BUCKET = 'gs://fotocarte-app-md-bucket';

let app, db, auth, storage, storageMD, googleProvider;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);                // Default bucket (admin: covers, fonts, CMS)
  storageMD = getStorage(app, MD_BUCKET);   // West3 bucket (user photo uploads — low latency)
  googleProvider = new GoogleAuthProvider();

  // App Check — DEZACTIVAT temporar
  // Cheia reCAPTCHA Enterprise e „Incomplete" pe GCloud → trimite token-uri invalide
  // → Storage returnează 403 pe fișiere publice (homepage, covers, etc.)
  // TODO: Reactivează după configurarea assessment-ului în GCloud Console
  // if (typeof window !== 'undefined') {
  //   try {
  //     initializeAppCheck(app, {
  //       provider: new ReCaptchaEnterpriseProvider('6LfJar0sAAAAACV-_aCW1S2sOaMw0Lc1ep9aLCyu'),
  //       isTokenAutoRefreshEnabled: true,
  //     });
  //   } catch (e) {
  //     console.warn('App Check init failed:', e);
  //   }
  // }
} catch (e) {
  console.warn('Firebase not configured, using localStorage fallback');
}

export { db, auth, storage, storageMD, googleProvider };
export default app;
