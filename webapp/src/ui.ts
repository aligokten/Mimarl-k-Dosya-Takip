export const inputCls =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500";

export const labelCls = "block text-sm font-medium text-slate-700";
export const smallLabelCls = "block text-xs font-medium text-slate-600";

export const primaryBtnCls =
  "rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800";

export const secondaryBtnCls =
  "rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100";

export const cardCls = "rounded-xl border border-slate-200 bg-white";

export const thCls =
  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-slate-500";

export function str(formData: FormData, key: string): string | undefined {
  const value = formData.get(key);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}
