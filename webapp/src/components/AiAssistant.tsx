import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  aiAvailable,
  applyAiSuggestion,
  askAssistant,
  watchAiMessages,
} from "../data";
import type { AiActionKey, AiMessage, AiSuggestion, Project } from "../types";
import { cardCls, inputCls, primaryBtnCls, secondaryBtnCls } from "../ui";
import {
  BuildingIcon,
  CalendarIcon,
  CheckCircleIcon,
  FileIcon,
  FlagIcon,
  PenIcon,
  SendIcon,
  SparklesIcon,
} from "./icons";

// Hızlı işlem düğmeleri — anahtarlar functions/ai-prompts.js ile aynı olmalı.
const QUICK_ACTIONS: {
  key: AiActionKey;
  label: string;
  hint: string;
  Icon: (p: { className?: string }) => ReactNode;
}[] = [
  { key: "imar", label: "İmar analizi", hint: "Emsal, TAKS, Hmax, çekme, plan notları", Icon: BuildingIcon },
  { key: "evrak", label: "Eksik evrak kontrolü", hint: "Eksik ve süresi dolan belgeler", Icon: FileIcon },
  { key: "sonraki", label: "Sonraki adımlar", hint: "Öncelikli 3–5 iş", Icon: FlagIcon },
  { key: "dilekce", label: "Dilekçe hazırla", hint: "Belediyeye dilekçe taslağı", Icon: PenIcon },
  { key: "rapor", label: "İşveren raporu", hint: "Sade dille durum raporu", Icon: CalendarIcon },
];

function errorText(err: unknown): string {
  const e = err as { code?: string; message?: string } | null;
  if (e?.code === "functions/deadline-exceeded") {
    return "Yanıt çok uzun sürdü. Asistan arka planda bitirirse yanıt burada görünecek; birkaç dakika sonra tekrar bakın.";
  }
  if (e?.code === "functions/unauthenticated") return "Oturumunuz kapanmış; lütfen yeniden giriş yapın.";
  return e?.message || "Asistan şu an yanıt veremiyor.";
}

