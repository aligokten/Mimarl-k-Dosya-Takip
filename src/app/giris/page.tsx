import { Suspense } from "react";
import LoginForm from "./login-form";

export default function GirisPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">
          Dosya Takip Sistemi
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Devam etmek için hesabınızla giriş yapın.
        </p>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
