import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  clearChat,
  sendChatFile,
  sendChatMessage,
  useApp,
} from "../data";
import { ChatIcon, PaperclipIcon, SendIcon } from "./icons";

const SEEN_KEY = "mimarlik-chat-seen";

export default function ChatWidget() {
  const app = useApp();
  const me = app.me;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lastSeen, setLastSeen] = useState<string>(
    () => localStorage.getItem(SEEN_KEY) ?? ""
  );

  const messages = app.chat;
  const unread = open
    ? 0
    : messages.filter((m) => m.at > lastSeen && m.fromUid !== me?.uid).length;

  useEffect(() => {
    if (open) {
      const latest = messages[messages.length - 1]?.at ?? new Date().toISOString();
      localStorage.setItem(SEEN_KEY, latest);
      setLastSeen(latest);
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    }
  }, [open, messages]);

  if (!me) return null;

  async function send() {
    const t = text.trim();
    if (!t || busy) return;
    setText("");
    setBusy(true);
    setError(null);
    try {
      await sendChatMessage(t);
    } catch {
      setError("Mesaj gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  async function onPickFile(file: File) {
    if (file.size > 15 * 1024 * 1024) {
      setError("Dosya çok büyük (en fazla 15 MB).");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await sendChatFile(file);
    } catch (e) {
      setError(
        "Dosya gönderilemedi: " +
          (e instanceof Error ? e.message : "") +
          " (Firebase Storage etkin mi?)"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Yüzen buton */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="no-print fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-xl ring-1 ring-white/30 transition hover:brightness-105"
        title="Ofis Sohbeti"
      >
        <ChatIcon className="h-6 w-6" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="no-print fixed bottom-24 right-5 z-40 flex h-[70vh] max-h-[560px] w-[92vw] max-w-sm flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-zinc-900 dark:ring-zinc-700">
          {/* Başlık */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                Ofis Sohbeti
              </p>
              <p className="text-[11px] text-slate-400">
                {app.members.length} kullanıcı · geçici (kalıcı değil)
              </p>
            </div>
            <div className="flex items-center gap-1">
              {me.role === "ADMIN" && messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Tüm sohbet ve dosyalar silinsin mi?"))
                      clearChat();
                  }}
                  className="rounded-full px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  Temizle
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-zinc-700"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Mesajlar */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto p-3"
          >
            {messages.length === 0 && (
              <p className="mt-8 text-center text-sm text-slate-400 dark:text-slate-500">
                Henüz mesaj yok. İlk mesajı siz yazın.
              </p>
            )}
            {messages.map((m) => {
              const mine = m.fromUid === me.uid;
              return (
                <div
                  key={m.id}
                  className={mine ? "flex flex-col items-end" : "flex flex-col items-start"}
                >
                  {!mine && (
                    <span className="mb-0.5 px-1 text-[11px] font-medium text-slate-400">
                      {m.fromName}
                    </span>
                  )}
                  <div
                    className={
                      mine
                        ? "max-w-[80%] rounded-2xl rounded-br-sm bg-orange-500 px-3 py-2 text-sm text-white"
                        : "max-w-[80%] rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-zinc-800 dark:text-slate-100"
                    }
                  >
                    {m.text && <span className="whitespace-pre-wrap break-words">{m.text}</span>}
                    {m.fileKind === "image" && m.fileUrl && (
                      <a href={m.fileUrl} target="_blank" rel="noreferrer">
                        <img
                          src={m.fileUrl}
                          alt={m.fileName ?? ""}
                          className="mt-1 max-h-48 rounded-lg"
                        />
                      </a>
                    )}
                    {m.fileUrl && m.fileKind !== "image" && (
                      <a
                        href={m.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        download={m.fileName}
                        className={
                          mine
                            ? "flex items-center gap-1.5 underline"
                            : "flex items-center gap-1.5 text-blue-600 underline dark:text-blue-400"
                        }
                      >
                        <PaperclipIcon className="h-3.5 w-3.5" />
                        {m.fileName ?? "Dosya"}
                      </a>
                    )}
                  </div>
                  <span className="mt-0.5 px-1 text-[10px] text-slate-300 dark:text-slate-600">
                    {(() => {
                      try {
                        return format(new Date(m.at), "HH:mm");
                      } catch {
                        return "";
                      }
                    })()}
                  </span>
                </div>
              );
            })}
          </div>

          {error && (
            <p className="px-3 pb-1 text-[11px] text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          {/* Giriş */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex items-center gap-2 border-t border-slate-200 p-2 dark:border-zinc-700"
          >
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickFile(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-zinc-800"
              title="Görüntü / PDF gönder"
            >
              <PaperclipIcon className="h-5 w-5" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Mesaj yazın..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-zinc-600 dark:bg-zinc-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white hover:brightness-105 disabled:opacity-40"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
