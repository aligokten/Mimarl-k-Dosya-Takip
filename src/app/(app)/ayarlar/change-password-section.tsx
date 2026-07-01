"use client";

import { useRef, useState, useTransition } from "react";
import { changeOwnPassword } from "@/lib/actions/users";

export default function ChangePasswordSection() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-900">
        Şifremi Değiştir
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Hesabınızın giriş şifresini güncelleyin.
      </p>

      <form
        ref={formRef}
        action={(formData) => {
          startTransition(async () => {
            const res = await changeOwnPassword(formData);
            setResult(res);
            if (res.ok) formRef.current?.reset();
          });
        }}
        className="mt-4 space-y-3"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            name="currentPassword"
            type="password"
            required
            placeholder="Mevcut Şifre"
            autoComplete="current-password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <input
            name="newPassword"
            type="password"
            required
            minLength={6}
            placeholder="Yeni Şifre (en az 6 karakter)"
            autoComplete="new-password"
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        {result && (
          <p
            className={
              result.ok ? "text-sm text-green-700" : "text-sm text-red-600"
            }
          >
            {result.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
        >
          {isPending ? "Güncelleniyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </section>
  );
}
