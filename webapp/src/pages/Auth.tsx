import { useEffect, useState } from "react";
import {
  createOffice,
  joinOffice,
  signInWithGoogle,
  signOutUser,
  useApp,
} from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls } from "../ui";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className={`${cardCls} w-full max-w-md p-8`}>
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-600 text-sm font-bold text-white">
            M
          </span>
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              dosyatakip<span className="text-orange-500">.</span>
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              mimarlık ofisi
            </p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <>
      <button
        onClick={() => {
          setBusy(true);
          setError(null);
          signInWithGoogle()
            .catch((e) =>
              setError(
                /popup/i.test(e?.message ?? "")
                  ? "Giriş penceresi engellendi. Tarayıcı ayarlarından açılır pencereye izin verin."
                  : "Giriş yapılamadı: " + (e?.message ?? "")
              )
            )
            .finally(() => setBusy(false));
        }}
        disabled={busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
          />
        </svg>
        {busy ? "Bağlanıyor..." : label}
      </button>
      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </>
  );
}

export function Login() {
  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        Ofis Dosya Takip Sistemi
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Devam etmek için Google (Gmail) hesabınızla giriş yapın.
      </p>
      <GoogleButton label="Google ile Giriş Yap" />
    </AuthShell>
  );
}

// Ofis yoksa: giriş yapan ilk kişi ofisi kurar ve yönetici olur.
export function CreateOffice() {
  const app = useApp();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        Ofisinizi Oluşturun
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {app.user?.email} ile giriş yaptınız. Bu ofisin{" "}
        <strong>yöneticisi</strong> siz olacaksınız; sonra çalışanlarınızı
        davet edebilirsiniz.
      </p>
      <label className={`${labelCls} mt-5`}>Ofis Adı</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Örn: Gökten Mimarlık"
        className={inputCls}
      />
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <button
        onClick={() => {
          if (!name.trim()) {
            setError("Ofis adı gerekli.");
            return;
          }
          setBusy(true);
          setError(null);
          createOffice(name)
            .catch((e) => setError("Oluşturulamadı: " + (e?.message ?? "")))
            .finally(() => setBusy(false));
        }}
        disabled={busy}
        className={`${primaryBtnCls} mt-4 w-full disabled:opacity-60`}
      >
        {busy ? "Oluşturuluyor..." : "Ofisi Oluştur"}
      </button>
      <button
        onClick={() => signOutUser()}
        className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        Farklı hesapla giriş yap
      </button>
    </AuthShell>
  );
}

// Ofis var ama kullanıcı üye değil: davet kodu ister.
export function JoinOffice() {
  const app = useApp();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(
    null
  );

  // Davet linkinden gelen kodu yakala (#/davet/KOD)
  useEffect(() => {
    const m = location.hash.match(/davet\/([a-zA-Z0-9]+)/);
    if (m) setCode(m[1]);
  }, []);

  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        {app.office?.name ?? "Ofise"} Katıl
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {app.user?.email} ile giriş yaptınız. Katılmak için yöneticinizin
        verdiği <strong>davet kodunu</strong> girin.
      </p>
      <label className={`${labelCls} mt-5`}>Davet Kodu</label>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="örn: a1b2c3d4"
        className={inputCls}
      />
      {result && (
        <p
          className={
            result.ok
              ? "mt-2 text-sm text-green-700 dark:text-green-300"
              : "mt-2 text-sm text-red-600 dark:text-red-400"
          }
        >
          {result.message}
        </p>
      )}
      <button
        onClick={() => {
          setBusy(true);
          setResult(null);
          joinOffice(code)
            .then(setResult)
            .finally(() => setBusy(false));
        }}
        disabled={busy || !code.trim()}
        className={`${primaryBtnCls} mt-4 w-full disabled:opacity-60`}
      >
        {busy ? "Katılınıyor..." : "Ofise Katıl"}
      </button>
      <button
        onClick={() => signOutUser()}
        className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        Farklı hesapla giriş yap
      </button>
    </AuthShell>
  );
}
