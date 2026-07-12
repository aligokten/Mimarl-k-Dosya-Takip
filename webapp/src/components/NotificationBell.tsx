import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import {
  markAllNotificationsRead,
  markAllPlatformLeadNoticesSeen,
  markAllPlatformMessagesRead,
  markNotificationRead,
  markPlatformLeadNoticeSeen,
  markPlatformMessageRead,
  useApp,
} from "../data";

export default function NotificationBell() {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadMessages = app.platformMessages.filter((m) => !m.read).length;
  const unseenLeads = app.platformLeads.filter((l) => !l.notifSeen).length;
  const unread =
    app.notifications.filter((n) => !n.read).length + unreadMessages + unseenLeads;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Bildirimler"
        className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm ring-1 ring-white/60 backdrop-blur hover:bg-white dark:bg-zinc-800/80 dark:text-slate-300 dark:ring-white/10 dark:hover:bg-zinc-700"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 dark:bg-zinc-800 dark:ring-slate-700">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-700">
            <span className="text-sm font-bold text-slate-900 dark:text-white">
              Bildirimler
            </span>
            {unread > 0 && (
              <button
                onClick={() => {
                  markAllNotificationsRead();
                  markAllPlatformMessagesRead();
                  markAllPlatformLeadNoticesSeen();
                }}
                className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Tümünü okundu yap
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {app.notifications.length === 0 &&
              app.platformMessages.length === 0 &&
              app.platformLeads.length === 0 && (
                <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                  Henüz bildirim yok.
                </p>
              )}
            {app.platformLeads.slice(0, 20).map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  if (!l.notifSeen) markPlatformLeadNoticeSeen(l.id);
                  setOpen(false);
                  navigate("/platform");
                }}
                className={
                  "flex w-full gap-2 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-zinc-700/50 " +
                  (l.notifSeen ? "" : "bg-emerald-50/50 dark:bg-emerald-500/10")
                }
              >
                {!l.notifSeen && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                )}
                <span className={l.notifSeen ? "pl-4" : ""}>
                  <span className="block text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {l.companyName || l.contactName || "Yeni başvuru"}
                    </span>{" "}
                    — Yeni web başvurusu
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                    {l.contactName || l.email || "—"}
                    {l.createdAt &&
                      ` · ${formatDistanceToNow(new Date(l.createdAt), {
                        addSuffix: true,
                        locale: tr,
                      })}`}
                  </span>
                </span>
              </button>
            ))}
            {app.platformMessages.slice(0, 20).map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  if (!m.read) markPlatformMessageRead(m.id);
                  setOpen(false);
                  navigate("/platform");
                }}
                className={
                  "flex w-full gap-2 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-zinc-700/50 " +
                  (m.read ? "" : "bg-blue-50/50 dark:bg-blue-500/10")
                }
              >
                {!m.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <span className={m.read ? "pl-4" : ""}>
                  <span className="block text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {m.officeName || m.fromName}
                    </span>{" "}
                    — {m.text}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                    Platform mesajı · {m.fromName} ·{" "}
                    {formatDistanceToNow(new Date(m.createdAt), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </span>
                </span>
              </button>
            ))}
            {app.notifications.slice(0, 30).map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.read) markNotificationRead(n.id);
                  setOpen(false);
                  if (n.kind === "IZIN") {
                    navigate(app.me?.role === "ADMIN" ? "/ekip" : "/profil");
                  } else {
                    navigate(`/projeler/${n.projectId}`);
                  }
                }}
                className={
                  "flex w-full gap-2 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50 dark:border-slate-700/50 dark:hover:bg-zinc-700/50 " +
                  (n.read ? "" : "bg-blue-50/50 dark:bg-blue-500/10")
                }
              >
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                )}
                <span className={n.read ? "pl-4" : ""}>
                  <span className="block text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {n.projectName ?? "İzin"}
                    </span>{" "}
                    — {n.text}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
                    {n.byName} ·{" "}
                    {formatDistanceToNow(new Date(n.at), {
                      addSuffix: true,
                      locale: tr,
                    })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
