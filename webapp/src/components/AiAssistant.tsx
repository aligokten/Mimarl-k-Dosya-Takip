import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { askAssistant, useAiConfigured, type ChatMessage } from "../ai";
import { cardCls } from "../ui";
import { SparklesIcon, SendIcon } from "./icons";

const SUGGESTIONS = [
  "Yapı ruhsatı için hangi evraklar gerekir?",
  "TAKS ve KAKS (emsal) nedir, nasıl hesaplanır?",
  "Hangi binalarda sığınak zorunludur?",
  "İskan (yapı kullanma izni) nasıl alınır?",
];

export default function AiAssistant() {
  const configured = useAiConfigured();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    setError(null);
    const next: ChatMessage[] = [...messages, { role: "user", text: question }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const answer = await askAssistant(next);
      setMessages((m) => [...m, { role: "model", text: answer }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Yanıt alınamadı.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${cardCls} flex flex-col p-5`}>
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm">
          <SparklesIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">
            İmar Asistanı
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            İmar Kanunu ve yönetmeliklerden yararlanır
          </p>
        </div>
      </div>

      {!configured ? (
        <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-zinc-800/60 dark:text-slate-300">
          <p>
            AI Asistanı kullanmak için bir kez ücretsiz{" "}
            <span className="font-semibold">Gemini API anahtarı</span>{" "}
            eklemelisiniz.
          </p>
          <Link
            to="/ayarlar"
            className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Ayarlar → AI Asistan
          </Link>
        </div>
      ) : (
        <>
          <div
            ref={scrollRef}
            className="mt-4 max-h-80 min-h-[6rem] space-y-3 overflow-y-auto pr-1"
          >
            {messages.length === 0 && (
              <div className="space-y-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Bir soru sorun ya da örneklerden seçin:
                </p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => send(s)}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-300 dark:hover:bg-zinc-700"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-slate-900 px-3.5 py-2 text-sm text-white dark:bg-white dark:text-slate-900"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-800 dark:bg-zinc-800 dark:text-slate-100"
                  }
                >
                  {m.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3.5 py-2 text-sm text-slate-500 dark:bg-zinc-800 dark:text-slate-400">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
                  </span>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="mt-3 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="İmar mevzuatıyla ilgili sorun..."
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200 dark:border-slate-600 dark:bg-zinc-800 dark:text-slate-100"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              title="Gönder"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
          <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
            Bilgilendirme amaçlıdır, hukuki tavsiye değildir. Kesin bilgi için
            resmi mevzuatı ve idarenizi teyit edin.
          </p>
        </>
      )}
    </div>
  );
}
