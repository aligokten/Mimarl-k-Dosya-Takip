export const inputCls =
  "mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200";

export const labelCls = "block text-sm font-medium text-slate-700";
export const smallLabelCls = "block text-xs font-medium text-slate-500";

export const primaryBtnCls =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800";

export const secondaryBtnCls =
  "inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50";

export const cardCls =
  "rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)]";

export const chipCls =
  "inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600";

export const thCls =
  "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400";

export function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
