import { useEffect } from "react";
import { isConfigured } from "./firebase";
import { initAuth, useApp } from "./data";
import App from "./App";
import FirebaseSetup from "./pages/FirebaseSetup";
import { Login, CreateOffice, JoinOffice } from "./pages/Auth";

let authStarted = false;

export default function Root() {
  const app = useApp();
  const configured = isConfigured();

  useEffect(() => {
    if (configured && !authStarted) {
      authStarted = true;
      initAuth();
    }
  }, [configured]);

  if (!configured) {
    return <FirebaseSetup />;
  }

  if (!app.authReady) {
    return <Splash text="Yükleniyor..." />;
  }

  if (!app.user) {
    return <Login />;
  }

  // Giriş yapıldı; ofis var mı, üye mi?
  if (app.officeChecked && !app.office) {
    return <CreateOffice />;
  }

  if (!app.me) {
    return <JoinOffice />;
  }

  return <App />;
}

function Splash({ text }: { text: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl bg-white/70 px-6 py-4 shadow-lg ring-1 ring-white/60 backdrop-blur-xl dark:bg-zinc-800/60 dark:ring-white/10">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 dark:border-slate-600 dark:border-t-white" />
        <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
          {text}
        </span>
      </div>
    </div>
  );
}
