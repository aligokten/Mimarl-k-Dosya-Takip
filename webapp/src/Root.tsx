import { useEffect } from "react";
import { isConfigured } from "./firebase";
import { initAuth, signOutUser, useApp } from "./data";
import App from "./App";
import FirebaseSetup from "./pages/FirebaseSetup";
import {
  Login,
  CreateOffice,
  NotMember,
  ChangePassword,
} from "./pages/Auth";

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

  if (!app.officeChecked) {
    return <Splash text="Ofis bilgileri kontrol ediliyor..." />;
  }

  const accessProblem = getOfficeAccessProblem(app.office);

  if (app.office && app.me && accessProblem) {
    return (
      <SubscriptionBlocked
        officeName={getOfficeName(app.office)}
        reason={accessProblem}
      />
    );
  }

  if (app.office && app.me?.mustChangePassword) {
    return <ChangePassword />;
  }

  if (app.office && app.me) {
    return <App />;
  }

  if (!app.office) {
    return <CreateOffice />;
  }

  return <NotMember />;
}

function getOfficeName(office: unknown): string {
  const data = office as { name?: string } | null;
  return data?.name || "Ruhsat360 Ofisi";
}

function getOfficeAccessProblem(office: unknown): string | null {
  if (!office) {
    return null;
  }

  const data = office as {
    accessStatus?: string;
    subscriptionStatus?: string;
    accessUntil?: string;
  };

  const status = String(
    data.accessStatus || data.subscriptionStatus || "ACTIVE"
  ).toUpperCase();

  if (status === "SUSPENDED") {
    return "Aboneliğiniz geçici olarak askıya alınmış.";
  }

  if (status === "CANCELLED") {
    return "Aboneliğiniz iptal edilmiş.";
  }

  if (status === "PAST_DUE") {
    return "Abonelik ödemeniz gecikmiş görünüyor.";
  }

  if (data.accessUntil) {
    const end = new Date(`${data.accessUntil}T23:59:59`);
    const now = new Date();

    if (!Number.isNaN(end.getTime()) && end < now) {
      return "Abonelik süreniz sona ermiş.";
    }
  }

  return null;
}

function SubscriptionBlocked({
  officeName,
  reason,
}: {
  officeName: string;
  reason: string;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <img src="./brand/logo-icon.png" className="h-11 w-11 rounded-xl" />
          <div>
            <div className="text-lg font-extrabold">Ruhsat360</div>
            <div className="text-xs text-slate-400">{officeName}</div>
          </div>
        </div>

        <h1 className="text-2xl font-extrabold">
          Ofis erişimi geçici olarak kapalı
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          {reason} Verileriniz korunmaktadır. Erişimi yeniden açmak için
          Ruhsat360 destek ekibiyle iletişime geçebilirsiniz.
        </p>

        <div className="mt-6 rounded-2xl border border-orange-500/20 bg-orange-500/10 p-4 text-sm text-orange-100">
          Ödeme veya abonelik yenileme tamamlandığında ofis paneliniz tekrar
          aktif hale getirilecektir.
        </div>

        <button
          onClick={() => signOutUser()}
          className="mt-6 w-full rounded-2xl bg-white px-4 py-3 text-sm font-bold text-zinc-950 transition hover:bg-slate-200"
        >
          Çıkış Yap
        </button>
      </div>
    </div>
  );
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
