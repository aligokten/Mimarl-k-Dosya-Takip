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

// Ofisin Firebase projesi derlemeye gömülüdür: böylece ilk kez girenler
// kurulum ekranı görmeden doğrudan giriş ekranına düşer. Bu değerler gizli
// DEĞİLDİR (Firebase web anahtarları herkese açıktır); güvenlik Firestore
// kuralları ve yetkili alan adlarıyla sağlanır.
export const BUILTIN_FIREBASE_CONFIG: Partial<FirebaseConfig> = {
  apiKey: "AIzaSyCF9Q1W-TlYfsoOxtF7lunmb1jrYOYRE5k",
  authDomain: "artful-guru-474421-f9.firebaseapp.com",
  projectId: "artful-guru-474421-f9",
  storageBucket: "artful-guru-474421-f9.firebasestorage.app",
  messagingSenderId: "370120433599",
  appId: "1:370120433599:web:de08e01b07dac5ad34cb0a",
};
