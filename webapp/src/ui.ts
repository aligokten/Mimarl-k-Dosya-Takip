// Cam yüzeyli form alanı; odakta marka turuncusu ile çerçevelenir.
export const inputCls =
  "mt-1 w-full rounded-2xl border border-slate-200/80 bg-white/70 px-3.5 py-2.5 text-sm backdrop-blur-md transition placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-500/25";

export const labelCls =
  "block text-sm font-medium text-slate-700 dark:text-slate-200";
export const smallLabelCls =
  "block text-xs font-medium tracking-wide text-slate-500 dark:text-slate-400";

// Birincil eylem: marka turuncusu + yumuşak ışıma
export const primaryBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_6px_20px_-6px_rgba(255,109,41,0.9)] transition hover:bg-brand-400 hover:shadow-[0_8px_26px_-6px_rgba(255,109,41,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50";

export const secondaryBtnCls =
  "inline-flex items-center justify-center rounded-full border border-slate-200/80 bg-white/60 px-3.5 py-1.5 text-xs font-medium text-slate-600 backdrop-blur-md transition hover:border-brand-300 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:text-white";

// Glassmorphism kart: yarı saydam zemin + arka plan bulanıklığı (bkz. index.css)
export const cardCls = "glass rounded-3xl";

// Öne çıkan kart: kenarında ince marka ışığı taşır
export const brandCardCls = "glass glass-brand rounded-3xl";

export const chipCls =
  "inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/60 px-2.5 py-1 text-xs font-medium text-slate-600 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.07] dark:text-slate-300";

export const thCls =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500";

export function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

// Firestore izin hatalarını (ör. ofis erişim durumu askıya alınmış) kullanıcı
// için anlaşılır bir mesaja çevirir; diğer hatalarda ham mesajı gösterir.
export function friendlyFirestoreError(err: unknown, action: string): string {
  const code = (err as { code?: string } | null)?.code;
  if (code === "permission-denied") {
    return `${action}: Bu işlem için yetkiniz yok. Ofis erişim durumunuzda bir sorun olabilir; lütfen yöneticinizle iletişime geçin.`;
  }
  const message = err instanceof Error ? err.message : String(err);
  return `${action}: ${message}`;
}
