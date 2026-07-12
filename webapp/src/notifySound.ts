// Bildirim sesi: harici ses dosyası yerine Web Audio API ile kısa, iki
// tonlu bir "ding" üretilir — böylece ek bir varlık indirmeye/paketlemeye
// gerek kalmaz ve çevrimdışı (Electron) kullanımda da çalışır.
/* eslint-disable @typescript-eslint/no-explicit-any */
let ctx: AudioContext | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as any).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

// Tarayıcıların otomatik ses oynatma kısıtlaması nedeniyle, ses bağlamı
// yalnızca bir kullanıcı etkileşiminden sonra "unlock" edilebilir.
if (typeof window !== "undefined") {
  const unlock = () => {
    const c = ensureContext();
    if (c && c.state === "suspended") void c.resume();
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}

export function playNotificationChime() {
  const c = ensureContext();
  if (!c) return;
  if (c.state === "suspended") {
    void c.resume();
  }
  const now = c.currentTime;
  const notes = [880, 1174.66]; // kısa, iki tonlu bir "ding"
  notes.forEach((freq, i) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.12;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.2, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
    osc.connect(gain).connect(c.destination);
    osc.start(start);
    osc.stop(start + 0.32);
  });
}
