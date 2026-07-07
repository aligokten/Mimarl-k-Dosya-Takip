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
  getStorage,
  connectStorageEmulator,
  type FirebaseStorage,
} from "firebase/storage";
import {
  BUILTIN_FIREBASE_CONFIG,
  type FirebaseConfig,
} from "./firebase-config";

const CONFIG_KEY = "mimarlik-firebase-config";

export function getStoredConfig(): FirebaseConfig | null {
  // SaaS kullanımında Firebase projesi sabittir.
  // Tarayıcıda daha önce kaydedilmiş eski config değerleri
  // yanlış authDomain yönlendirmesi oluşturabileceği için kullanılmaz.
  try {
    localStorage.removeItem(CONFIG_KEY);
  } catch {
    // yoksay
  }

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
let storageInstance: FirebaseStorage | null = null;
let employeeAuthInstance: Auth | null = null;

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
  storageInstance = getStorage(app);
  if (emulator) {
    connectAuthEmulator(authInstance, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(dbInstance, "127.0.0.1", 8085);
    connectStorageEmulator(storageInstance, "127.0.0.1", 9199);
  }
  return app;
}

export function auth(): Auth {
  ensureApp();
  return authInstance!;
}

export function secondaryAuth(): Auth {
  const config = getStoredConfig();
  if (!config) {
    throw new Error("Firebase yapılandırması bulunamadı.");
  }

  if (!employeeAuthInstance) {
    const employeeApp = initializeApp(config, "employee-creation");
    employeeAuthInstance = getAuth(employeeApp);
  }

  return employeeAuthInstance;
}


export function db(): Firestore {
  ensureApp();
  return dbInstance!;
}

export function storage(): FirebaseStorage {
  ensureApp();
  return storageInstance!;
}
