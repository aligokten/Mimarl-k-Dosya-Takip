import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import {
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import {
  BUILTIN_FIREBASE_CONFIG,
  type FirebaseConfig,
} from "./firebase-config";

const CONFIG_KEY = "mimarlik-firebase-config";

export function getStoredConfig(): FirebaseConfig | null {
  // Öncelik: kullanıcının Ayarlar'dan girdiği config
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as FirebaseConfig;
      if (parsed.apiKey && parsed.projectId && parsed.appId) return parsed;
    }
  } catch {
    // yoksay
  }
  // Sonra: derlemeye gömülü config
  const b = BUILTIN_FIREBASE_CONFIG;
  if (b.apiKey && b.projectId && b.appId && b.authDomain) {
    return b as FirebaseConfig;
  }
  return null;
}

export function saveConfig(config: FirebaseConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function clearConfig() {
  localStorage.removeItem(CONFIG_KEY);
}

export function isConfigured(): boolean {
  return getStoredConfig() !== null || useEmulator();
}

export function useEmulator(): boolean {
  return (
    localStorage.getItem("mimarlik-use-emulator") === "1" ||
    new URLSearchParams(location.search).get("emulator") === "1"
  );
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export const googleProvider = new GoogleAuthProvider();

function ensureApp(): FirebaseApp {
  if (app) return app;
  const emulator = useEmulator();
  const config = emulator
    ? {
        apiKey: "demo-key",
        authDomain: "demo-mimarlik.firebaseapp.com",
        projectId: "demo-mimarlik",
        appId: "demo-app",
      }
    : getStoredConfig();
  if (!config) {
    throw new Error("Firebase yapılandırması bulunamadı.");
  }
  app = initializeApp(config);
  authInstance = getAuth(app);
  // ignoreUndefinedProperties: iç içe (ör. documents[].url) undefined alanlar
  // Firestore yazımını reddetmesin; tanımsız alanlar sessizce atlanır.
  dbInstance = initializeFirestore(app, { ignoreUndefinedProperties: true });
  if (emulator) {
    connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(dbInstance, "127.0.0.1", 8085);
  }
  return app;
}

export function auth(): Auth {
  ensureApp();
  return authInstance!;
}

export function db(): Firestore {
  ensureApp();
  return dbInstance!;
}
