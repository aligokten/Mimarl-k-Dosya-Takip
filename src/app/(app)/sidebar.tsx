"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/", label: "Panel" },
  { href: "/projeler", label: "Projeler" },
  { href: "/musteriler", label: "Müşteriler" },
  { href: "/arsa-sahipleri", label: "Arsa Sahipleri" },
  { href: "/ayarlar", label: "Ayarlar" },
];

export default function Sidebar({
  userName,
  userRole,
}: {
  userName: string;
  userRole: "ADMIN" | "STAFF";
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-5">
        <p className="text-sm font-semibold text-slate-900">
          Dosya Takip Sistemi
        </p>
        <p className="text-xs text-slate-500">Mimarlık Ofisi</p>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "block rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 px-5 py-4">
        <p className="truncate text-sm font-medium text-slate-900">
          {userName}
        </p>
        <p className="text-xs text-slate-500">
          {userRole === "ADMIN" ? "Yönetici" : "Personel"}
        </p>
        <button
          onClick={() => signOut({ callbackUrl: "/giris" })}
          className="mt-3 w-full rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
        >
          Çıkış Yap
        </button>
      </div>
    </aside>
  );
}
