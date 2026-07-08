import { useEffect, useState } from "react";
import {
  changeMyPassword,
  createOffice,
  getMyPlatformInvite,
  type PlatformOfficeInvite,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  useApp,
} from "../data";
import { cardCls, inputCls, labelCls, primaryBtnCls } from "../ui";

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className={`${cardCls} w-full max-w-md p-8`}>
        <div className="flex items-center gap-2.5">
          <img
            src={`${import.meta.env.BASE_URL}brand/app-icon-512.png`}
            alt="Ruhsat360"
            className="h-10 w-10 rounded-xl shadow-sm"
          />
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Ruhsat<span className="text-orange-500">360</span>
            </p>
            <p className="text-[11px] font-medium text-slate-400">
              mimarlık ofisi dosya takip
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
        className="flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100 dark:hover:bg-zinc-700"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.23 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!email.trim() || !password) {
      setError("E-posta ve şifre girin.");
      return;
    }
    setBusy(true);
    setError(null);
    signInWithEmail(email, password)
      .then((r) => {
        if (!r.ok) setError(r.message);
      })
      .catch(() => setError("Giriş yapılamadı."))
      .finally(() => setBusy(false));
  }

  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        Ofis Dosya Takip Sistemi
      </h1>

      {/* Çalışan girişi: e-posta + şifre */}
      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        Çalışansanız e-posta ve şifrenizle giriş yapın. (İlk girişte yöneticinizin
        verdiği geçici şifreyi kullanın; ardından yeni şifre belirlersiniz.)
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 space-y-3"
      >
        <div>
          <label className={labelCls}>E-posta</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ornek@gmail.com"
            className={inputCls}
            autoComplete="username"
          />
        </div>
        <div>
          <label className={labelCls}>Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Şifreniz / geçici şifre"
            className={inputCls}
            autoComplete="current-password"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className={`${primaryBtnCls} w-full disabled:opacity-60`}
        >
          {busy ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-600" />
        <span className="text-xs font-medium text-slate-400">veya</span>
        <span className="h-px flex-1 bg-slate-200 dark:bg-slate-600" />
      </div>

      <p className="mb-3 text-center text-xs text-slate-400 dark:text-slate-500">
        Ofis yöneticisiyseniz Google ile girin
      </p>
      <GoogleButton label="Google ile Giriş Yap (Yönetici)" />
    </AuthShell>
  );
}

// Ofis yoksa: giriş yapan ilk kişi ofisi kurar ve yönetici olur.
export function CreateOffice() {
  const app = useApp();
  const [invite, setInvite] = useState<PlatformOfficeInvite | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyPlatformInvite()
      .then((result) => setInvite(result))
      .catch(() => setInvite(null))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
    return (
      <AuthShell>
        <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
          Yetki kontrol ediliyor
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Ruhsat360 ofis oluşturma yetkiniz kontrol ediliyor.
        </p>
      </AuthShell>
    );
  }

  if (!invite) {
    return (
      <AuthShell>
        <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
          Ofis oluşturma yetkiniz yok
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          <strong>{app.user?.email}</strong> e-posta adresi için Ruhsat360
          üzerinde yeni ofis oluşturma yetkisi bulunmuyor.
        </p>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          Ruhsat360 aboneliğiniz tanımlandıysa, lütfen size bildirilen yönetici
          e-posta adresiyle giriş yaptığınızdan emin olun.
        </p>
        <button
          onClick={() => signOutUser()}
          className={`${primaryBtnCls} mt-5 w-full`}
        >
          Çıkış Yap ve Yeniden Giriş
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        Ofisinizi Oluşturun
      </h1>

      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        <strong>{app.user?.email}</strong> hesabı{" "}
        <strong>{invite.companyName}</strong> için yönetici olarak
        yetkilendirilmiş.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-slate-300">
        <div className="flex justify-between gap-3">
          <span>Firma</span>
          <strong>{invite.companyName}</strong>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span>Paket</span>
          <strong>{invite.plan || "TRIAL"}</strong>
        </div>
        <div className="mt-2 flex justify-between gap-3">
          <span>Üye limiti</span>
          <strong>{invite.maxMembers || 10}</strong>
        </div>
        {invite.accessUntil && (
          <div className="mt-2 flex justify-between gap-3">
            <span>Erişim bitiş</span>
            <strong>{invite.accessUntil}</strong>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        onClick={() => {
          setBusy(true);
          setError(null);

          createOffice(invite.companyName)
            .catch((e) =>
              setError("Ofis oluşturulamadı: " + (e?.message ?? ""))
            )
            .finally(() => setBusy(false));
        }}
        disabled={busy}
        className={`${primaryBtnCls} mt-5 w-full disabled:opacity-60`}
      >
        {busy ? "Ofis oluşturuluyor..." : `${invite.companyName} Ofisini Oluştur`}
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

// Google ile girildi ama bu hesap ofise ekli değil (ve ofis sahibi de değil).
export function NotMember() {
  const app = useApp();
  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        Bu hesap ofise ekli değil
      </h1>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        <strong>{app.user?.email}</strong> hesabı bu ofiste tanımlı değil.
      </p>
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
        Çalışansanız çıkış yapıp yöneticinizin size verdiği{" "}
        <strong>e-posta ve şifre</strong> ile giriş yapın. Yöneticiyseniz doğru
        Google hesabıyla girdiğinizden emin olun.
      </p>
      <button
        onClick={() => signOutUser()}
        className={`${primaryBtnCls} mt-5 w-full`}
      >
        Çıkış Yap ve Yeniden Giriş
      </button>
    </AuthShell>
  );
}

// İlk girişte zorunlu şifre değiştirme.
export function ChangePassword() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (password.length < 6) {
      setError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor.");
      return;
    }
    setBusy(true);
    setError(null);
    changeMyPassword(password)
      .catch((e) => {
        const code = (e as { code?: string })?.code ?? "";
        setError(
          code === "auth/requires-recent-login"
            ? "Güvenlik için çıkış yapıp tekrar giriş yapın, sonra şifreyi değiştirin."
            : "Şifre değiştirilemedi: " + ((e as Error)?.message ?? "")
        );
      })
      .finally(() => setBusy(false));
  }

  return (
    <AuthShell>
      <h1 className="mt-6 text-xl font-bold text-slate-900 dark:text-white">
        Yeni Şifre Belirleyin
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Güvenliğiniz için ilk girişte geçici şifrenizi değiştirmeniz gerekir.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-5 space-y-3"
      >
        <div>
          <label className={labelCls}>Yeni Şifre</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="En az 6 karakter"
            className={inputCls}
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className={labelCls}>Yeni Şifre (Tekrar)</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputCls}
            autoComplete="new-password"
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className={`${primaryBtnCls} w-full disabled:opacity-60`}
        >
          {busy ? "Kaydediliyor..." : "Şifreyi Kaydet ve Devam Et"}
        </button>
      </form>
      <button
        onClick={() => signOutUser()}
        className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        Çıkış yap
      </button>
    </AuthShell>
  );
}
