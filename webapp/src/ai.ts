// AI Asistan (imar mevzuatı) — statik/sunucusuz uygulama olduğundan
// tarayıcıdan doğrudan Google Gemini API'sine (ücretsiz kotalı, CORS destekli)
// çağrı yapılır. Kullanıcı kendi API anahtarını Ayarlar'dan girer; anahtar
// yalnızca tarayıcıda (localStorage) saklanır.
import { useSyncExternalStore } from "react";
import { mevzuatContext } from "./mevzuat";

const KEY_STORAGE = "mimarlik-gemini-key";
const MODEL_STORAGE = "mimarlik-gemini-model";

// Ücretsiz katmanda kullanılabilen modeller. Biri kotayı doldurursa
// kullanıcı Ayarlar'dan başka bir modele geçebilir. "-lite" ve "flash"
// modelleri en yüksek ücretsiz günlük kotaya sahiptir.
export const AI_MODELS: { id: string; label: string }[] = [
  { id: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite (en yüksek ücretsiz kota)" },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash (dengeli)" },
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (daha güçlü)" },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (eski, geniş erişim)" },
];
const DEFAULT_MODEL = "gemini-2.0-flash-lite";

export function getAiModel(): string {
  return localStorage.getItem(MODEL_STORAGE) || DEFAULT_MODEL;
}

export function setAiModel(model: string) {
  if (model) localStorage.setItem(MODEL_STORAGE, model);
  else localStorage.removeItem(MODEL_STORAGE);
  emit();
}

const ENDPOINT = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${getAiModel()}:generateContent?key=${encodeURIComponent(key)}`;

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// ---- Anahtar durumu (React'e yansıtılır) ----

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}

export function getAiKey(): string {
  return localStorage.getItem(KEY_STORAGE) ?? "";
}

export function setAiKey(key: string) {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(KEY_STORAGE, trimmed);
  else localStorage.removeItem(KEY_STORAGE);
  emit();
}

export function useAiConfigured(): boolean {
  return useSyncExternalStore(
    (fn) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    () => !!localStorage.getItem(KEY_STORAGE)
  );
}

// ---- Sistem yönergesi (mevzuat bağlamı ile) ----

function systemInstruction(): string {
  return [
    "Sen Türkiye'de faaliyet gösteren bir mimarlık ofisi için imar mevzuatı asistanısın.",
    "Kullanıcıların sorularını, aşağıdaki Türkiye İmar Kanunu ve ilgili yönetmelik",
    "özetlerinden yararlanarak açık, doğru ve anlaşılır Türkçe ile yanıtla.",
    "Yanıtında hangi kanun veya yönetmeliğe dayandığını belirt (ör. 'İmar Kanunu md. 21',",
    "'Planlı Alanlar İmar Yönetmeliği', 'TBDY 2018').",
    "Kesin sayı, oran, ölçü gerektiren durumlarda kullanıcının belediyesinin/idaresinin",
    "yürürlükteki planı ve yönetmeliğiyle teyit etmesi gerektiğini hatırlat.",
    "Konu imar mevzuatı dışındaysa ya da emin değilsen bunu açıkça belirt.",
    "Bu bir hukuki tavsiye değil, bilgilendirmedir.",
    "Yanıtı düz metin ver; madde gerekiyorsa satır başında '-' kullan,",
    "yıldız (**), # gibi markdown işaretleri kullanma. Kısa ve öz ol.",
    "",
    "=== MEVZUAT BAĞLAMI ===",
    mevzuatContext(),
  ].join("\n");
}

// ---- Soru sor ----

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function askAssistant(history: ChatMessage[]): Promise<string> {
  const key = getAiKey();
  if (!key) {
    throw new Error(
      "AI anahtarı tanımlı değil. Ayarlar > AI Asistan bölümünden Gemini API anahtarınızı girin."
    );
  }
  const body = {
    systemInstruction: { parts: [{ text: systemInstruction() }] },
    contents: history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
  };

  let resp: Response;
  try {
    resp = await fetch(ENDPOINT(key), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Ağ hatası: AI servisine ulaşılamadı.");
  }

  if (!resp.ok) {
    let detail = `${resp.status}`;
    try {
      const err = await resp.json();
      detail = err?.error?.message ?? detail;
    } catch {
      // yoksay
    }
    if (resp.status === 400 || resp.status === 403) {
      throw new Error(
        `AI anahtarı geçersiz veya yetkisiz olabilir. (${detail})`
      );
    }
    if (resp.status === 429) {
      throw new Error(
        `"${getAiModel()}" modelinin ücretsiz kotası doldu. Ayarlar > AI Asistan'dan başka bir model seçin (ör. Flash-Lite) veya bir süre sonra tekrar deneyin.`
      );
    }
    if (resp.status === 404) {
      throw new Error(
        `"${getAiModel()}" modeli bu anahtarla kullanılamıyor. Ayarlar > AI Asistan'dan başka bir model seçin.`
      );
    }
    throw new Error(`AI hatası: ${detail}`);
  }

  const data: any = await resp.json();
  const text: string | undefined =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: any) => p?.text ?? "")
      .join("") ?? undefined;
  if (!text) {
    const blocked = data?.promptFeedback?.blockReason;
    throw new Error(
      blocked
        ? "Yanıt güvenlik filtresine takıldı, soruyu farklı sorun."
        : "AI boş yanıt döndü, tekrar deneyin."
    );
  }
  return text.trim();
}
