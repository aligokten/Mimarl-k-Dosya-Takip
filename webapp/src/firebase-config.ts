// Firebase web yapılandırması. Bu değerler GİZLİ DEĞİLDİR — Firebase web
// uygulamaları için herkese açık olması normaldir; güvenlik Firestore
// kuralları ve Authentication ile sağlanır.
//
// Kurulum: Firebase Console > Proje Ayarları > "Web uygulaması" bölümünden
// aldığınız config değerlerini buraya yazın (ya da uygulama içindeki
// Ayarlar > Ekip & Giriş ekranından yapıştırın; oradan girilen değer bu
// dosyadakinden önceliklidir ve tarayıcıya kaydedilir).

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId: string;
}

// Kullanıcı kendi projesini kurup değerleri verdiğinde burası doldurulur.
export const BUILTIN_FIREBASE_CONFIG: Partial<FirebaseConfig> = {
  // apiKey: "...",
  // authDomain: "....firebaseapp.com",
  // projectId: "...",
  // appId: "...",
};
