// Firebase web yapılandırması. Bu değerler GİZLİ DEĞİLDİR — Firebase web
// uygulamaları için herkese açık olması normaldir; güvenlik Firestore
// kuralları ve Authentication ile sağlanır.
//
// Bu dosya dev/saas-multi-office branch üzerinde STAGING Firebase projesini
// kullanır. Canlı sistem main branch üzerinde artful-guru-474421-f9 projesini
// kullanmaya devam eder.

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

// STAGING / TEST Firebase projesi
export const BUILTIN_FIREBASE_CONFIG: Partial<FirebaseConfig> = {
  apiKey: "AIzaSyAdMzeP6GRILD0icD2QCbZrLhBLrbAVpeo",
  authDomain: "directed-potion-425913-g4.firebaseapp.com",
  projectId: "directed-potion-425913-g4",
  storageBucket: "directed-potion-425913-g4.firebasestorage.app",
  messagingSenderId: "469666419262",
  appId: "1:469666419262:web:a0ec78710c954be12bf76f",
};