export default function AiAssistant({ project }: { project: Project }) {
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [applying, setApplying] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const available = aiAvailable();

  useEffect(() => {
    if (!available) return;
    return watchAiMessages(
      project.id,
      (list) => setMessages(list),
      () => setLoadError("Sohbet geçmişi yüklenemedi.")
    );
  }, [project.id, available]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, busy]);

  if (!available) {
    return (
      <div className={`${cardCls} p-6 text-sm text-slate-500 dark:text-slate-400`}>
        Yapay zekâ asistanı yalnızca ofis hesaplarında kullanılabilir.
      </div>
    );
  }

  async function run(input: { action?: AiActionKey; message?: string }, label: string) {
    if (busy) return;
    setBusy(label);
    setError(null);
    try {
      await askAssistant(project.id, input);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  }

  function send() {
    const t = text.trim();
    if (!t) return;
    setText("");
    void run({ message: t }, "Yanıt hazırlanıyor");
  }

  async function apply(m: AiMessage, index: number, s: AiSuggestion) {
    const key = `${m.id}:${index}`;
    setApplying(key);
    setError(null);
    try {
      await applyAiSuggestion(project, m.id, index, s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Öneri uygulanamadı.");
    } finally {
      setApplying(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className={`${cardCls} p-5`}>
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-500/15 text-brand-500">
            <SparklesIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Yapay Zekâ Asistanı</h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              Bir işlem seçin veya aşağıya sorunuzu yazın. Asistan proje bilgilerini, hizmet aşamalarını ve evrak
              listesini görür; kişisel verileri (TC no, telefon, adres) görmez.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {QUICK_ACTIONS.map(({ key, label, hint, Icon }) => (
            <button
              key={key}
              type="button"
              disabled={busy !== null}
              onClick={() => void run({ action: key, message: text.trim() || undefined }, label).then(() => setText(""))}
              className={clsx(
                "group flex items-start gap-2.5 rounded-2xl border border-slate-200/80 bg-white/60 p-3 text-left transition",
                "hover:border-brand-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50",
                "disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.05] dark:hover:border-brand-500/40"
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span>
                <span className="block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loadError && <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>}
        {messages.length === 0 && !busy && (
          <p className="px-1 text-sm text-slate-500 dark:text-slate-400">
            Henüz bir konuşma yok. Örneğin "İmar analizi"ne basın ya da "Bu parselde kaç kat yapılabilir?" diye sorun.
          </p>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] rounded-3xl rounded-br-md bg-slate-900 px-4 py-2.5 text-sm text-white dark:bg-white dark:text-slate-900">
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className="mt-1 text-[11px] opacity-60">
                  {m.byName} · {format(new Date(m.at), "d MMM HH:mm", { locale: tr })}
                </p>
              </div>
            </div>
          ) : (
            <div key={m.id} className={`${cardCls} p-5`}>
              <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <SparklesIcon className="h-3.5 w-3.5 text-brand-500" />
                Asistan · {format(new Date(m.at), "d MMM HH:mm", { locale: tr })}
              </div>
              <Markdown text={m.text} />

              {(m.suggestions?.length ?? 0) > 0 && (
                <div className="mt-4 space-y-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Öneriler</p>
                  {m.suggestions!.map((s, i) => {
                    const done = m.appliedSuggestions?.includes(i);
                    const key = `${m.id}:${i}`;
                    return (
                      <div
                        key={key}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/50 p-3 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                            {s.tur === "NOT_EKLE" ? "Not ekle: " : "Aşamayı tamamla: "}
                            {s.baslik}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {s.tur === "ASAMA_TAMAMLA" ? `${s.hizmetAdi} · ${s.asamaAdi}. ` : ""}
                            {s.gerekce}
                          </p>
                          {s.tur === "NOT_EKLE" && (
                            <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600 dark:text-slate-300">
                              “{s.notMetni}”
                            </p>
                          )}
                        </div>
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircleIcon className="h-4 w-4" /> Uygulandı
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={secondaryBtnCls}
                            disabled={applying !== null}
                            onClick={() => void apply(m, i, s)}
                          >
                            {applying === key ? "Uygulanıyor…" : "Uygula"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {(m.sources?.length ?? 0) > 0 && (
                <div className="mt-4 border-t border-slate-200/70 pt-3 dark:border-white/10">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Kaynaklar</p>
                  <ul className="space-y-0.5">
                    {m.sources!.map((s) => (
                      <li key={s.url} className="truncate text-xs">
                        <a href={s.url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
                          {s.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        )}
        {busy && (
          <div className={`${cardCls} flex items-center gap-3 p-4 text-sm text-slate-600 dark:text-slate-300`}>
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
            {busy}… Asistan mevzuatı ve kaynakları inceliyor; bu 1–2 dakika sürebilir.
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="rounded-2xl bg-red-50 px-4 py-2.5 text-sm text-red-700 dark:bg-red-500/15 dark:text-red-300">{error}</p>
      )}

      <form
        className={`${cardCls} flex items-end gap-2 p-3`}
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <label htmlFor="ai-input" className="sr-only">
          Asistana sorun
        </label>
        <textarea
          id="ai-input"
          rows={2}
          value={text}
          maxLength={4000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Sorunuzu yazın (Enter: gönder, Shift+Enter: yeni satır). Bir işlem düğmesine basarsanız buraya yazdığınız not da eklenir."
          className={clsx(inputCls, "mt-0 resize-none")}
        />
        <button type="submit" className={primaryBtnCls} disabled={busy !== null || !text.trim()}>
          <SendIcon className="h-4 w-4" />
          Gönder
        </button>
      </form>
      <p className="px-1 text-xs text-slate-400">
        Asistanın yanıtları ön planlama amaçlıdır; resmî başvurudan önce yetkili bir mimar veya mühendis tarafından
        doğrulanmalıdır. Öneriler siz "Uygula" demeden projeye işlenmez.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Küçük, güvenli Markdown görüntüleyici: başlık, liste, alıntı, tablo, kalın,
// italik, kod ve http(s) bağlantıları. HTML enjekte etmez.
// ---------------------------------------------------------------------------

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\((https?:\/\/[^)\s]+)\)|(?<![\w*])[*_][^*_\n]+[*_](?![\w*]))/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`"))
      out.push(
        <code key={key} className="rounded bg-slate-100 px-1 text-[0.9em] dark:bg-white/10">
          {tok.slice(1, -1)}
        </code>
      );
    else if (tok.startsWith("[")) {
      const label = tok.slice(1, tok.indexOf("]("));
      out.push(
        <a key={key} href={m[2]} target="_blank" rel="noreferrer" className="text-brand-600 underline dark:text-brand-400">
          {label}
        </a>
      );
    } else out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let k = 0;
  while (i < lines.length) {
    const line = lines[i];
    const key = `b${k++}`;
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = /^(#{1,4})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      blocks.push(
        <p
          key={key}
          className={clsx(
            "font-semibold text-slate-900 dark:text-white",
            level <= 2 ? "mt-3 text-base" : "mt-2 text-sm"
          )}
        >
          {inline(h[2], key)}
        </p>
      );
      i++;
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = lines[i].trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...body] = rows;
      blocks.push(
        <div key={key} className="my-2 overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-300 dark:border-white/20">
                {head.map((c, j) => (
                  <th key={j} className="px-2 py-1.5 font-semibold">
                    {inline(c, `${key}h${j}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-b border-slate-200/70 dark:border-white/10">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1.5 align-top">
                      {inline(c, `${key}r${ri}c${j}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^\s*>/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) quote.push(lines[i++].replace(/^\s*>\s?/, ""));
      blocks.push(
        <blockquote
          key={key}
          className="my-2 border-l-2 border-brand-400 pl-3 text-xs text-slate-600 dark:text-slate-300"
        >
          {inline(quote.join(" "), key)}
        </blockquote>
      );
      continue;
    }
    if (/^\s*([-*•]|\d+[.)])\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]/.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*•]|\d+[.)])\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\s*([-*•]|\d+[.)])\s+/, ""));
      }
      const ListTag = ordered ? "ol" : "ul";
      blocks.push(
        <ListTag key={key} className={clsx("my-1.5 space-y-1 pl-5", ordered ? "list-decimal" : "list-disc")}>
          {items.map((it, j) => (
            <li key={j}>{inline(it, `${key}-${j}`)}</li>
          ))}
        </ListTag>
      );
      continue;
    }
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^(#{1,4}\s|\s*>|\s*\||\s*([-*•]|\d+[.)])\s+)/.test(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={key} className="my-1.5">
        {para.map((p, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(p, `${key}-${j}`)}
          </Fragment>
        ))}
      </p>
    );
  }
  return <div className="break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{blocks}</div>;
}
