// Firebase web yapılandırmaları. Bu değerler GİZLİ DEĞİLDİR.
// Güvenlik Firestore Rules, Authentication ve yetkili domain ayarlarıyla sağlanır.

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

const LIVE_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyCF9Q1W-TlYfsoOxtF7lunmb1jrYOYRE5k",
  authDomain: "artful-guru-474421-f9.firebaseapp.com",
  projectId: "artful-guru-474421-f9",
  storageBucket: "artful-guru-474421-f9.firebasestorage.app",
  messagingSenderId: "370120433599",
  appId: "1:370120433599:web:de08e01b07dac5ad34cb0a",
};

const STAGING_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: "AIzaSyAdMzeP6GRILD0icD2QCbZrLhBLrbAVpeo",
  authDomain: "directed-potion-425913-g4.firebaseapp.com",
  projectId: "directed-potion-425913-g4",
  storageBucket: "directed-potion-425913-g4.firebasestorage.app",
  messagingSenderId: "469666419262",
  appId: "1:469666419262:web:a0ec78710c954be12bf76f",
};

function resolveFirebaseConfig(): FirebaseConfig {
  const host = window.location.hostname;

  const isStaging =
    host === "directed-potion-425913-g4.web.app" ||
    host === "directed-potion-425913-g4.firebaseapp.com" ||
    host === "localhost" ||
    host === "127.0.0.1";

  if (isStaging) {
    return STAGING_FIREBASE_CONFIG;
  }

  return LIVE_FIREBASE_CONFIG;
}

export const BUILTIN_FIREBASE_CONFIG: Partial<FirebaseConfig> =
  resolveFirebaseConfig();
